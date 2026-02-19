"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GoogleButtonProps {
  callbackUrl: string;
  className?: string;
  disabled?: boolean;
}

export function GoogleButton({ callbackUrl, className, disabled }: GoogleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signIn("google", { callbackUrl });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-11 w-full border-white/20 bg-white/[0.03] text-slate-100 hover:bg-white/[0.08] hover:text-slate-50",
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
          className="h-4 w-4"
          aria-hidden
        >
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15 18.9 12 24 12c3 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.1 35.2 26.6 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.5 16.3 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.5-6.2 7l6.2 5.2C35 40 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
        </svg>
      )}
      Continue with Google
    </Button>
  );
}
