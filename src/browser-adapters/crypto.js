export const randomBytes = (length) => ({
  toString: () => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(length)), byte => byte.toString(16).padStart(2, "0")).join(""),
});
export default { randomBytes };
