"use client";

import { useEffect, useRef } from "react";
import { gsap, registerGsapPlugins } from "@/lib/gsap";

export function HeroVisual() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGsapPlugins();
    const root = rootRef.current;
    if (!root) return;

    const rings = root.querySelectorAll("[data-ring]");
    const nodes = root.querySelectorAll("[data-node]");

    const ctx = gsap.context(() => {
      gsap.to(rings, {
        rotation: 360,
        duration: 48,
        repeat: -1,
        ease: "none",
        stagger: 0.4,
      });

      gsap.to(nodes, {
        y: -8,
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: { each: 0.3, from: "random" },
      });

      gsap.from(root, {
        opacity: 0,
        scale: 0.92,
        duration: 1.2,
        delay: 0.4,
        ease: "power3.out",
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center md:max-w-lg"
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full bg-white/[0.03] blur-3xl" />

      <svg viewBox="0 0 400 400" className="h-full w-full">
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
          </linearGradient>
        </defs>

        {[160, 130, 100, 70].map((r, i) => (
          <g
            key={r}
            data-ring
            style={{ transformOrigin: "200px 200px" }}
          >
            <circle
              cx="200"
              cy="200"
              r={r}
              fill="none"
              stroke="url(#ring-grad)"
              strokeWidth={i === 0 ? 1.5 : 1}
              strokeDasharray={i % 2 === 0 ? "4 8" : "2 6"}
              opacity={0.35 + i * 0.12}
            />
          </g>
        ))}

        {[
          { cx: 200, cy: 72 },
          { cx: 328, cy: 200 },
          { cx: 200, cy: 328 },
          { cx: 72, cy: 200 },
          { cx: 260, cy: 120 },
          { cx: 140, cy: 280 },
        ].map((pos, i) => (
          <circle
            key={i}
            data-node
            cx={pos.cx}
            cy={pos.cy}
            r={i < 4 ? 4 : 3}
            fill={i < 4 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)"}
          />
        ))}

        <rect
          x="168"
          y="168"
          width="64"
          height="64"
          rx="12"
          fill="#141414"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
        />
        <image
          href="/logo-light.svg"
          x="181"
          y="180"
          width="38"
          height="40"
        />
      </svg>
    </div>
  );
}
