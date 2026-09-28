const unavailable = () => {
  throw new Error("child processes are unavailable in the browser host");
};
export const execFileSync = unavailable;
export const spawn = unavailable;
export const exec = unavailable;
export default { execFileSync, spawn, exec };
