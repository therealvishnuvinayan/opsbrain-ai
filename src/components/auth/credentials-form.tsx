"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Lock, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { GoogleButton } from "@/components/auth/google-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface CredentialsFormProps {
  callbackUrl: string;
  googleEnabled: boolean;
}

export function CredentialsForm({ callbackUrl, googleEnabled }: CredentialsFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      setError("Enter both email and password.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      if (result?.url) {
        router.push(result.url);
        router.refresh();
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <GoogleButton callbackUrl={callbackUrl} disabled={!googleEnabled} />

      {!googleEnabled ? (
        <p className="text-xs leading-5 text-slate-500">
          Google OAuth is currently unavailable. Add Google client credentials in
          <code className="mx-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-700">.env.local</code>
          to enable it.
        </p>
      ) : null}

      <div className="relative">
        <Separator className="bg-slate-200" />
        <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-3 text-[11px] uppercase tracking-[0.24em] text-slate-400">
          or continue with email
        </span>
      </div>

      <div className="space-y-2.5">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          Work email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="h-14 rounded-2xl border border-[#e5e7eb] bg-white pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-[#6366f1]/25"
          />
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <button
            type="button"
            onClick={() =>
              setError("Password reset is not available yet. Contact your workspace admin.")
            }
            className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="h-14 rounded-2xl border border-[#e5e7eb] bg-white pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-[#6366f1]/25"
          />
        </div>
      </div>

      {error ? (
        <Alert
          variant="destructive"
          className="border-red-200 bg-red-50 text-red-600 shadow-[0_10px_24px_-18px_rgba(239,68,68,0.6)]"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        className="h-14 w-full rounded-full bg-[linear-gradient(135deg,#7c3aed_0%,#4f46e5_58%,#2563eb_100%)] text-white shadow-[0_20px_38px_-20px_rgba(79,70,229,0.72)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_44px_-20px_rgba(79,70,229,0.78)]"
        disabled={isLoading || !canSubmit}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Sign in
      </Button>
    </form>
  );
}
