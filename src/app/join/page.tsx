import { AppShell } from "@/components/layout/AppShell";
import { JoinByCodeForm } from "@/components/match/JoinByCodeForm";

export default function JoinPage() {
  return (
    <AppShell>
      <h1 className="mb-4 text-3xl font-black">Join match</h1>
      <JoinByCodeForm />
    </AppShell>
  );
}
