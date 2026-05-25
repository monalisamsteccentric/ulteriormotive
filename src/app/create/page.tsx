import { CreateMatchForm } from "@/components/match/CreateMatchForm";
import { AppShell } from "@/components/layout/AppShell";

export default function CreatePage() {
  return (
    <AppShell>
      <h1 className="mb-4 text-3xl font-black">Create match</h1>
      <CreateMatchForm />
    </AppShell>
  );
}
