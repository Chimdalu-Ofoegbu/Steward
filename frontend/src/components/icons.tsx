// Inline stroke icons matching the design handoff (support.js `ic()` paths).
import * as React from "react";

type P = { size?: number; className?: string; strokeWidth?: number };

function Svg({ size = 16, className, strokeWidth = 2, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const ShieldCheck = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5c0 4.4-2.9 7.7-7 9-4.1-1.3-7-4.6-7-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </Svg>
);
export const Grid = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </Svg>
);
export const Activity = (p: P) => (
  <Svg {...p}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </Svg>
);
export const Wallet = (p: P) => (
  <Svg {...p}>
    <path d="M3 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12" />
    <path d="M16 13h.01" />
  </Svg>
);
export const Verify = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5c0 4.4-2.9 7.7-7 9-4.1-1.3-7-4.6-7-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </Svg>
);
export const Info = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h1v4h1" />
  </Svg>
);
export const Copy = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </Svg>
);
export const Ext = (p: P) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
  </Svg>
);
export const Arrow = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const Check = (p: P) => (
  <Svg {...p}>
    <path d="M20 6L9 17l-5-5" />
  </Svg>
);
export const X = (p: P) => (
  <Svg {...p}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </Svg>
);
export const Menu = (p: P) => (
  <Svg {...p}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </Svg>
);
export const Sun = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
  </Svg>
);
export const Moon = (p: P) => (
  <Svg {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Svg>
);
export const Bot = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="8" width="16" height="12" rx="2" />
    <path d="M12 8V4M8 4h8M9 14h.01M15 14h.01" />
  </Svg>
);
export const Coins = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="9" r="6" />
    <path d="M21 12a6 6 0 0 1-9 5.2M15 7a6 6 0 0 1 0 10" />
  </Svg>
);
export const Trend = (p: P) => (
  <Svg {...p}>
    <path d="M3 17l6-6 4 4 7-7M14 8h6v6" />
  </Svg>
);
export const Layers = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 16.5l9 5 9-5" />
  </Svg>
);

// action-kind glyphs
export const kindIcon: Record<string, (p: P) => React.JSX.Element> = {
  delegate: (p) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12l7-7 7 7" />
    </Svg>
  ),
  undelegate: (p) => (
    <Svg {...p}>
      <path d="M12 19V5M5 12l7 7 7-7" />
    </Svg>
  ),
  redelegate: (p) => (
    <Svg {...p}>
      <path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2" />
      <path d="M18 4v5h-5M6 20v-5h5" />
    </Svg>
  ),
  rebalance: (p) => (
    <Svg {...p}>
      <path d="M3 7h13M11 3l5 4-5 4M21 17H8M13 13l-5 4 5 4" />
    </Svg>
  ),
  hold: (p) => (
    <Svg {...p}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </Svg>
  ),
};

export function kindTint(kind: string): string {
  switch (kind) {
    case "delegate":
      return "var(--green)";
    case "undelegate":
      return "var(--amber)";
    case "redelegate":
    case "rebalance":
      return "var(--accent)";
    default:
      return "var(--ink-2)";
  }
}
