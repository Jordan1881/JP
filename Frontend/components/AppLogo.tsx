"use client";

import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { APP_NAME } from "@/lib/app";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  href?: string | null;
  height?: number;
  showWordmark?: boolean;
  className?: string;
}

export function AppLogo({
  href = "/",
  height = 32,
  showWordmark = false,
  className,
}: AppLogoProps) {
  const { theme } = useTheme();
  const src = theme === "dark" ? "/logo-dark.svg" : "/logo-light.svg";
  const width = Math.round((height / 46) * 54);

  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <img src={src} alt={APP_NAME} width={width} height={height} />
      {showWordmark ? (
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Job Player
        </span>
      ) : null}
    </div>
  );

  if (href === null) {
    return content;
  }

  return (
    <Link href={href} className="inline-flex transition-opacity hover:opacity-80">
      {content}
    </Link>
  );
}
