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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f7f8ff_48%,#eef2ff_100%)] px-4 py-10 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.18),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(56,189,248,0.14),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(236,72,153,0.08),transparent_30%)]" />
      <div className="absolute left-[-6rem] top-[12%] h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="absolute right-[-5rem] top-[18%] h-72 w-72 rounded-full bg-sky-200/35 blur-3xl" />
      <div className="absolute bottom-[-7rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-100/35 blur-3xl" />
      <div className="absolute left-[8%] top-[22%] h-24 w-24 rounded-full border border-white/70 bg-white/30 blur-2xl" />
      <div className="absolute right-[10%] bottom-[16%] h-32 w-32 rounded-full border border-white/60 bg-indigo-100/35 blur-2xl" />

      <div className="relative z-10 w-full max-w-[420px]">
        <AuthCard
          mode="login"
          title="Sign in"
          description="Sign in to continue managing your operations with AI"
        >
          <CredentialsForm callbackUrl={callbackUrl} googleEnabled={googleEnabled} />
        </AuthCard>
      </div>
    </div>
  );
}
