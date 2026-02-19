import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function VerifyPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(99,132,255,0.32),transparent_36%),radial-gradient(circle_at_85%_82%,rgba(45,76,145,0.28),transparent_40%),linear-gradient(180deg,#040712_0%,#0A1224_42%,#0A1328_100%)]" />
      <div className="absolute inset-0 bg-soft-grid [background-size:28px_28px] opacity-20" />

      <div className="relative z-10 w-full max-w-md">
        <AuthCard
          mode="login"
          title="Check your inbox"
          description="Verification emails are not enabled in this build yet."
        >
          <p className="text-sm text-slate-300/90">
            If you reached this page from an auth flow, return to sign in and continue with
            credentials or Google OAuth.
          </p>
          <Link
            href="/auth/login"
            className={cn(buttonVariants(), "h-11 w-full")}
          >
            Go to sign in
          </Link>
        </AuthCard>
      </div>
    </div>
  );
}
