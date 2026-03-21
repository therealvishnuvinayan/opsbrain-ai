"use client";

import type { CSSProperties, ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  CircleEllipsis,
  Code2,
  Folder,
  Image as ImageIcon,
  LayoutTemplate,
  MessageSquareText,
  Mic,
  PenTool,
  Plus,
  SendHorizontal,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from "lucide-react";

import { cn } from "@/lib/utils";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-start-page",
});

const pageTheme = {
  "--start-surface": "rgba(255,255,255,0.8)",
  "--start-surface-strong": "rgba(255,255,255,0.94)",
  "--start-border": "rgba(214,220,232,0.92)",
  "--start-border-soft": "rgba(228,232,241,0.88)",
  "--start-muted": "#6f7280",
  "--start-title": "#171923",
  "--start-hero-left": "rgba(205,242,244,0.88)",
  "--start-hero-center": "rgba(255,255,255,0.97)",
  "--start-hero-right": "rgba(225,207,255,0.78)",
  "--start-hero-border": "rgba(210,221,237,0.9)",
  "--start-shadow": "0 26px 68px -46px rgba(78,102,155,0.18)",
  "--start-link": "#6f3fff",
  "--start-link-hover": "#5f31e8",
  "--start-helper": "#838694",
  "--start-pill-bg": "rgba(255,255,255,0.76)",
  "--start-pill-border": "rgba(214,220,232,0.92)",
  "--start-pill-text": "#2b2d36",
  "--start-pill-active-bg": "rgba(255,255,255,0.84)",
  "--start-pill-active-text": "#312b52",
  "--start-chip-bg": "rgba(255,255,255,0.95)",
  "--start-chip-border": "rgba(207,212,225,0.96)",
  "--start-chip-text": "#2c3040",
  "--start-chip-shadow": "0 10px 18px -18px rgba(15,23,42,0.18)",
  "--start-control-bg": "rgba(255,255,255,0.94)",
  "--start-control-border": "rgba(206,212,223,0.94)",
  "--start-control-text": "#1f2330",
  "--start-control-send-bg": "#eef1f6",
  "--start-control-send-text": "#7b8191",
  "--start-composer-placeholder": "#8b8d98",
  "--start-composer-icon": "#232735",
  "--start-composer-border": "rgba(199,208,238,0.95)",
  "--start-composer-shadow":
    "0 24px 64px -48px rgba(95,101,202,0.34), 0 10px 28px -24px rgba(90,209,244,0.25)",
  "--start-chip-row-border": "rgba(215,220,234,0.86)",
  "--start-chip-row-bg":
    "linear-gradient(90deg,rgba(231,251,253,0.82),rgba(248,248,255,0.96),rgba(252,243,255,0.82))",
  "--start-card-bg": "rgba(255,255,255,0.9)",
  "--start-card-shadow": "0 18px 30px -30px rgba(15,23,42,0.12)",
  "--start-card-icon-bg": "#f6f7fb",
  "--start-card-title": "#1f2430",
  "--start-card-subtitle": "#7c7f8d",
  "--start-feature-bg": "rgba(255,255,255,0.92)",
  "--start-feature-shadow": "0 18px 34px -30px rgba(15,23,42,0.1)",
  "--start-feature-title": "#272b38",
} as CSSProperties;

const categoryPills = [
  {
    label: "Your designs",
    icon: Folder,
  },
  {
    label: "Templates",
    icon: LayoutTemplate,
  },
  {
    label: "Canva AI",
    icon: Sparkles,
    active: true,
  },
] as const;

const promptChips = [
  {
    label: "Design",
    icon: Wand2,
  },
  {
    label: "Image",
    icon: ImageIcon,
  },
  {
    label: "Doc",
    icon: PenTool,
  },
  {
    label: "Code",
    icon: Code2,
  },
  {
    label: "Video clip",
    icon: CircleEllipsis,
    suffix: "♛",
  },
] as const;

const featureCards = [
  {
    eyebrow: "Write",
    title: "A review of a book series you recently discovered",
    eyebrowClassName: "text-[#14b7dd]",
    illustration: <WriteIllustration />,
  },
  {
    eyebrow: "Code",
    title: "A fun memory matching game",
    eyebrowClassName: "text-[#1b8a2e]",
    illustration: <CodeIllustration />,
  },
  {
    eyebrow: "Image",
    title: "Inside a mid-century modern apartment",
    eyebrowClassName: "text-[#2f6cff]",
    illustration: <ImageIllustration />,
  },
  {
    eyebrow: "Video",
    title: "Create an animation for a digital service app ad",
    eyebrowClassName: "text-[#c4691f]",
    illustration: <VideoIllustration />,
  },
] as const;

function StartPageSection({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[25px] font-semibold tracking-[-0.05em] text-[var(--start-title)] md:text-[27px]">
          {title}
        </h2>
        {trailing}
      </div>
      {children}
    </section>
  );
}

function CategoryPill({
  label,
  icon: Icon,
  active = false,
}: {
  label: string;
  icon: typeof Folder;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border px-[14px] text-[14px] font-medium tracking-[-0.02em] transition-all",
        active
          ? "border-[#8f67ff] bg-[var(--start-pill-active-bg)] text-[var(--start-pill-active-text)] shadow-[0_8px_20px_-18px_rgba(102,66,214,0.42)] dark:border-[rgba(167,139,250,0.38)] dark:bg-[rgba(255,255,255,0.06)] dark:text-white/[0.94] dark:shadow-[0_0_8px_rgba(139,92,246,0.24),0_0_18px_rgba(34,211,238,0.12)]"
          : "border-[var(--start-pill-border)] bg-[var(--start-pill-bg)] text-[var(--start-pill-text)] dark:border-white/[0.14] dark:bg-white/[0.05] dark:text-white/[0.88]"
      )}
    >
      <span
        className={cn(
          "flex h-4.5 w-4.5 items-center justify-center rounded-full",
          active ? "bg-[linear-gradient(135deg,#24d5ff,#7d56ff)] text-white" : "text-[#6e7384]"
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
      </span>
      {label}
    </button>
  );
}

function PromptChip({
  label,
  icon: Icon,
  suffix,
}: {
  label: string;
  icon: typeof Wand2;
  suffix?: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-[32px] items-center gap-1.5 rounded-full border border-[color:var(--start-chip-border)] bg-[var(--start-chip-bg)] px-[14px] text-[13px] font-medium tracking-[-0.02em] text-[var(--start-chip-text)] shadow-[var(--start-chip-shadow)] transition-all hover:bg-white dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-white/[0.88] dark:hover:bg-white/[0.06] dark:hover:shadow-[0_0_12px_rgba(99,102,241,0.16)]"
    >
      <Icon className="h-3.5 w-3.5 text-[#4d5566] dark:text-white/[0.82]" strokeWidth={1.9} />
      <span>{label}</span>
      {suffix ? <span className="text-[11px] text-[#f0a52d]">{suffix}</span> : null}
    </button>
  );
}

function ComposerControl({
  icon: Icon,
  prominent = false,
}: {
  icon: typeof Settings;
  prominent?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-[40px] w-[40px] items-center justify-center rounded-full border transition-all",
        prominent
          ? "border-transparent bg-[var(--start-control-send-bg)] text-[var(--start-control-send-text)] dark:bg-[linear-gradient(135deg,#22d3ee_0%,#8b5cf6_100%)] dark:text-white dark:shadow-[0_0_18px_rgba(99,102,241,0.35)]"
          : "border-[color:var(--start-control-border)] bg-[var(--start-control-bg)] text-[var(--start-control-text)] dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white/[0.82] dark:hover:bg-white/[0.07] dark:hover:shadow-[0_0_12px_rgba(139,92,246,0.14)]"
      )}
    >
      <Icon className="h-[17px] w-[17px]" strokeWidth={1.85} />
    </button>
  );
}

function PromptComposer() {
  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <div
      className="overflow-hidden rounded-[26px] border border-[color:var(--start-composer-border)] bg-[var(--start-surface-strong)] shadow-[var(--start-composer-shadow)] dark:bg-[linear-gradient(180deg,rgba(9,11,19,0.95)_0%,rgba(12,13,24,0.98)_56%,rgba(15,16,30,0.99)_100%)] dark:backdrop-blur-[12px]"
      >
        <div className="relative min-h-[160px] px-5 pb-[58px] pt-5 md:px-6 md:pb-[60px] md:pt-[18px]">
          <button
            type="button"
            aria-label="Prompt settings"
            className="absolute right-5 top-[18px] text-[var(--start-composer-icon)] transition-colors hover:text-[#11131a] dark:text-white/[0.82] dark:hover:text-white"
          >
            <SlidersHorizontal className="h-[17px] w-[17px]" strokeWidth={1.9} />
          </button>

          <p className="max-w-[460px] text-[14px] font-medium tracking-[-0.01em] text-[var(--start-composer-placeholder)] dark:text-white/[0.42]">
            Describe your idea, and I&apos;ll bring it to life
          </p>

          <button
            type="button"
            aria-label="Add attachment"
            className="absolute bottom-[14px] left-5 flex h-[40px] w-[40px] items-center justify-center rounded-full border border-[color:var(--start-control-border)] bg-[var(--start-control-bg)] text-[var(--start-control-text)] shadow-[0_12px_24px_-20px_rgba(15,23,42,0.16)] transition-all hover:bg-white dark:border-white/[0.12] dark:bg-white/[0.035] dark:text-white/[0.82] dark:hover:bg-white/[0.06] dark:hover:shadow-[0_0_10px_rgba(34,211,238,0.12)] md:left-6"
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </button>

          <div className="absolute bottom-[10px] right-5 flex items-center gap-2.5 md:right-6">
            <ComposerControl icon={Settings} />
            <ComposerControl icon={Mic} />
            <ComposerControl icon={SendHorizontal} prominent />
          </div>
        </div>

        <div className="border-t border-[color:var(--start-chip-row-border)] bg-[image:var(--start-chip-row-bg)] px-3 py-[8px] md:px-[12px] dark:bg-[linear-gradient(90deg,rgba(14,25,35,0.65),rgba(39,22,74,0.45))]">
          <div className="flex flex-wrap items-center gap-2">
            {promptChips.map((chip) => (
              <PromptChip key={chip.label} {...chip} />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-2.5 text-center text-[12.5px] font-medium text-[var(--start-helper)] dark:text-white/[0.5]">
        This AI is new and improving.{" "}
        <a
          href="#"
          className="text-[var(--start-link)] underline underline-offset-2 transition-colors hover:text-[var(--start-link-hover)] dark:text-[#a78bfa] dark:hover:text-[#c4b5fd]"
        >
          See terms
        </a>{" "}
        ·{" "}
        <a
          href="#"
          className="text-[var(--start-link)] underline underline-offset-2 transition-colors hover:text-[var(--start-link-hover)] dark:text-[#a78bfa] dark:hover:text-[#c4b5fd]"
        >
          Give feedback
        </a>
      </p>
    </div>
  );
}

function RecentChatCard() {
  return (
    <div className="max-w-[320px] rounded-[14px] border border-[var(--start-border)] bg-[var(--start-card-bg)] px-[14px] py-[14px] shadow-[var(--start-card-shadow)] transition-all dark:hover:-translate-y-0.5 dark:hover:shadow-[0_0_22px_rgba(139,92,246,0.14)]">
      <div className="flex items-center gap-4">
        <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[12px] bg-[var(--start-card-icon-bg)] text-[#555b69] dark:text-white/[0.82]">
          <MessageSquareText className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </div>
        <div className="space-y-1">
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--start-card-title)]">
            Book Series Review
          </p>
          <p className="text-[13px] text-[var(--start-card-subtitle)]">8 hours ago</p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  eyebrow,
  eyebrowClassName,
  title,
  illustration,
}: {
  eyebrow: string;
  eyebrowClassName: string;
  title: string;
  illustration: ReactNode;
}) {
  return (
    <article className="flex min-h-[286px] flex-col overflow-hidden rounded-[18px] border border-[var(--start-border)] bg-[var(--start-feature-bg)] px-[16px] pt-[16px] shadow-[var(--start-feature-shadow)] transition-all dark:hover:-translate-y-0.5 dark:hover:shadow-[0_0_22px_rgba(34,211,238,0.12)]">
      <p className={cn("text-[13px] font-semibold tracking-[-0.02em]", eyebrowClassName)}>{eyebrow}</p>
      <h3 className="mt-[10px] max-w-[220px] text-[15px] leading-[1.5] text-[var(--start-feature-title)]">{title}</h3>
      <div className="mt-auto pb-4 pt-5">{illustration}</div>
    </article>
  );
}

function WriteIllustration() {
  return (
    <div className="overflow-hidden rounded-[14px] bg-[linear-gradient(180deg,#f8f5ff_0%,#f5f8ff_100%)] p-4">
      <div className="h-[88px] rounded-[12px] bg-white/[0.78] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        <div className="h-3 w-[68%] rounded-full bg-[linear-gradient(90deg,#63d4da,#ab73ff)]" />
        <div className="mt-3 h-3 w-[54%] rounded-full bg-[#d6d4f8]" />
        <div className="mt-2 h-3 w-[76%] rounded-full bg-[#ece8ff]" />
      </div>
      <div className="mt-3 flex gap-2">
        <div className="h-10 flex-1 rounded-[10px] bg-white/[0.85]" />
        <div className="h-10 w-10 rounded-[10px] bg-[linear-gradient(135deg,#82e7ec,#9f6dff)]" />
      </div>
    </div>
  );
}

function CodeIllustration() {
  return (
    <div className="overflow-hidden rounded-[14px] bg-[linear-gradient(180deg,#eff8ff_0%,#f7f4ff_100%)] p-4">
      <div className="flex items-end gap-3">
        <div className="flex h-[90px] w-[40px] items-end rounded-[10px] bg-[linear-gradient(180deg,#74dce9,#6e98ff)] p-2">
          <div className="h-5 w-5 rounded-full bg-white/[0.9]" />
        </div>
        <div className="h-[90px] w-[40px] rounded-[10px] bg-[linear-gradient(180deg,#9f8fff,#825dff)]" />
        <div className="h-[90px] w-[40px] rounded-[10px] bg-[linear-gradient(180deg,#b288ff,#9b76ff)]" />
        <div className="flex-1 rounded-[12px] bg-white/[0.86] p-3">
          <div className="h-3 w-[80%] rounded-full bg-[#d7defa]" />
          <div className="mt-2 h-3 w-[58%] rounded-full bg-[#e6eaff]" />
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {Array.from({ length: 8 }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  "block h-4 rounded-[5px]",
                  index % 3 === 0
                    ? "bg-[#9fdce5]"
                    : index % 2 === 0
                      ? "bg-[#b49cff]"
                      : "bg-[#e4dfff]"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageIllustration() {
  return (
    <div className="overflow-hidden rounded-[14px] bg-[linear-gradient(180deg,#fbf1e5_0%,#f2f8ff_100%)]">
      <div className="h-[146px] bg-[linear-gradient(90deg,#c87c33_0%,#dba777_12%,#f8efe5_12%,#f8efe5_72%,#b9d5e8_72%,#e6f3ff_100%)]">
        <div className="flex h-full items-end gap-4 px-5 pb-4">
          <div className="h-[60px] w-[86px] rounded-t-[24px] bg-[#ce6f2f]" />
          <div className="ml-auto h-[80px] w-[92px] rounded-[18px] bg-[rgba(255,255,255,0.55)]" />
        </div>
      </div>
    </div>
  );
}

function VideoIllustration() {
  return (
    <div className="overflow-hidden rounded-[14px] bg-[linear-gradient(180deg,#d7beff_0%,#f3ebff_100%)]">
      <div className="relative h-[146px]">
        <div className="absolute inset-x-3 bottom-0 top-4 rounded-t-[24px] bg-[linear-gradient(180deg,#8f53ff_0%,#c08fff_100%)]" />
        <div className="absolute bottom-0 left-1/2 h-[118px] w-[94px] -translate-x-1/2 rounded-t-[40px] bg-[linear-gradient(180deg,#7a3019_0%,#d77d47_55%,#f3b378_100%)]" />
        <div className="absolute bottom-2 left-1/2 h-[60px] w-[126px] -translate-x-1/2 rounded-t-[60px] bg-[#f6b889]" />
      </div>
    </div>
  );
}

export function StartPage() {
  return (
    <div
      style={pageTheme}
      className={cn(
        plusJakartaSans.variable,
        "mx-auto w-full max-w-[1180px] font-[family:var(--font-start-page)] dark:[--start-surface:rgba(9,11,19,0.96)] dark:[--start-surface-strong:rgba(9,11,19,0.96)] dark:[--start-border:rgba(255,255,255,0.06)] dark:[--start-border-soft:rgba(255,255,255,0.08)] dark:[--start-muted:rgba(255,255,255,0.5)] dark:[--start-title:rgba(255,255,255,0.92)] dark:[--start-hero-left:rgba(6,182,212,0.12)] dark:[--start-hero-center:rgba(99,102,241,0.1)] dark:[--start-hero-right:rgba(124,58,237,0.16)] dark:[--start-hero-border:rgba(255,255,255,0.09)] dark:[--start-shadow:0_0_32px_rgba(34,211,238,0.06),0_0_64px_rgba(139,92,246,0.1)] dark:[--start-link:#a78bfa] dark:[--start-link-hover:#c4b5fd] dark:[--start-helper:rgba(255,255,255,0.5)] dark:[--start-chip-row-border:rgba(255,255,255,0.08)] dark:[--start-card-bg:rgba(255,255,255,0.03)] dark:[--start-card-shadow:none] dark:[--start-card-icon-bg:rgba(255,255,255,0.05)] dark:[--start-card-title:rgba(255,255,255,0.9)] dark:[--start-card-subtitle:rgba(255,255,255,0.55)] dark:[--start-feature-bg:rgba(255,255,255,0.03)] dark:[--start-feature-shadow:none] dark:[--start-feature-title:rgba(255,255,255,0.88)]"
      )}
    >
      <div className="space-y-[58px] pb-10">
        <section
          className="relative overflow-hidden rounded-[34px] border border-[color:var(--start-hero-border)] px-6 pb-10 pt-[54px] md:px-8 md:pb-[46px] md:pt-[60px]"
          style={{ boxShadow: "var(--start-shadow)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--start-hero-left)_0%,var(--start-hero-center)_46%,var(--start-hero-right)_100%)] dark:bg-[linear-gradient(135deg,rgba(6,182,212,0.12)_0%,rgba(99,102,241,0.1)_45%,rgba(124,58,237,0.16)_100%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(177,236,240,0.45),transparent_28%),radial-gradient(circle_at_84%_12%,rgba(217,197,255,0.34),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_18%_16%,rgba(34,211,238,0.06),transparent_30%),radial-gradient(circle_at_84%_12%,rgba(139,92,246,0.1),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]"
          />
          <div className="relative mx-auto max-w-[1048px]">
            <div className="space-y-[22px] text-center">
              <h1 className="text-[42px] font-semibold tracking-[-0.065em] text-transparent [background-image:linear-gradient(90deg,#2c8dff_0%,#6f3fff_84%)] bg-clip-text md:text-[58px] md:leading-[1.03] dark:font-medium dark:[background-image:linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#818cf8_100%)] dark:[text-shadow:0_0_18px_rgba(96,165,250,0.18)]">
                What will you design today?
              </h1>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {categoryPills.map((pill) => (
                  <CategoryPill key={pill.label} {...pill} />
                ))}
              </div>
            </div>

            <div className="mt-[22px] md:mt-[24px]">
              <PromptComposer />
            </div>
          </div>
        </section>

        <StartPageSection
          title="Recent chats"
          trailing={
            <button
              type="button"
              className="text-[14px] font-medium text-[#7d8090] transition-colors hover:text-[#525766] dark:text-white/[0.55] dark:hover:text-white/[0.82]"
            >
              See all
            </button>
          }
        >
          <RecentChatCard />
        </StartPageSection>

        <StartPageSection title="See what you can do with AI">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((card) => (
              <FeatureCard key={card.eyebrow} {...card} />
            ))}
          </div>
        </StartPageSection>
      </div>
    </div>
  );
}
