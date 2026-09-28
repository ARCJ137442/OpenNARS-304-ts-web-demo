const normalize = (value) => String(value ?? "").replaceAll("\\", "/").replace(/\/+/g, "/");
export const sep = "/";
export const delimiter = ":";
export const resolve = (...parts) => "/" + parts.map(normalize).filter(Boolean).join("/").replace(/^\/+/, "");
export const join = (...parts) => normalize(parts.join("/"));
export const dirname = (value) => {
  const path = normalize(value);
  const index = path.lastIndexOf("/");
  return index <= 0 ? "/" : path.slice(0, index);
};
export const basename = (value) => normalize(value).split("/").filter(Boolean).at(-1) ?? "";
export const extname = (value) => {
  const base = basename(value);
  const index = base.lastIndexOf(".");
  return index <= 0 ? "" : base.slice(index);
};
export const isAbsolute = (value) => normalize(value).startsWith("/");
export const relative = (_from, to) => normalize(to).replace(/^\/+/, "");
export const parse = (value) => {
  const dir = dirname(value);
  const base = basename(value);
  const ext = extname(value);
  return { root: "/", dir, base, ext, name: ext ? base.slice(0, -ext.length) : base };
};

export default { sep, delimiter, resolve, join, dirname, basename, extname, isAbsolute, relative, parse };
