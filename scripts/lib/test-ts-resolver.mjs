import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Astro resolves extensionless TypeScript imports. Node's test runner does not, so focused
// tests register this loader before importing page modules. `module.register()` supports the
// repository's full Node >=22.12 range.
export async function resolve(specifier, context, nextResolve) {
  if (context.parentURL?.startsWith("file:") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
    const url = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
