import { AuthForm } from "@/components/auth/AuthForm";
import { AppShell } from "@/components/layout/AppShell";

export default function LoginPage() {
  return (
    <AppShell>
      <section className="mb-5">
        <h1 className="text-4xl font-black">Enter Ulterior Motive</h1>
        <p className="mt-2 text-base font-bold leading-7 text-mist sm:text-sm sm:leading-6">Sign in with Google to create or join matches.</p>
      </section>
      <AuthForm />
    </AppShell>
  );
}
