import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  base: process.env.NODE_ENV === "development" ? "/" : "/opennars-304-ts-lab",
  build: { format: "file" },
  server: { host: "127.0.0.1" },
});
