"use client";
import * as React from "react";

// Hover-to-scramble text, ported from the Claude Design handoff (support.js initScramble).
const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ#%&/()=+*<>01";

export function ScrambleText({
  text,
  className,
  style,
  dur = 380,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  dur?: number;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const raf = React.useRef<number | null>(null);

  const run = React.useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const final = text;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const rev = Math.floor(p * final.length);
      let out = "";
      for (let i = 0; i < final.length; i++) {
        out += i < rev || final[i] === " " ? final[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      node.textContent = out;
      if (p < 1) raf.current = requestAnimationFrame(step);
      else node.textContent = final;
    };
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);
  }, [text, dur]);

  React.useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);

  return (
    <span ref={ref} className={className} style={style} onMouseEnter={run}>
      {text}
    </span>
  );
}
