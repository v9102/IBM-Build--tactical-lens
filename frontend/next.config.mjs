import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Pin the workspace root — a stray lockfile in the home dir otherwise confuses
// Next's root inference (harmless warning, but this makes dev/build deterministic).
/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
};

export default nextConfig;
