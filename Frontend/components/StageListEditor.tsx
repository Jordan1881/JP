"use client";

import { DragEvent, useCallback, useRef, useState } from "react";
import { TERMINAL_STAGES } from "@jp/shared-types";
import { authInputClassName } from "@/components/AuthCard";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface StageListEditorProps {
  stageList: string[];
  onStageListChange: (stages: string[]) => void;
  newStage: string;
  onNewStageChange: (value: string) => void;
  onAddStage: () => void;
  disabled?: boolean;
}

function reorderList<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <circle cx="5" cy="4" r="1.25" fill="currentColor" />
      <circle cx="11" cy="4" r="1.25" fill="currentColor" />
      <circle cx="5" cy="8" r="1.25" fill="currentColor" />
      <circle cx="11" cy="8" r="1.25" fill="currentColor" />
      <circle cx="5" cy="12" r="1.25" fill="currentColor" />
      <circle cx="11" cy="12" r="1.25" fill="currentColor" />
    </svg>
  );
}

export function StageListEditor({
  stageList,
  onStageListChange,
  newStage,
  onNewStageChange,
  onAddStage,
  disabled = false,
}: StageListEditorProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const animateReorder = useCallback(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    gsap.fromTo(
      list.querySelectorAll("[data-stage-item]"),
      { y: 6, opacity: 0.7 },
      {
        y: 0,
        opacity: 1,
        duration: 0.22,
        stagger: 0.04,
        ease: "power2.out",
        clearProps: "transform,opacity",
      },
    );
  }, []);

  function handleDragStart(index: number, event: DragEvent<HTMLButtonElement>) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    setDragIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
    const row = event.currentTarget.closest("[data-stage-item]");
    if (row instanceof HTMLElement) {
      gsap.to(row, {
        scale: 1.02,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        duration: 0.15,
      });
    }
  }

  function handleDragEnd(event: DragEvent<HTMLButtonElement>) {
    const row = event.currentTarget.closest("[data-stage-item]");
    if (row instanceof HTMLElement) {
      gsap.to(row, {
        scale: 1,
        boxShadow: "none",
        duration: 0.15,
        clearProps: "boxShadow",
      });
    }
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleDragOver(index: number, event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      return;
    }
    event.dataTransfer.dropEffect = "move";
    setDropIndex(index);
  }

  function handleDrop(index: number, event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    onStageListChange(reorderList(stageList, dragIndex, index));
    setDragIndex(null);
    setDropIndex(null);
    requestAnimationFrame(animateReorder);
  }

  return (
    <div className="space-y-4">
      <ul ref={listRef} className="space-y-2">
        {stageList.map((stage, index) => (
          <li
            key={`${stage}-${index}`}
            data-stage-item
            data-testid="stage-list-item"
            onDragOver={(event) => handleDragOver(index, event)}
            onDrop={(event) => handleDrop(index, event)}
            className={cn(
              "flex items-center gap-2 rounded-md border border-transparent transition-colors",
              dragIndex === index && "opacity-50",
              dropIndex === index &&
                dragIndex !== null &&
                dragIndex !== index &&
                "border-primary/40 bg-primary/5",
            )}
          >
            <button
              type="button"
              data-testid="stage-drag-handle"
              draggable={!disabled}
              disabled={disabled}
              aria-label={`Drag to reorder ${stage || "stage"}`}
              onDragStart={(event) => handleDragStart(index, event)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex h-10 w-9 shrink-0 cursor-grab items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              <GripIcon />
            </button>
            <input
              className={cn(authInputClassName, "min-w-0 flex-1")}
              value={stage}
              disabled={disabled}
              onChange={(event) => {
                const next = [...stageList];
                next[index] = event.target.value;
                onStageListChange(next);
              }}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onStageListChange(stageList.filter((_, itemIndex) => itemIndex !== index))
              }
              className="shrink-0 rounded-md border border-border px-3 py-2.5 text-xs disabled:opacity-50"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          className={authInputClassName}
          placeholder="New stage name"
          value={newStage}
          disabled={disabled}
          onChange={(event) => onNewStageChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAddStage();
            }
          }}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={onAddStage}
          className="rounded-md border border-border px-3 text-xs uppercase tracking-widest disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div className="rounded-md border border-dashed border-border px-3 py-3">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          Fixed terminal stages
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {TERMINAL_STAGES.map((stage) => (
            <li
              key={stage}
              className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground"
            >
              {stage}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
