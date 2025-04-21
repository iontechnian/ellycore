// deno-lint-ignore-file no-explicit-any
import { platform } from "node:os";

let ID: string | undefined;
let PORT: number | undefined;
let SCRIPT: string | undefined;
let LIB: string | undefined;
Deno.args.forEach((arg) => {
  if (arg.startsWith("--id=")) {
    const id = arg.split("=")[1];
    if (id) {
      ID = id;
    }
  }
  if (arg.startsWith("--port=")) {
    const port = parseInt(arg.split("=")[1]);
    if (!isNaN(port)) {
      PORT = port;
    }
  }
  if (arg.startsWith("--script=")) {
    const script = arg.split("=")[1];
    if (script) {
      SCRIPT = script;
    }
  }
  if (arg.startsWith("--lib=")) {
    const lib = arg.split("=")[1];
    if (lib) {
      LIB = lib;
    }
  }
});

if (!ID || !PORT || !SCRIPT) {
  console.error(
    "Missing required arguments: --id, --port and --script are required",
  );
  Deno.exit(1);
}

const connection = await Deno.connect({ port: PORT });

const reader = connection.readable.getReader();
const writer = connection.writable.getWriter();

declare global {
  /** Write to host, without waiting for response */
  function __write(method: string, args?: any[]): void;
  /** Request from host, wait for response */
  function __request<T = any>(method: string, args?: any[]): Promise<T>;
  // function log(message: string): void;
  // function error(message: string): void;
}

let requestId = 0;
const requestResolvers: Record<number, (value: any) => void> = {};

globalThis.__write = (method: string, args: any[] = []) => {
  writer.write(new TextEncoder().encode(JSON.stringify({ method, args })));
};

globalThis.__request = (method: string, args: any[] = []) => {
  return new Promise((resolve) => {
    requestResolvers[requestId] = resolve;
    writer.write(
      new TextEncoder().encode(
        JSON.stringify({ requestId: requestId++, method, args }),
      ),
    );
  });
};

if (LIB) {
  let loadingLib = true;
  import(platform() === "win32" ? `file://${LIB}` : LIB).then(() => {
    loadingLib = false;
  });
  while (loadingLib) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

__write("__ready", [ID]);

while (true) {
  const { done, value } = await reader.read();
  if (done) {
    break;
  }
  const message = JSON.parse(new TextDecoder().decode(value));
  // Response
  if (message.requestId !== undefined) {
    requestResolvers[message.requestId](message.response);
    delete requestResolvers[message.requestId];
  } else {
    if (message.method === "__run") {
      const args = message.args;
      import(platform() === "win32" ? `file://${SCRIPT}` : SCRIPT).then(
        (module) => {
          const call = module.default(...args);
          if (call instanceof Promise) {
            call.then((response) => {
              __write("__return", [ID, response]);
            });
          } else {
            __write("__return", [ID, call]);
          }
        },
      );
    }
    if (message.method === "__kys") {
      connection.close();
      Deno.exit(0);
    }
  }
}
