import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeatureReadinessViewProps {
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function FeatureReadinessView({
  eyebrow,
  title,
  description,
  detail,
  primaryHref = "/",
  primaryLabel = "Open Workspace",
  secondaryHref,
  secondaryLabel,
}: FeatureReadinessViewProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-13rem)] max-w-4xl items-center justify-center py-10">
      <section className="w-full space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,rgba(59,130,246,0.14),rgba(139,92,246,0.18))] text-primary shadow-[0_24px_64px_-42px_rgba(59,130,246,0.44)] dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(139,92,246,0.22))]">
          <Sparkles className="h-6 w-6" />
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-5xl md:leading-[1.04]">
            {title}
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            {description}
          </p>
        </div>

        <div className="mx-auto max-w-3xl rounded-[30px] bg-white/72 px-6 py-5 text-left shadow-[0_28px_90px_-58px_rgba(16,24,40,0.26)] ring-1 ring-black/[0.05] backdrop-blur dark:bg-slate-950/66 dark:ring-white/[0.08] md:px-7">
          <p className="text-sm leading-7 text-muted-foreground">{detail}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href={primaryHref}
            className={cn(buttonVariants(), "rounded-full px-5")}
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>

          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className={cn(buttonVariants({ variant: "outline" }), "rounded-full px-5")}
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
