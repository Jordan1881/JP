import { TERMINAL_STAGES } from "@jp/shared-types";
import { getGreeting } from "@/lib/app";

export default function HomePage() {
  return (
    <main className="page">
      <h1>{getGreeting()}</h1>
      <p className="subtitle">
        Your applications tracker — scaffold ready for issue #9.
      </p>
      <p className="meta">
        Terminal stages: {TERMINAL_STAGES.join(", ")}
      </p>
    </main>
  );
}
