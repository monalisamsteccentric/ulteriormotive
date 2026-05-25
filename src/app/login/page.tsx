import { AuthForm } from "@/components/auth/AuthForm";
import { AppShell } from "@/components/layout/AppShell";

export default function LoginPage() {
  return (
    <AppShell>
      <section className="mb-5">
        <h1 className="text-4xl font-black">Enter Ulterior Motive</h1>
        <p className="mt-2 text-sm font-bold leading-6 text-mist">Use Supabase auth or continue as a guest for the MVP.</p>
      </section>
      <AuthForm />
    </AppShell>
  );
}
