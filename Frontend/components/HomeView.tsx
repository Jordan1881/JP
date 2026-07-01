"use client";

import { useEffect, useRef } from "react";
import type { Job } from "@jp/shared-types";
import { gsap, registerGsapPlugins } from "@/lib/gsap";
import { AddJobForm } from "@/components/AddJobForm";
import { ApplicationsTable } from "@/components/ApplicationsTable";
import { HeroVisual } from "@/components/HeroVisual";
import { NavUserMenu } from "@/components/NavUserMenu";
import { useAuth } from "@/components/AuthProvider";
import { authSignOut, isAuthConfigured } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HomeViewProps {
  jobs: Job[];
}

const FEATURES = [
  {
    title: "Pipeline tracking",
    description: "Every stage from applied to offer in one view.",
    icon: (
      <path
        d="M4 14h4v6H4zM10 8h4v12h-4zM16 4h4v16h-4z"
        fill="currentColor"
      />
    ),
  },
  {
    title: "Single dashboard",
    description: "All applications searchable in a clean table.",
    icon: (
      <path
        d="M3 5a2 2 0 012-2h14a2 2 0 012 2v2H3V5zm0 4h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        fill="currentColor"
      />
    ),
  },
  {
    title: "Always current",
    description: "Update stages and notes as your search evolves.",
    icon: (
      <path
        d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5v5l4 2-.75 1.23-4.75-2.38V7H13z"
        fill="currentColor"
      />
    ),
  },
  {
    title: "Link everything",
    description: "Attach posting URLs and job numbers per role.",
    icon: (
      <path
        d="M10.59 13.41a2 2 0 010-2.83l3.54-3.54a2 2 0 112.83 2.83l-1.06 1.06-1.41-1.41 1.06-1.06-1.41-1.41-2.12 2.12a1 1 0 001.41 1.41zm2.83-2.83a2 2 0 010 2.83l-3.54 3.54a2 2 0 11-2.83-2.83l1.06-1.06 1.41 1.41-1.06 1.06 1.41 1.41 2.12-2.12a1 1 0 00-1.41-1.41z"
        fill="currentColor"
      />
    ),
  },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function HomeView({ jobs }: HomeViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { account } = useAuth();

  async function handleSignOut() {
    await authSignOut();
    router.push("/login");
  }

  useEffect(() => {
    registerGsapPlugins();
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-animate='nav']", {
        y: -16,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
      });

      gsap.from("[data-animate='hero']", {
        y: 36,
        opacity: 0,
        duration: 0.85,
        stagger: 0.12,
        delay: 0.15,
        ease: "power3.out",
      });

      gsap.from("[data-animate='feature']", {
        y: 28,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        delay: 0.55,
        ease: "power3.out",
      });

      gsap.utils.toArray<HTMLElement>("[data-scroll-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  const companyCount = new Set(jobs.map((j) => j.company)).size;

  return (
    <div ref={rootRef} className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 grid-dots opacity-60" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[480px] bg-gradient-to-b from-white/[0.03] to-transparent" />

      <nav
        data-animate="nav"
        className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground">
              <span className="text-xs font-bold text-background">JP</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Job Player
            </span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            {[
              { label: "Applications", id: "applications" },
              { label: "Add job", id: "add-job" },
            ].map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollToSection(link.id)}
                className="text-sm font-normal text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => scrollToSection("add-job")}
              className="rounded-md bg-primary px-4 py-2 text-xs font-semibold tracking-widest text-primary-foreground uppercase transition-colors hover:bg-white"
            >
              Add application
            </button>
            {isAuthConfigured() ? (
              <NavUserMenu
                userName={account?.name}
                onSignOut={() => void handleSignOut()}
              />
            ) : (
              <Link
                href="/login"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28 lg:py-32">
          <div>
            <p
              data-animate="hero"
              className="mb-5 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase"
            >
              Your job search command center
            </p>
            <h1
              data-animate="hero"
              className="text-4xl leading-[1.08] font-semibold tracking-tight text-foreground md:text-5xl lg:text-[3.25rem]"
            >
              Track every application across your search
            </h1>
            <p
              data-animate="hero"
              className="mt-6 max-w-lg text-base leading-relaxed font-normal text-muted-foreground md:text-lg"
            >
              A focused dashboard for managing roles, stages, and links — built
              for clarity when the pipeline gets busy.
            </p>
            <div data-animate="hero" className="mt-10 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => scrollToSection("add-job")}
                className="rounded-md bg-primary px-6 py-3 text-xs font-semibold tracking-widest text-primary-foreground uppercase transition-colors hover:bg-white"
              >
                Add application
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("applications")}
                className="rounded-md border border-border px-6 py-3 text-xs font-semibold tracking-widest text-foreground uppercase transition-colors hover:bg-secondary"
              >
                View pipeline
              </button>
            </div>
            <div
              data-animate="hero"
              className="mt-10 flex flex-wrap gap-8 text-sm text-muted-foreground"
            >
              <span>
                <strong className="font-semibold text-foreground">
                  {jobs.length}
                </strong>{" "}
                active
              </span>
              <span>
                <strong className="font-semibold text-foreground">
                  {companyCount}
                </strong>{" "}
                companies
              </span>
              <span className="text-foreground/50">Dark · Minimal · Fast</span>
            </div>
          </div>

          <div data-animate="hero" className="hidden md:block">
            <HeroVisual />
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              data-animate="feature"
              className="group rounded-xl border border-border bg-card/60 p-5 transition-colors hover:border-white/15 hover:bg-card"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-white/6 text-foreground/70 transition-colors group-hover:bg-white/10 group-hover:text-foreground">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  {feature.icon}
                </svg>
              </div>
              <h3 className="text-sm font-medium text-foreground">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed font-normal text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <main className="relative mx-auto max-w-6xl space-y-8 px-6 py-16 md:py-20">
        <div data-scroll-reveal id="add-job">
          <AddJobForm />
        </div>
        <div data-scroll-reveal id="applications">
          <ApplicationsTable jobs={jobs} />
        </div>
      </main>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-xs text-muted-foreground md:flex-row">
          <span className="font-semibold tracking-tight text-foreground">
            JP Job Player
          </span>
          <span className="font-normal">
            Geist Mono · Grayscale · Built for your pipeline
          </span>
        </div>
      </footer>
    </div>
  );
}
