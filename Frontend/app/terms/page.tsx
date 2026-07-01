import Link from "next/link";
import { CURRENT_TERMS_VERSION } from "@jp/shared-types";
import { AuthCard } from "@/components/AuthCard";

export default function TermsPage() {
  return (
    <AuthCard
      title={`Terms of Use v${CURRENT_TERMS_VERSION}`}
      subtitle="Effective 2026-07-01"
      footer={
        <Link href="/signup" className="text-foreground underline">
          Back to signup
        </Link>
      }
    >
      <div className="max-h-[60vh] space-y-4 overflow-y-auto text-sm leading-relaxed text-muted-foreground">
        <p>
          By creating an account with JP, you agree to these Terms of Use. JP is a
          job-search tracking tool with optional AI-assisted features.
        </p>
        <p>
          Your data is used solely to provide the service to you. We do not sell your
          data or use it to train AI models. AI-generated content is a draft — you are
          responsible for reviewing it before external use.
        </p>
        <p>
          Archived jobs without a response are deleted after 30 days. Account deletion
          permanently removes your data; residual backups are purged within 30 days.
        </p>
        <p>
          For questions, contact Yarden Biton at jordanstu21@gmail.com.
        </p>
        <p className="text-xs text-foreground/50">
          Full legal text: docs/legal/terms-of-use.md in the repository.
        </p>
      </div>
    </AuthCard>
  );
}
