export const fileURLToPath = (value) => typeof value === "string" ? value : value?.pathname ?? "/";
export const pathToFileURL = (value) => new URL(String(value), "file:///");
