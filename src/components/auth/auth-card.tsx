import Link from "next/link";
import { ShieldCheck } from "lucide-react";

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
    <Card className="w-full border-white/15 bg-white/[0.06] text-slate-50 shadow-[0_25px_70px_-28px_rgba(15,23,42,0.85)] backdrop-blur-xl">
      <CardHeader className="space-y-5 pb-5">
        <div className="space-y-1">
          <p className="text-xl font-semibold tracking-tight text-slate-100">OpsBrain AI</p>
          <p className="text-sm text-slate-300/90">Operational Intelligence Layer</p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/12 bg-white/[0.02] p-1">
          <Link
            href="/auth/login"
            className={cn(
              "rounded-md px-3 py-2 text-center text-sm font-medium transition-colors",
              mode === "login"
                ? "bg-white/14 text-slate-100"
                : "text-slate-300 hover:bg-white/8 hover:text-slate-100"
            )}
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className={cn(
              "rounded-md px-3 py-2 text-center text-sm font-medium transition-colors",
              mode === "register"
                ? "bg-white/14 text-slate-100"
                : "text-slate-300 hover:bg-white/8 hover:text-slate-100"
            )}
          >
            Create account
          </Link>
        </div>

        <div className="space-y-1">
          <CardTitle className="text-2xl font-semibold text-slate-50">{title}</CardTitle>
          <CardDescription className="text-slate-300/90">{description}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {children}
        <div className="flex items-start gap-2 rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2 text-xs text-slate-300/95">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-200" />
          <p>
            Enterprise-grade security. Credentials are encrypted and scoped for operational
            access only.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
