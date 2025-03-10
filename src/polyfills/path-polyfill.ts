// Simple polyfill for node:path
export function resolve(...parts: string[]): string {
  return parts.join("/").replace(/\/\//g, "/");
}

export function join(...parts: string[]): string {
  return parts.join("/").replace(/\/\//g, "/");
}

export function dirname(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

export function basename(path: string, ext?: string): string {
  const base = path.split("/").pop() || "";
  if (ext && base.endsWith(ext)) {
    return base.slice(0, -ext.length);
  }
  return base;
}

export default {
  resolve,
  join,
  dirname,
  basename,
};
