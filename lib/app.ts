export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!err) return fallback;
  const e = err as { data?: { error?: string } | null; message?: string };
  if (e.data && typeof e.data.error === "string") return e.data.error;
  if (typeof e.message === "string" && e.message) return e.message;
  return fallback;
}

export function errorStatus(err: unknown): number | undefined {
  const e = err as { status?: number } | null;
  return e?.status;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function relativeDue(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Due now";
  const h = Math.round(diff / 3600000);
  if (h < 24) return `Due in ${h}h`;
  return `Due in ${Math.round(h / 24)}d`;
}

export const SUBJECT_COLORS = ["#5b4be0", "#0f9488", "#9333ea", "#d97706", "#0284c7", "#db2777", "#4d7c0f"];
