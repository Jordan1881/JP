"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AgentChatMessage } from "@jp/shared-types";
import { profileInterviewStep } from "@/lib/profile-api";
import { AuthButton, AuthCard, AuthError, AuthField, authInputClassName } from "@/components/AuthCard";

export default function ProfileInterviewPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) {
      setStarted(true);
      void handleStep();
    }
  }, [started]);

  async function handleStep(userAnswer?: string) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await profileInterviewStep({
        messages,
        completedTopics,
        answer: userAnswer,
      });
      setMessages(result.messages);
      setCompletedTopics(result.completedTopics);
      if (result.complete) {
        router.replace("/profile");
        return;
      }
      setAnswer("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Interview failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await handleStep(answer);
  }

  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");

  return (
    <AuthCard
      title="Profile interview"
      subtitle="One-time adaptive interview to bootstrap your career profile."
      footer={<Link href="/profile" className="text-foreground underline">Skip to profile</Link>}
    >
      <AuthError message={error} />
      <div className="max-h-72 space-y-3 overflow-y-auto rounded-md border border-border bg-secondary/20 p-4 text-sm">
        {messages.map((message, index) => (
          <p key={index} className={message.role === "assistant" ? "text-foreground" : "text-muted-foreground"}>
            <strong>{message.role === "assistant" ? "JP" : "You"}:</strong> {message.content}
          </p>
        ))}
        {!lastAssistant && !submitting ? (
          <p className="text-muted-foreground">Starting interview…</p>
        ) : null}
      </div>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <AuthField label="Your answer">
          <textarea
            className={authInputClassName}
            rows={4}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            required
          />
        </AuthField>
        <AuthButton disabled={submitting}>{submitting ? "Thinking…" : "Continue"}</AuthButton>
      </form>
    </AuthCard>
  );
}
