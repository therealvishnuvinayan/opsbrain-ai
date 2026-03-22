import Link from "next/link";
import { ShieldCheck, Sparkles } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  mode: "login" | "register";
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthCard({ mode, title, description, children }: AuthCardProps) {
  return (
    <Card className="relative w-full overflow-hidden rounded-[26px] border border-white/70 bg-white/80 text-slate-900 shadow-[0_30px_80px_-34px_rgba(99,102,241,0.35)] backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(124,58,237,0.08),rgba(79,70,229,0))]" />
      <CardHeader className="relative space-y-6 px-7 pb-6 pt-7 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#a78bfa_0%,#6366f1_55%,#38bdf8_100%)] shadow-[0_16px_28px_-14px_rgba(99,102,241,0.7)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-0.5">
            <p className="text-base font-semibold tracking-tight text-slate-900">OpsBrain AI</p>
            <p className="text-sm text-slate-500">Your AI-powered operations workspace</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100/90 p-1">
          <Link
            href="/auth/login"
            className={cn(
              "rounded-2xl px-3 py-2.5 text-center text-sm font-medium transition-all duration-200",
              mode === "login"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
            )}
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className={cn(
              "rounded-2xl px-3 py-2.5 text-center text-sm font-medium transition-all duration-200",
              mode === "register"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
            )}
          >
            Create account
          </Link>
        </div>

        <div className="space-y-2">
          <CardTitle className="text-[1.75rem] font-semibold tracking-tight text-slate-900">
            {title}
          </CardTitle>
          <CardDescription className="max-w-sm text-[15px] leading-6 text-slate-500">
            {description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-5 px-7 pb-7 sm:px-8">
        {children}
        <div className="flex items-start gap-2 rounded-2xl bg-slate-50/90 px-4 py-3 text-xs text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          <p>Your data is secure and encrypted</p>
        </div>
      </CardContent>
    </Card>
  );
}
