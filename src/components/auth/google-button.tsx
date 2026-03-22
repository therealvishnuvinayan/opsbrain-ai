"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GoogleButtonProps {
  callbackUrl: string;
  className?: string;
  disabled?: boolean;
}

export function GoogleButton({ callbackUrl, className, disabled }: GoogleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const csrfResponse = await fetch("/api/auth/csrf");

      if (!csrfResponse.ok) {
        throw new Error("Failed to initialize Google sign-in.");
      }

      const { csrfToken } = (await csrfResponse.json()) as { csrfToken?: string };

      if (!csrfToken) {
        throw new Error("Missing CSRF token for Google sign-in.");
      }

      const body = new URLSearchParams({
        csrfToken,
        callbackUrl,
        json: "true",
      });

      const signInResponse = await fetch("/api/auth/signin/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (!signInResponse.ok) {
        throw new Error("Google sign-in request failed.");
      }

      const { url } = (await signInResponse.json()) as { url?: string };

      if (!url) {
        throw new Error("Google sign-in redirect URL was not returned.");
      }

      window.location.assign(url);
    } catch (error) {
      console.error(error);
      setError("Unable to start Google sign-in. Check the Google OAuth redirect URI and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-14 w-full rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-[0_18px_40px_-22px_rgba(79,70,229,0.22)]",
          className
        )}
        disabled={isLoading || disabled}
        onClick={handleGoogleSignIn}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            className="h-5 w-5"
            aria-hidden
          >
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15 18.9 12 24 12c3 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.1 35.2 26.6 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.5 16.3 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.5-6.2 7l6.2 5.2C35 40 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
          </svg>
        )}
        <span className="text-sm font-medium">Continue with Google</span>
      </Button>

      {error ? (
        <Alert
          variant="destructive"
          className="border-red-200 bg-red-50 text-red-600 shadow-[0_10px_24px_-18px_rgba(239,68,68,0.6)]"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
