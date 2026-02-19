"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
    <form className="space-y-4" onSubmit={handleSubmit}>
      <GoogleButton callbackUrl={callbackUrl} disabled={!googleEnabled} />

      {!googleEnabled ? (
        <p className="text-xs text-slate-400">
          Google OAuth is currently unavailable. Add Google client credentials in
          <code className="mx-1 rounded bg-white/10 px-1 py-0.5">.env.local</code>
          to enable it.
        </p>
      ) : null}

      <div className="relative">
        <Separator className="bg-white/12" />
        <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0b1220] px-2 text-[11px] uppercase tracking-wider text-slate-400">
          or continue with email
        </span>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-slate-200">
          Work email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          className="h-11 border-white/14 bg-white/[0.02] text-slate-100 placeholder:text-slate-400"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-slate-200">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          className="h-11 border-white/14 bg-white/[0.02] text-slate-100 placeholder:text-slate-400"
        />
      </div>

      {error ? (
        <Alert variant="destructive" className="border-red-400/35 bg-red-500/10 text-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={isLoading || !canSubmit}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Sign in
      </Button>
    </form>
  );
}
