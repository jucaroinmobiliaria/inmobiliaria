export type ToastItem = { id: number; tone: "success" | "error" | "info"; text: string };
type Listener = (items: ToastItem[]) => void;
let items: ToastItem[] = [];
let id = 0;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l(items));

function push(tone: ToastItem["tone"], text: string, ms = 4200) {
  const t = { id: ++id, tone, text };
  items = [...items, t].slice(-4);
  emit();
  setTimeout(() => dismiss(t.id), ms);
}
export function dismiss(i: number) { items = items.filter((t) => t.id !== i); emit(); }
export function subscribe(l: Listener) { listeners.add(l); l(items); return () => { listeners.delete(l); }; }

export const toast = {
  success: (t: string) => push("success", t),
  error: (t: string) => push("error", t, 6000),
  info: (t: string) => push("info", t),
};
