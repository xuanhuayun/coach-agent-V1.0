export type ToastType = "success" | "error";

export function toastUrl(path: string, type: ToastType, msg: string) {
  const u = new URL(path, "http://local");
  u.searchParams.set("toast", type);
  u.searchParams.set("msg", msg);
  // Return path+query (no origin)
  return u.pathname + (u.search ? u.search : "");
}

