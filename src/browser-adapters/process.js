const processAdapter = globalThis.process ?? {
  versions: { node: "browser" },
  release: { name: "browser" },
  env: {},
  platform: "browser",
  cwd: () => "/",
  on: () => undefined,
  off: () => undefined,
  once: () => undefined,
  stdout: { write: () => true },
  stderr: { write: () => true },
};
globalThis.process ??= processAdapter;

export const versions = processAdapter.versions;
export const release = processAdapter.release;
export const env = processAdapter.env;
export const platform = processAdapter.platform;
export const cwd = processAdapter.cwd;
export const on = processAdapter.on;
export const off = processAdapter.off;
export const once = processAdapter.once;
export const stdout = processAdapter.stdout;
export const stderr = processAdapter.stderr;
export default processAdapter;
