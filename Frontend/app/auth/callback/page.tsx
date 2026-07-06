"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { JpLoader } from "@/components/JpLoader";
import { configureAmplify } from "@/lib/amplify";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    configureAmplify();

    async function finish() {
      try {
        await getCurrentUser();
        await fetchAuthSession();
        router.replace("/");
      } catch {
        setError("Sign-in failed. Redirecting to login…");
        setTimeout(() => router.replace("/login"), 2500);
      }
    }

    void finish();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      {error ? (
        <p className="text-sm text-red-200">{error}</p>
      ) : (
        <JpLoader size="md" label="Signing you in…" />
      )}
    </div>
  );
}
