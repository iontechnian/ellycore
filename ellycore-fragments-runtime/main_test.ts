import { assertEquals } from "@std/assert";
import { Sandbox } from "./host/sandbox.ts";
import { fromFileUrl, dirname, join } from "@std/path"

Deno.test("test_frag_math", { permissions: { net: true, read: true, run: true } }, async () => {
  const sandbox = new Sandbox({
    pathToScript: join(dirname(fromFileUrl(import.meta.url)), "test_frag_math.ts"),
    memory: 300,
    bindings: {},
    timeLimitSeconds: 10,
  });
  const execution = sandbox.createExecution([2, 3]);
  execution.on("stdout", (data) => {
    console.log(data);
  });
  execution.on("stderr", (data) => {
    console.log(data);
  });
  const result = await execution.run();
  assertEquals(result, 5);
});

Deno.test("test_frag_greeting", { permissions: { net: true, read: true, run: true } }, async () => {
  const sandbox = new Sandbox({
    pathToScript: join(dirname(fromFileUrl(import.meta.url)), "test_frag_greeting.ts"),
    memory: 300,
    bindings: {
      getName: async () => "Elly",
    },
    timeLimitSeconds: 10,
    lib: join(dirname(fromFileUrl(import.meta.url)), "test_lib_greeting.ts"),
  });
  const execution = sandbox.createExecution(["afternoon"]);
  execution.on("stdout", (data) => {
    console.log(data);
  });
  execution.on("stderr", (data) => {
    console.log(data);
  });
  const result = await execution.run();
  assertEquals(result, "Good afternoon, Elly!");
});