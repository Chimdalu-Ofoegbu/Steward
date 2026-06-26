// Pure formatting helpers — safe on client and server.

export function nfCspr(n: number, dp = 2): string {
  if (!isFinite(n)) return "0";
  return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function nfInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function trunc(s: string | null | undefined, head = 6, tail = 6): string {
  if (!s) return "";
  return s.length > head + tail + 1 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s;
}

export function relTime(unixSec: number): string {
  const diffMin = Math.max(0, Math.floor((Date.now() / 1000 - unixSec) / 60));
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function absTime(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function confPct(c: number): string {
  return `${Math.round(c * 100)}%`;
}
