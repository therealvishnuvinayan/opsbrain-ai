import { AuthCard } from "@/components/auth/auth-card";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { isGoogleOAuthConfigured } from "@/lib/env";

interface LoginPageProps {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
}

function getSafeCallbackUrl(callbackUrl: string | undefined) {
  if (!callbackUrl) {
    return "/";
  }

  return callbackUrl.startsWith("/") ? callbackUrl : "/";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const callbackUrl = getSafeCallbackUrl(params?.callbackUrl);
  const googleEnabled = isGoogleOAuthConfigured;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(99,132,255,0.32),transparent_36%),radial-gradient(circle_at_85%_82%,rgba(45,76,145,0.28),transparent_40%),linear-gradient(180deg,#040712_0%,#0A1224_42%,#0A1328_100%)]" />
      <div className="absolute inset-0 bg-soft-grid [background-size:28px_28px] opacity-20" />
      <div className="absolute -left-16 top-1/3 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute -right-20 bottom-1/4 h-64 w-64 rounded-full bg-slate-400/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <AuthCard
          mode="login"
          title="Sign in"
          description="Access the command center with secure enterprise authentication."
        >
          <CredentialsForm callbackUrl={callbackUrl} googleEnabled={googleEnabled} />
        </AuthCard>
      </div>
    </div>
  );
}
