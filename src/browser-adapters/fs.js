const unavailable = (name) => {
  throw new Error(`${name} is unavailable in the browser host`);
};

export const existsSync = () => true;
export const readFileSync = () => globalThis.__OPENNARS_DEFAULT_CONFIG__ ?? "";
export const closeSync = () => undefined;
export const fsyncSync = () => undefined;
export const mkdirSync = () => undefined;
export const rmdirSync = () => unavailable("rmdirSync");
export const unlinkSync = () => unavailable("unlinkSync");
export const openSync = () => unavailable("openSync");
export const writeSync = () => unavailable("writeSync");
export const readSync = () => unavailable("readSync");
export const truncateSync = () => unavailable("truncateSync");
export const fstatSync = () => ({ size: 0 });
export const statSync = () => ({ isDirectory: () => false, isFile: () => false, size: 0 });

export default {
  existsSync,
  readFileSync,
  closeSync,
  fsyncSync,
  mkdirSync,
  rmdirSync,
  unlinkSync,
  openSync,
  writeSync,
  readSync,
  truncateSync,
  fstatSync,
  statSync,
};
