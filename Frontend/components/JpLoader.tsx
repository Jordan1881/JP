"use client";

import { useEffect, useId, useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { gsap, registerGsapPlugins } from "@/lib/gsap";
import { cn } from "@/lib/utils";

const LOGO_PATHS = [
  "M14.1177 7.62939e-06V24.7059C14.1177 27.6298 11.7474 30 8.82354 30C5.89968 30 3.52942 27.6297 3.52942 24.7059V22.9787",
  "M8.82353 15.8824H19.8529C23.9951 15.8824 27.3529 12.5245 27.3529 8.38235C27.3529 4.24022 23.9951 0.882355 19.8529 0.882355H13.2353H8.82353",
  "M0 22.9412H7.05882",
] as const;

const SIZE_MAP = {
  sm: 56,
  md: 96,
  lg: 132,
} as const;

interface JpLoaderProps {
  size?: keyof typeof SIZE_MAP;
  label?: string;
  className?: string;
  /** Horizontal layout for compact overlays and pills. */
  inline?: boolean;
}

export function JpLoader({ size = "md", label, className, inline = false }: JpLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const gradientId = useId();
  const isDark = theme === "dark";
  const dim = SIZE_MAP[size];

  useEffect(() => {
    registerGsapPlugins();
    const root = rootRef.current;
    if (!root) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const rings = root.querySelectorAll("[data-orbit]");
    const paths = root.querySelectorAll("[data-logo-path]");
    const glow = root.querySelector("[data-glow]");
    const nodes = root.querySelectorAll("[data-orbit-node]");

    const ctx = gsap.context(() => {
      gsap.from(root, { opacity: 0, scale: 0.92, duration: 0.5, ease: "power2.out" });

      gsap.to(rings[0], {
        rotation: 360,
        duration: 18,
        repeat: -1,
        ease: "none",
        transformOrigin: "48px 48px",
      });
      gsap.to(rings[1], {
        rotation: -360,
        duration: 24,
        repeat: -1,
        ease: "none",
        transformOrigin: "48px 48px",
      });
      gsap.to(rings[2], {
        rotation: 360,
        duration: 30,
        repeat: -1,
        ease: "none",
        transformOrigin: "48px 48px",
      });

      paths.forEach((path, index) => {
        const el = path as SVGPathElement;
        const length = el.getTotalLength();
        gsap.set(el, { strokeDasharray: length, strokeDashoffset: length });
        gsap.to(el, {
          strokeDashoffset: 0,
          duration: 1.6,
          delay: index * 0.12,
          repeat: -1,
          repeatDelay: 1.4,
          ease: "power2.inOut",
        });
      });

      if (glow) {
        gsap.to(glow, {
          scale: 1.2,
          opacity: 0.7,
          duration: 1.8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          transformOrigin: "50% 50%",
        });
      }

      gsap.to(nodes, {
        opacity: 0.25,
        duration: 1.1,
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.18, from: "random" },
        ease: "sine.inOut",
      });
    }, root);

    return () => ctx.revert();
  }, []);

  const ringStart = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.14)";
  const ringEnd = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
  const nodeFill = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.45)";
  const strokeColor = isDark ? "#f0f0f2" : "#0a0a0a";

  const spinner = (
    <div className="relative shrink-0" style={{ width: dim, height: dim }}>
      <div
        data-glow
        className={cn(
          "absolute inset-[22%] rounded-full opacity-40",
          isDark ? "bg-white/15 blur-xl" : "bg-black/10 blur-xl",
        )}
      />
      <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ringStart} />
            <stop offset="100%" stopColor={ringEnd} />
          </linearGradient>
        </defs>

        {[44, 35, 26].map((radius, index) => (
          <circle
            key={radius}
            data-orbit
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={index === 0 ? 1.25 : 1}
            strokeDasharray={index % 2 === 0 ? "3 7" : "2 5"}
            opacity={0.35 + index * 0.15}
          />
        ))}

        {[
          { cx: 48, cy: 4 },
          { cx: 92, cy: 48 },
          { cx: 48, cy: 92 },
          { cx: 4, cy: 48 },
        ].map((pos, index) => (
          <circle
            key={index}
            data-orbit-node
            cx={pos.cx}
            cy={pos.cy}
            r={index < 2 ? 2.5 : 2}
            fill={nodeFill}
          />
        ))}

        <g transform="translate(48, 48) scale(1.15) translate(-14.5, -15.5)">
          {LOGO_PATHS.map((d, index) => (
            <path
              key={index}
              data-logo-path
              d={d}
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.76471"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      </svg>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        inline ? "flex items-center gap-3" : "flex flex-col items-center gap-4",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {spinner}
      {label ? (
        <p
          className={cn(
            "text-sm text-muted-foreground",
            inline ? "whitespace-nowrap" : "motion-safe:animate-pulse",
          )}
        >
          {label}
        </p>
      ) : null}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}
