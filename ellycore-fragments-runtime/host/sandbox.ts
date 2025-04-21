// deno-lint-ignore-file no-explicit-any
import { EventEmitter } from "node:events";
import { v4 as uuid } from "uuid";
import { BehaviorSubject } from "rxjs";
import { fromFileUrl, dirname, join } from "@std/path";

export interface SandboxOptions {
    pathToScript: string;
    memory: number;
    bindings: Record<string, (...args: any[]) => Promise<any>>;
    timeLimitSeconds: number;
    lib?: string;
}

interface EventEmitterEvents {
    [event: string]: any[];
}
abstract class EventEmitterType<T extends EventEmitterEvents> extends EventEmitter {
    protected constructor() {
        super();
    }
    override addListener<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this;
    override addListener(event: symbol, listener: (...args: any[]) => void): this;
    override addListener(event: string | symbol, listener: (...args: any[]) => void) {
        return super.addListener(event, listener);
    }
    override on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this;
    override on(event: symbol, listener: (...args: any[]) => void): this;
    override on(event: string | symbol, listener: (...args: any[]) => void) {
        return super.on(event, listener);
    }
}

export class Execution extends EventEmitterType<{ stdout: string[], stderr: string[], exit: [number], status: ["loading" | "ready" | "running" | "finished" | "failed"] }> {
    readonly id: string = uuid();
    private readonly listener: Deno.TcpListener;
    private connection!: Deno.TcpConn;
    private reader!: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>;
    private writer!: WritableStreamDefaultWriter<Uint8Array<ArrayBufferLike>>;
    status: "loading" | "ready" | "running" | "finished" | "failed" = "loading";
    status$ = new BehaviorSubject<"loading" | "ready" | "running" | "finished" | "failed">("loading");
    cleanup$ = new BehaviorSubject<{ listener: boolean, stdout: boolean, stderr: boolean, child: boolean }>({ listener: false, stdout: false, stderr: false, child: false });
    private readonly child: Deno.ChildProcess;
    private returnValue: any | undefined;
    private stdoutReader!: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>;
    private stderrReader!: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>;

    constructor(
        private readonly memory: number,
        private readonly pathToScript: string,
        private readonly bindings: Record<string, (...args: any[]) => Promise<any>>,
        private readonly args: any[],
        private readonly lib: string | undefined,
    ) {
        super();

        this.status$.subscribe((status) => {
            this.status = status;
            this.emit("status", status);
        });

        this.listener = Deno.listen({ port: 0 });
        this.setupListener();

        const command = new Deno.Command(Deno.execPath(), {
            args: [
                "run",
                `--v8-flags=--max_old_space_size=${this.memory}`,
                `--allow-read=${this.pathToScript}`,    
                ...(this.lib ? [`--allow-read=${this.lib}`] : []),
                `--allow-net=127.0.0.1:${this.listener.addr.port}`,
                `${join(dirname(fromFileUrl(import.meta.url)), "..", "client", "client.ts")}`,
                `--id=${this.id}`,
                `--port=${this.listener.addr.port}`,
                `--script=${this.pathToScript}`,
                ...(this.lib ? [`--lib=${this.lib}`] : []),
            ],
            stdout: "piped",
            stderr: "piped",
        });
        this.child = command.spawn();
        this.child.status.then((status) => {
            if (status.success) {
                this.status$.next("finished");
            } else {
                this.status$.next("failed");
            }
            this.cleanup$.next({ ...this.cleanup$.value, child: true });
        });
        this.readStdout();
        this.readStderr();
    }

    private async readStdout() {
        this.stdoutReader = this.child.stdout.getReader();
        while (true) {
            const { done, value } = await this.stdoutReader.read();
            if (done) {
                break;
            }
            this.emit("stdout", new TextDecoder().decode(value));
        }
        this.stdoutReader.releaseLock();
        await this.child.stdout.cancel();
        this.cleanup$.next({ ...this.cleanup$.value, stdout: true });
    }
    private async readStderr() {
        this.stderrReader = this.child.stderr.getReader();
        while (true) {
            const { done, value } = await this.stderrReader.read();
            if (done) {
                break;
            }
            this.emit("stderr", new TextDecoder().decode(value));
        }
        this.stderrReader.releaseLock();
        await this.child.stderr.cancel();
        this.cleanup$.next({ ...this.cleanup$.value, stderr: true });
    }

    private async handleConnection(conn: Deno.TcpConn) {
        this.reader = conn.readable.getReader();
        this.writer = conn.writable.getWriter();

        while (true) {
            try {
                const { done, value } = await this.reader.read();
                if (done) {
                    break;
                }
                const message = JSON.parse(new TextDecoder().decode(value));
                // Request expecting a response
                if (message.requestId !== undefined) {
                    if (message.method) {
                        const binding = this.bindings[message.method];
                        if (binding) {
                            const response = await binding(...message.args);
                            this.writer.write(new TextEncoder().encode(JSON.stringify({ requestId: message.requestId, response })));
                        }
                    }
                } else {
                    if (message.method === "__ready") {
                        this.status$.next("ready");
                    }
                    if (message.method === "__return") {
                        this.returnValue = message.args[1];
                        this.writer.write(new TextEncoder().encode(JSON.stringify({ method: "__kys" })));
                        this.status$.next("finished");
                    }
                }
            } catch (error) {
                if (error instanceof Deno.errors.ConnectionReset) {
                    break;
                }
            }
        }
        this.listener.close();
        this.cleanup$.next({ ...this.cleanup$.value, listener: true });
    }

    private async setupListener() {
        for await (const conn of this.listener) {
            if (!this.connection) {
                this.connection = conn;
                this.handleConnection(conn);
            }
        }
    }

    run() {
        return new Promise<any | undefined>((resolve, reject) => {
            if (!["loading", "ready"].includes(this.status)) {
                reject(new Error("Execution already running or finished"));
            }
            const subscription = this.status$.subscribe((status) => {
                if (status === "ready") {
                    this.writer.write(new TextEncoder().encode(JSON.stringify({ method: "__run", args: this.args })));
                    this.status$.next("running");
                }
                if (status === "finished") {
                    subscription.unsubscribe();
                    this.cleanup$.subscribe((cleanup) => {
                        if (cleanup.listener && cleanup.stdout && cleanup.stderr && cleanup.child) {
                            resolve(this.returnValue);
                        }
                    });
                }
                if (status === "failed") {
                    subscription.unsubscribe();
                    this.cleanup$.subscribe((cleanup) => {
                        if (cleanup.listener && cleanup.stdout && cleanup.stderr && cleanup.child) {
                            reject(new Error("Execution failed"));
                        }
                    });
                }
            });
        });
    }
}

export class Sandbox {
    private readonly pathToScript: string;
    private readonly memory: number;
    private readonly bindings: Record<string, (...args: any[]) => Promise<any>>;
    private readonly timeLimitSeconds: number;
    private readonly lib: string | undefined;
    private readonly executions: Record<string, Execution> = {};

    constructor(options: SandboxOptions) {
        this.pathToScript = options.pathToScript;
        this.memory = options.memory || 100;
        this.bindings = options.bindings;
        this.timeLimitSeconds = options.timeLimitSeconds || 60;
        this.lib = options.lib;
    }

    createExecution(args: any[]) {
        const execution = new Execution(this.memory, this.pathToScript, this.bindings, args, this.lib);
        this.executions[execution.id] = execution;
        return execution;
    }
}


