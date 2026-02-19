import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

const ERROR_COPY: Record<string, string> = {
  CredentialsSignin: "Invalid email or password. Please check your credentials and try again.",
  OAuthAccountNotLinked:
    "This email is already linked to a different sign-in method. Use the original provider.",
  AccessDenied: "Access was denied for this request. Contact your admin if this continues.",
  Configuration:
    "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local.",
};

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const errorCode = params?.error ?? "Default";
  const message =
    ERROR_COPY[errorCode] ?? "Authentication failed due to an unexpected issue. Please try again.";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(99,132,255,0.32),transparent_36%),radial-gradient(circle_at_85%_82%,rgba(45,76,145,0.28),transparent_40%),linear-gradient(180deg,#040712_0%,#0A1224_42%,#0A1328_100%)]" />
      <div className="absolute inset-0 bg-soft-grid [background-size:28px_28px] opacity-20" />

      <div className="relative z-10 w-full max-w-md">
        <AuthCard
          mode="login"
          title="Unable to sign in"
          description="We could not complete authentication for this request."
        >
          <Alert variant="destructive" className="border-red-400/35 bg-red-500/10 text-red-200">
            <AlertDescription>{message}</AlertDescription>
          </Alert>

          <Link
            href="/auth/login"
            className={cn(buttonVariants(), "h-11 w-full")}
          >
            Back to sign in
          </Link>
        </AuthCard>
      </div>
    </div>
  );
}
