"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { DM_Sans } from "next/font/google";
import { createPortal } from "react-dom";
import {
  Activity,
  Check,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  LayoutTemplate,
  Maximize2,
  MessageSquareText,
  Mic,
  Minimize2,
  Plus,
  Scale,
  ShoppingCart,
  SendHorizontal,
  SlidersHorizontal,
  Sparkles,
  Truck,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";

import { transcribeOpsBrainAudio } from "@/features/operations/api";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-start-page",
});

const pageTheme = {
  "--start-page-bg": "#f7f7f8",
  "--start-surface": "rgba(255,255,255,0.92)",
  "--start-surface-strong": "rgba(255,255,255,0.97)",
  "--start-border": "rgba(221,225,233,0.86)",
  "--start-border-soft": "rgba(232,235,242,0.92)",
  "--start-muted": "#6f7280",
  "--start-title": "#171923",
  "--start-hero-left": "rgba(191,234,236,0.95)",
  "--start-hero-center": "rgba(239,242,245,0.96)",
  "--start-hero-right": "rgba(226,213,247,0.95)",
  "--start-hero-border": "rgba(220,226,236,0)",
  "--start-shadow": "none",
  "--start-link": "#6f3fff",
  "--start-link-hover": "#5f31e8",
  "--start-helper": "#838694",
  "--start-pill-bg": "rgba(255,255,255,0.8)",
  "--start-pill-border": "rgba(219,223,235,0.92)",
  "--start-pill-text": "#2b2d36",
  "--start-pill-active-bg": "rgba(255,255,255,0.92)",
  "--start-pill-active-text": "#312b52",
  "--start-chip-bg": "rgba(255,255,255,0.95)",
  "--start-chip-border": "rgba(207,212,225,0.96)",
  "--start-chip-text": "#2c3040",
  "--start-chip-shadow": "0 8px 18px -20px rgba(15,23,42,0.16)",
  "--start-control-bg": "rgba(255,255,255,0.92)",
  "--start-control-border": "rgba(209,214,225,0.9)",
  "--start-control-text": "#1f2330",
  "--start-control-send-bg": "#f0f2f7",
  "--start-control-send-text": "#7b8191",
  "--start-composer-placeholder": "#8b8d98",
  "--start-composer-icon": "#232735",
  "--start-composer-border": "rgba(221,226,236,0.9)",
  "--start-composer-shadow":
    "-18px 14px 32px -32px rgba(117,228,238,0.5), 22px 16px 34px -32px rgba(186,146,255,0.42), 0 18px 30px -34px rgba(107,116,148,0.16)",
  "--start-chip-row-border": "rgba(214,219,232,0.72)",
  "--start-chip-row-bg":
    "linear-gradient(90deg,rgba(240,249,250,0.98) 0%,rgba(241,243,248,0.98) 38%,rgba(236,231,249,0.98) 100%)",
  "--start-composer-shell":
    "linear-gradient(90deg, rgba(224,231,239,0.96) 0%, rgba(227,232,240,0.96) 100%)",
  "--start-card-bg": "rgba(255,255,255,0.72)",
  "--start-card-shadow": "none",
  "--start-card-icon-bg": "#f7f8fb",
  "--start-card-title": "#1f2430",
  "--start-card-subtitle": "#7c7f8d",
  "--start-feature-bg": "rgba(255,255,255,0.92)",
  "--start-feature-shadow": "0 18px 34px -32px rgba(15,23,42,0.08)",
  "--start-feature-title": "#272b38",
} as CSSProperties;

const SHOW_CATEGORY_PILLS = false;
const COMPOSER_PLACEHOLDER =
  "Ask anything about incidents, suppliers, orders, reconciliations, or system health...";
const COMPLEXITY_LEVELS = ["Low", "Medium", "High", "Deep"] as const;

type ComplexityLevel = (typeof COMPLEXITY_LEVELS)[number];

function getPreferredRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const mimeTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return mimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

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
    label: "Incidents",
    icon: TriangleAlert,
    prompt: "Show me the latest incidents and summarize root causes",
  },
  {
    label: "Suppliers",
    icon: Truck,
    prompt: "Which suppliers are causing the most issues right now?",
  },
  {
    label: "Orders",
    icon: ShoppingCart,
    prompt: "Show recent blocked or failed orders",
  },
  {
    label: "Reconciliation",
    icon: Scale,
    prompt: "Find recent reconciliation mismatches",
  },
  {
    label: "System health",
    icon: Activity,
    prompt: "Summarize current system health across Bamboo services",
  },
] as const;

const suggestionCards = [
  {
    eyebrow: "Incidents",
    title: "Show me the latest incidents and summarize root causes",
    eyebrowClassName: "text-[#14b7dd]",
    accent: "cyan",
  },
  {
    eyebrow: "Suppliers",
    title: "Which suppliers are causing the most failed orders?",
    eyebrowClassName: "text-[#1b8a2e]",
    accent: "emerald",
  },
  {
    eyebrow: "Orders",
    title: "Find delayed or blocked orders that need attention today",
    eyebrowClassName: "text-[#2f6cff]",
    accent: "blue",
  },
  {
    eyebrow: "Reconciliation",
    title: "Explain the latest reconciliation mismatches and likely causes",
    eyebrowClassName: "text-[#7c3aed]",
    accent: "violet",
  },
  {
    eyebrow: "System health",
    title: "Summarize system health issues across AWS, APIs, and database jobs",
    eyebrowClassName: "text-[#c4691f]",
    accent: "amber",
  },
  {
    eyebrow: "Risk",
    title: "What operational risks need attention right now?",
    eyebrowClassName: "text-[#d14343]",
    accent: "rose",
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
        <h2 className="text-[20px] font-semibold tracking-[-0.045em] text-[var(--start-title)] md:text-[21px]">
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
          ? "border-[#8f67ff] bg-[var(--start-pill-active-bg)] text-[var(--start-pill-active-text)] shadow-[0_8px_20px_-18px_rgba(102,66,214,0.42)] dark:border-[rgba(128,99,255,0.64)] dark:bg-[rgba(83,50,165,0.22)] dark:text-white/[0.96] dark:shadow-[0_0_0_1px_rgba(34,211,238,0.16),0_0_18px_rgba(139,92,246,0.18)]"
          : "border-[var(--start-pill-border)] bg-[var(--start-pill-bg)] text-[var(--start-pill-text)] dark:border-white/[0.18] dark:bg-white/[0.03] dark:text-white/[0.9]"
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
  onClick,
}: {
  label: string;
  icon: typeof TriangleAlert;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-[32px] items-center gap-1.5 rounded-full border border-[color:var(--start-chip-border)] bg-[var(--start-chip-bg)] px-[14px] text-[13px] font-medium tracking-[-0.02em] text-[var(--start-chip-text)] shadow-[var(--start-chip-shadow)] transition-all hover:bg-white dark:border-[rgba(116,103,167,0.48)] dark:bg-[rgba(18,17,27,0.78)] dark:text-white/[0.88] dark:hover:bg-[rgba(33,31,46,0.96)] dark:hover:shadow-none"
    >
      <Icon className="h-3.5 w-3.5 text-[#4d5566] dark:text-white/[0.82]" strokeWidth={1.9} />
      <span>{label}</span>
    </button>
  );
}

function ComposerActionButton({
  icon: Icon,
  tooltip,
  tooltipId,
  activeTooltip,
  onTooltipChange,
  onClick,
  active = false,
  disabled = false,
  prominent = false,
  badge,
  className,
  tooltipClassName,
}: {
  icon: typeof Plus;
  tooltip: string;
  tooltipId: string;
  activeTooltip: string | null;
  onTooltipChange: Dispatch<SetStateAction<string | null>>;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  prominent?: boolean;
  badge?: string;
  className?: string;
  tooltipClassName?: string;
}) {
  return (
    <div className="group/tooltip relative">
      <button
        type="button"
        aria-label={tooltip}
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={() => onTooltipChange(tooltipId)}
        onMouseLeave={() => onTooltipChange((current) => (current === tooltipId ? null : current) as never)}
        onFocus={() => onTooltipChange(tooltipId)}
        onBlur={() => onTooltipChange((current) => (current === tooltipId ? null : current) as never)}
        className={cn(
          "flex h-[40px] w-[40px] items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(104,108,255,0.32)] disabled:cursor-not-allowed disabled:opacity-45",
          prominent
            ? "border-transparent bg-[var(--start-control-send-bg)] text-[var(--start-control-send-text)] dark:border-white/[0.06] dark:bg-white/[0.12] dark:text-white/[0.88] dark:shadow-none"
            : "border-[color:var(--start-control-border)] bg-[var(--start-control-bg)] text-[var(--start-control-text)] dark:border-white/[0.16] dark:bg-white/[0.02] dark:text-white/[0.82] dark:hover:bg-white/[0.05] dark:hover:shadow-none",
          active &&
            "border-[rgba(89,180,244,0.48)] bg-[rgba(240,248,255,0.96)] text-[#2563eb] dark:border-[rgba(34,211,238,0.32)] dark:bg-[rgba(34,211,238,0.12)] dark:text-white",
          className
        )}
      >
        <Icon className="h-[17px] w-[17px]" strokeWidth={1.85} />
        {badge ? (
          <span className="absolute -bottom-1.5 -right-1 min-w-[18px] rounded-full bg-[linear-gradient(135deg,#4ec8ff,#765bff)] px-1.5 py-[1px] text-center text-[9px] font-semibold leading-none text-white">
            {badge}
          </span>
        ) : null}
      </button>
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-30 w-max whitespace-nowrap -translate-x-1/2 rounded-[10px] bg-[#1f2330] px-3 py-1.5 text-[11.5px] font-medium tracking-[-0.01em] text-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.45)] transition-opacity duration-150 dark:bg-white dark:text-[#171923]",
          activeTooltip === tooltipId ? "opacity-100" : "opacity-0",
          tooltipClassName
        )}
      >
        {tooltip}
      </span>
    </div>
  );
}

function getFileMeta(file: File) {
  const lowerName = file.name.toLowerCase();

  if (file.type.startsWith("image/")) {
    return { kind: "image" as const, icon: FileImage, accent: "text-[#2563eb] dark:text-[#93c5fd]" };
  }

  if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
    return { kind: "pdf" as const, icon: FileText, accent: "text-[#dc2626] dark:text-[#fca5a5]" };
  }

  if (
    file.type.includes("word") ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".docx")
  ) {
    return { kind: "doc" as const, icon: FileText, accent: "text-[#2563eb] dark:text-[#93c5fd]" };
  }

  if (
    file.type.includes("sheet") ||
    file.type.includes("csv") ||
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls")
  ) {
    return {
      kind: "sheet" as const,
      icon: FileSpreadsheet,
      accent: "text-[#16a34a] dark:text-[#86efac]",
    };
  }

  return { kind: "file" as const, icon: File, accent: "text-[#6b7280] dark:text-white/[0.68]" };
}

type AttachedFile = {
  id: string;
  file: File;
  previewUrl: string | null;
};

type FloatingPosition = {
  top: number;
  left: number;
};

function PromptComposer({
  inputValue,
  onInputChange,
  onPromptSelect,
}: {
  inputValue: string;
  onInputChange: (value: string) => void;
  onPromptSelect: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const depthMenuRef = useRef<HTMLDivElement | null>(null);
  const depthTriggerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const attachedFilesRef = useRef<AttachedFile[]>([]);
  const inputValueRef = useRef(inputValue);
  const [isComposerCompact, setIsComposerCompact] = useState(false);
  const [isDepthMenuOpen, setIsDepthMenuOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [listeningDotsStep, setListeningDotsStep] = useState(0);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [complexityLevel, setComplexityLevel] = useState<ComplexityLevel>("Medium");
  const [composerNotice, setComposerNotice] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [depthMenuPosition, setDepthMenuPosition] = useState<FloatingPosition | null>(null);

  useEffect(() => {
    setVoiceSupported(
      typeof window !== "undefined" &&
        typeof MediaRecorder !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia)
    );
  }, []);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  useEffect(() => {
    attachedFilesRef.current = attachedFiles;
  }, [attachedFiles]);

  useEffect(() => {
    if (!isListening) {
      setListeningDotsStep(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setListeningDotsStep((current) => (current + 1) % 3);
    }, 420);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isListening]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, isComposerCompact ? 44 : 124);
    textarea.style.height = `${Math.max(nextHeight, isComposerCompact ? 28 : 84)}px`;
  }, [inputValue, isComposerCompact]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        depthMenuRef.current &&
        !depthMenuRef.current.contains(target) &&
        depthTriggerRef.current &&
        !depthTriggerRef.current.contains(target)
      ) {
        setIsDepthMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDepthMenuOpen(false);
        setActiveTooltip(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isDepthMenuOpen || typeof window === "undefined") {
      return;
    }

    const updateDepthMenuPosition = () => {
      const trigger = depthTriggerRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const menuWidth = 208;
      const viewportPadding = 12;
      const nextLeft = Math.min(
        Math.max(rect.right - menuWidth - 8, viewportPadding),
        window.innerWidth - menuWidth - viewportPadding
      );

      setDepthMenuPosition({
        top: rect.top - 12,
        left: nextLeft,
      });
    };

    updateDepthMenuPosition();
    window.addEventListener("resize", updateDepthMenuPosition);
    window.addEventListener("scroll", updateDepthMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateDepthMenuPosition);
      window.removeEventListener("scroll", updateDepthMenuPosition, true);
    };
  }, [isDepthMenuOpen]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      attachedFilesRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  const focusComposer = () => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handlePromptPrefill = (value: string) => {
    setIsComposerCompact(false);
    setComposerNotice(null);
    onPromptSelect(value);
    focusComposer();
  };

  const handleSubmit = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) {
      return;
    }

    console.info("OpsBrain homepage composer submit", {
      prompt: trimmedValue,
      complexityLevel,
      fileNames: attachedFiles.map((item) => item.file.name),
    });
    setComposerNotice("Prompt captured locally. Chat execution is not connected yet.");
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length === 0) {
      return;
    }

    setAttachedFiles((current) => [
      ...current,
      ...nextFiles.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    ]);
    setComposerNotice(null);
    event.target.value = "";
    focusComposer();
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachedFiles((current) => {
      const nextFiles = current.filter((item) => item.id !== attachmentId);
      const removedFile = current.find((item) => item.id === attachmentId);
      if (removedFile?.previewUrl) {
        URL.revokeObjectURL(removedFile.previewUrl);
      }
      return nextFiles;
    });
  };

  const startVoiceInput = async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceSupported(false);
      setComposerNotice("Voice input is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getPreferredRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setIsListening(false);

        if (!audioBlob.size) {
          setComposerNotice("No audio was captured.");
          return;
        }

        setIsTranscribing(true);
        setComposerNotice("Transcribing speech…");

        try {
          const transcript = await transcribeOpsBrainAudio(
            audioBlob,
            recorder.mimeType.includes("ogg") ? "opsbrain-voice.ogg" : "opsbrain-voice.webm"
          );
          const prefix = inputValueRef.current.trim();
          onInputChange([prefix, transcript.trim()].filter(Boolean).join(prefix ? " " : ""));
          setComposerNotice("Voice input added to the composer.");
          focusComposer();
        } catch (error) {
          setComposerNotice(
            error instanceof Error ? error.message : "Voice input could not be completed."
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setMicPermissionDenied(false);
      setComposerNotice("Listening… click the mic again to stop.");
      setIsListening(true);
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : "";
      if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        setMicPermissionDenied(true);
        setComposerNotice("Microphone permission was denied.");
      } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
        setComposerNotice("No microphone was found on this device.");
      } else {
        setComposerNotice("Voice input could not be started.");
      }
      return;
    }
  };

  const toggleVoiceInput = async () => {
    if (isListening) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      setComposerNotice("Transcribing speech…");
      return;
    }

    if (isTranscribing) {
      return;
    }

    await startVoiceInput();
  };

  const listeningDots = ".".repeat(listeningDotsStep + 1);
  const composerPlaceholder =
    isListening && !inputValue
      ? `I'm listening${listeningDots}`
      : isTranscribing && !inputValue
        ? "Transcribing speech…"
        : COMPOSER_PLACEHOLDER;
  const statusMessage = isListening
    ? `I'm listening${listeningDots}`
    : composerNotice ??
      (!voiceSupported
        ? "Voice input is unavailable in this browser."
        : micPermissionDenied
          ? "Microphone access was denied."
          : "");

  return (
    <div className="mx-auto w-full max-w-[960px]">
      <div
        className="group/composer relative overflow-hidden rounded-[22px] bg-[image:var(--start-composer-shell)] p-px shadow-[var(--start-composer-shadow)] transition-[box-shadow,transform] duration-200 hover:shadow-[-18px_18px_38px_-32px_rgba(117,228,238,0.58),22px_20px_40px_-32px_rgba(186,146,255,0.5),0_22px_34px_-34px_rgba(107,116,148,0.2)] dark:rounded-[24px] dark:bg-[linear-gradient(90deg,rgba(10,218,238,0.58)_0%,rgba(46,38,93,0.22)_44%,rgba(124,58,237,0.62)_100%)] dark:p-px dark:shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_0_22px_rgba(34,211,238,0.08),0_0_36px_rgba(139,92,246,0.14)] dark:hover:shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_0_28px_rgba(34,211,238,0.14),0_0_44px_rgba(139,92,246,0.18)] dark:backdrop-blur-[12px]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-3 left-[-18px] w-14 rounded-full opacity-95 blur-[16px] dark:hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(121,236,239,0.52) 0%, rgba(157,241,244,0.28) 48%, rgba(255,255,255,0) 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-3 right-[-20px] w-16 rounded-full opacity-95 blur-[18px] dark:hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(203,174,255,0.24) 0%, rgba(183,137,255,0.42) 42%, rgba(193,152,255,0.24) 72%, rgba(255,255,255,0) 100%)",
          }}
        />
        <div
          className={cn(
            "relative rounded-t-[21px] border border-white/88 border-b-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.994)_0%,rgba(253,253,255,0.982)_100%)] px-[21px] transition-[min-height,padding] duration-200 dark:rounded-t-[23px] dark:border dark:border-white/[0.03] dark:border-b-0 dark:bg-[linear-gradient(180deg,rgba(23,22,30,0.992)_0%,rgba(26,24,36,0.988)_100%)] md:px-5",
            isComposerCompact ? "min-h-[84px] pb-[16px] pt-[16px]" : "min-h-[168px] pb-[56px] pt-[20px] md:pb-[58px] md:pt-[18px]"
          )}
        >
          <ComposerActionButton
            icon={isComposerCompact ? Maximize2 : Minimize2}
            tooltip="Resize composer"
            tooltipId="resize"
            activeTooltip={activeTooltip}
            onTooltipChange={setActiveTooltip}
            onClick={() => {
              setIsComposerCompact((current) => !current);
              setIsDepthMenuOpen(false);
              setActiveTooltip(null);
              focusComposer();
            }}
            className="absolute right-[18px] top-[14px] h-[34px] w-[34px] border-transparent bg-transparent shadow-none hover:bg-white/70 dark:hover:bg-white/[0.05]"
          />

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(event) => {
              onInputChange(event.target.value);
              setComposerNotice(null);
            }}
            onFocus={() => setComposerNotice(null)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={composerPlaceholder}
            rows={1}
            className={cn(
              "w-full resize-none overflow-y-auto bg-transparent pr-14 text-[15px] leading-6 text-[#1f2330] outline-none placeholder:text-[var(--start-composer-placeholder)] dark:text-white/[0.92]",
              isListening && "placeholder:text-[rgba(107,114,128,0.78)] dark:placeholder:text-white/[0.44]",
              isComposerCompact ? "min-h-[28px]" : "min-h-[84px]"
            )}
          />

          <div
            className={cn(
              "absolute bottom-[16px] left-[15px] transition-all duration-200",
              isComposerCompact ? "pointer-events-none translate-y-2 opacity-0" : "opacity-100"
            )}
          >
            <ComposerActionButton
              icon={Plus}
              tooltip="Attach file"
              tooltipId="attach"
              activeTooltip={activeTooltip}
              onTooltipChange={setActiveTooltip}
              onClick={() => {
                setIsDepthMenuOpen(false);
                setActiveTooltip(null);
                fileInputRef.current?.click();
              }}
              className="shadow-none hover:bg-white dark:border-white/[0.12] dark:bg-white/[0.035] dark:text-white/[0.82] dark:hover:bg-white/[0.06]"
              tooltipClassName="-translate-x-[58%]"
            />
          </div>

          <div
            className={cn(
              "absolute bottom-[15px] right-[15px] flex items-center gap-2.5 transition-all duration-200 md:right-[16px]",
              isComposerCompact ? "pointer-events-none translate-y-2 opacity-0" : "opacity-100"
            )}
          >
            <div ref={depthTriggerRef} className="relative">
              <ComposerActionButton
                icon={SlidersHorizontal}
                tooltip={`Response depth: ${complexityLevel}`}
                tooltipId="depth"
                activeTooltip={activeTooltip}
                onTooltipChange={setActiveTooltip}
                onClick={() => {
                  setIsDepthMenuOpen((current) => !current);
                  setActiveTooltip(null);
                }}
                badge={complexityLevel.charAt(0)}
                className="shadow-none"
              />
            </div>

            <ComposerActionButton
              icon={Mic}
              tooltip="Chat using voice"
              tooltipId="voice"
              activeTooltip={activeTooltip}
              onTooltipChange={setActiveTooltip}
              onClick={() => {
                setActiveTooltip(null);
                void toggleVoiceInput();
              }}
              active={false}
              disabled={isTranscribing}
              className={cn(
                "transition-[background-color,border-color,color,box-shadow,transform] duration-200",
                isListening
                  ? "border-[#ef4444]/55 bg-[#ef4444] text-white shadow-[0_0_0_4px_rgba(239,68,68,0.14),0_12px_22px_-14px_rgba(239,68,68,0.7)] scale-[1.03] hover:bg-[#ef4444] dark:border-[#f87171]/60 dark:bg-[#ef4444] dark:text-white dark:shadow-[0_0_0_4px_rgba(248,113,113,0.16),0_12px_24px_-14px_rgba(239,68,68,0.65)] animate-[pulse_1.2s_ease-in-out_infinite]"
                  : ""
              )}
            />
            <ComposerActionButton
              icon={SendHorizontal}
              tooltip="Send message"
              tooltipId="send"
              activeTooltip={activeTooltip}
              onTooltipChange={setActiveTooltip}
              onClick={handleSubmit}
              prominent
              disabled={!inputValue.trim()}
            />
          </div>
        </div>

        <div
          className={cn(
            "overflow-hidden border-t border-[color:var(--start-chip-row-border)] bg-[image:var(--start-chip-row-bg)] px-3 transition-[max-height,opacity,padding] duration-200 md:px-[12px] dark:border-t-white/[0.05] dark:bg-[linear-gradient(90deg,rgba(25,23,40,0.985)_0%,rgba(31,28,52,0.985)_100%)]",
            isComposerCompact ? "max-h-0 py-0 opacity-0" : "max-h-[80px] py-[8px] opacity-100"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {promptChips.map((chip) => (
              <PromptChip
                key={chip.label}
                label={chip.label}
                icon={chip.icon}
                onClick={() => handlePromptPrefill(chip.prompt)}
              />
            ))}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={handleFileSelection}
      />

      {isDepthMenuOpen && depthMenuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={depthMenuRef}
              className="fixed z-[9999] min-w-[208px] rounded-[18px] border border-[var(--start-border-soft)] bg-white p-2.5 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.28)] dark:border-white/[0.08] dark:bg-[#14131c]"
              style={{
                top: depthMenuPosition.top,
                left: depthMenuPosition.left,
                transform: "translateY(-100%)",
              }}
            >
              {COMPLEXITY_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    setComplexityLevel(level);
                    setIsDepthMenuOpen(false);
                    setActiveTooltip(null);
                    focusComposer();
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[14px] px-3.5 py-2 text-left text-[14px] font-medium whitespace-nowrap transition-colors",
                    level === complexityLevel
                      ? "bg-white text-[var(--start-title)] dark:bg-white/[0.06] dark:text-white"
                      : "text-[var(--start-title)] hover:bg-white dark:text-white/[0.86] dark:hover:bg-white/[0.04]"
                  )}
                >
                  <span>{level}</span>
                  {level === complexityLevel ? <Check className="h-4 w-4" strokeWidth={2} /> : null}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}

      {attachedFiles.length > 0 || isListening || composerNotice || micPermissionDenied || !voiceSupported ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[12px] font-medium text-[var(--start-helper)] dark:text-white/[0.52]">
          <div className="flex min-h-[28px] flex-wrap items-center gap-2">
            {attachedFiles.length > 0 ? (
              attachedFiles.map((attachment) => {
                const fileMeta = getFileMeta(attachment.file);
                return (
                  <div
                    key={attachment.id}
                    className="inline-flex max-w-[320px] items-center gap-2 rounded-full border border-[var(--start-border-soft)] bg-[var(--start-surface-strong)] px-2 py-1.5 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.2)] dark:border-white/[0.08] dark:bg-white/[0.04]"
                  >
                    {fileMeta.kind === "image" && attachment.previewUrl ? (
                      <img
                        src={attachment.previewUrl}
                        alt={attachment.file.name}
                        className="h-7 w-7 rounded-[8px] object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#f2f5fb] dark:bg-white/[0.06]">
                        <fileMeta.icon
                          className={cn("h-4 w-4", fileMeta.accent)}
                          strokeWidth={1.9}
                        />
                      </div>
                    )}
                    <span className="truncate text-[12px] font-medium text-[var(--start-title)] dark:text-white/[0.84]">
                      {attachment.file.name}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${attachment.file.name}`}
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[#6b7280] transition-colors hover:bg-black/5 hover:text-[#111827] dark:text-white/[0.56] dark:hover:bg-white/[0.08] dark:hover:text-white/[0.9]"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                );
              })
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
          <span
            className={cn(
              "transition-opacity duration-200",
              isListening
                ? "text-[rgba(111,114,128,0.86)] dark:text-white/[0.46]"
                : ""
            )}
          >
            {statusMessage}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function RecentChatCard() {
  return (
    <div className="max-w-[304px] rounded-[14px] border border-[var(--start-border)] bg-[var(--start-card-bg)] px-[14px] py-[13px] shadow-[var(--start-card-shadow)] transition-all dark:hover:-translate-y-0.5 dark:hover:shadow-[0_0_22px_rgba(139,92,246,0.14)]">
      <div className="flex items-center gap-4">
        <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[11px] bg-[var(--start-card-icon-bg)] text-[#555b69] dark:text-white/[0.82]">
          <MessageSquareText className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </div>
        <div className="space-y-1">
          <p className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--start-card-title)]">
            Supplier incident summary
          </p>
          <p className="text-[12px] text-[var(--start-card-subtitle)]">2 hours ago</p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  eyebrow,
  eyebrowClassName,
  title,
  accent,
  onSelect,
}: {
  eyebrow: string;
  eyebrowClassName: string;
  title: string;
  accent: "cyan" | "emerald" | "blue" | "violet" | "amber" | "rose";
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-h-[240px] flex-col overflow-hidden rounded-[18px] border border-[var(--start-border)] bg-[var(--start-feature-bg)] px-[16px] pt-[16px] text-left shadow-[var(--start-feature-shadow)] transition-all hover:-translate-y-0.5 dark:hover:shadow-[0_0_22px_rgba(34,211,238,0.12)]"
    >
      <p className={cn("text-[13px] font-semibold tracking-[-0.02em]", eyebrowClassName)}>{eyebrow}</p>
      <h3 className="mt-[10px] max-w-[220px] text-[15px] leading-[1.5] text-[var(--start-feature-title)]">{title}</h3>
      <div className="mt-auto pb-4 pt-5">
        <SuggestionIllustration accent={accent} />
      </div>
    </button>
  );
}

function SuggestionIllustration({
  accent,
}: {
  accent: "cyan" | "emerald" | "blue" | "violet" | "amber" | "rose";
}) {
  const accentStyles = {
    cyan: "from-[#7de3ea] to-[#8f8bff]",
    emerald: "from-[#6fd1a0] to-[#95a7ff]",
    blue: "from-[#6bb8ff] to-[#858cff]",
    violet: "from-[#aa8dff] to-[#7c5cff]",
    amber: "from-[#ffb85c] to-[#9e86ff]",
    rose: "from-[#ff8f9f] to-[#9787ff]",
  } as const;

  return (
    <div className="overflow-hidden rounded-[14px] bg-[linear-gradient(180deg,rgba(245,247,251,0.94)_0%,rgba(239,242,249,0.98)_100%)] p-4 dark:bg-[linear-gradient(180deg,rgba(22,25,38,0.96)_0%,rgba(17,19,31,0.98)_100%)]">
      <div className="rounded-[12px] border border-white/60 bg-white/[0.84] p-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
        <div className={cn("h-3 w-[72%] rounded-full bg-gradient-to-r", accentStyles[accent])} />
        <div className="mt-3 h-2.5 w-[58%] rounded-full bg-[#dce2f3] dark:bg-white/[0.08]" />
        <div className="mt-2 h-2.5 w-[82%] rounded-full bg-[#e8ecf8] dark:bg-white/[0.05]" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="h-14 rounded-[10px] bg-[rgba(255,255,255,0.78)] dark:bg-white/[0.04]" />
          <div className="h-14 rounded-[10px] bg-[rgba(255,255,255,0.58)] dark:bg-white/[0.03]" />
          <div className={cn("h-14 rounded-[10px] bg-gradient-to-b", accentStyles[accent])} />
        </div>
      </div>
    </div>
  );
}

export function StartPage({ userFirstName }: { userFirstName?: string | null }) {
  const [inputValue, setInputValue] = useState("");
  const welcomeTitle = userFirstName ? `Welcome back, ${userFirstName}` : "Welcome back";

  useEffect(() => {
    const handleStartNewChat = () => {
      setInputValue("");
    };

    window.addEventListener("opsbrain:start-new-chat", handleStartNewChat);

    return () => {
      window.removeEventListener("opsbrain:start-new-chat", handleStartNewChat);
    };
  }, []);

  return (
    <div
      style={pageTheme}
      className={cn(
        dmSans.variable,
        "relative mx-auto w-full max-w-none font-[family:var(--font-start-page)] dark:overflow-visible dark:rounded-none dark:[--start-page-bg:transparent] dark:[--start-surface:rgba(22,21,29,0.98)] dark:[--start-surface-strong:rgba(22,21,29,0.98)] dark:[--start-border:rgba(255,255,255,0.12)] dark:[--start-border-soft:rgba(255,255,255,0.08)] dark:[--start-muted:rgba(255,255,255,0.54)] dark:[--start-title:rgba(255,255,255,0.94)] dark:[--start-hero-left:rgba(15,128,139,0.38)] dark:[--start-hero-center:rgba(26,45,92,0.34)] dark:[--start-hero-right:rgba(101,37,214,0.4)] dark:[--start-hero-border:rgba(128,99,255,0.16)] dark:[--start-shadow:inset_0_1px_0_rgba(255,255,255,0.03)] dark:[--start-link:#a78bfa] dark:[--start-link-hover:#c4b5fd] dark:[--start-helper:rgba(255,255,255,0.54)] dark:[--start-pill-bg:rgba(255,255,255,0.03)] dark:[--start-pill-border:rgba(255,255,255,0.16)] dark:[--start-pill-text:rgba(255,255,255,0.92)] dark:[--start-pill-active-bg:rgba(83,50,165,0.2)] dark:[--start-pill-active-text:rgba(255,255,255,0.96)] dark:[--start-chip-bg:rgba(18,17,27,0.78)] dark:[--start-chip-border:rgba(116,103,167,0.48)] dark:[--start-chip-text:rgba(255,255,255,0.88)] dark:[--start-chip-shadow:none] dark:[--start-control-bg:rgba(255,255,255,0.02)] dark:[--start-control-border:rgba(255,255,255,0.16)] dark:[--start-control-text:rgba(255,255,255,0.88)] dark:[--start-control-send-bg:rgba(255,255,255,0.12)] dark:[--start-control-send-text:rgba(255,255,255,0.88)] dark:[--start-composer-placeholder:rgba(255,255,255,0.5)] dark:[--start-composer-icon:rgba(255,255,255,0.82)] dark:[--start-composer-border:rgba(128,99,255,0.42)] dark:[--start-chip-row-border:rgba(255,255,255,0.05)] dark:[--start-card-bg:rgba(255,255,255,0.02)] dark:[--start-card-shadow:none] dark:[--start-card-icon-bg:rgba(255,255,255,0.06)] dark:[--start-card-title:rgba(255,255,255,0.92)] dark:[--start-card-subtitle:rgba(255,255,255,0.52)] dark:[--start-feature-bg:rgba(255,255,255,0.02)] dark:[--start-feature-shadow:none] dark:[--start-feature-title:rgba(255,255,255,0.9)]"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[352px] rounded-t-[32px] dark:hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 10%, rgba(174,228,233,0.3), transparent 24%), radial-gradient(circle at 88% 10%, rgba(189,151,255,0.18), transparent 22%), linear-gradient(90deg, rgba(191,234,236,0.95) 0%, rgba(239,242,245,0.96) 48%, rgba(226,213,247,0.95) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[182px] h-[188px] bg-[linear-gradient(180deg,rgba(247,247,248,0)_0%,rgba(247,247,248,0.88)_58%,#f7f7f8_100%)] dark:hidden"
      />
      <div className="relative space-y-10 px-4 pb-10 pt-0 md:space-y-[46px] md:px-5">
        <section
          className="relative overflow-hidden px-4 pb-[18px] pt-[54px] md:px-6 md:pb-[24px] md:pt-[60px] dark:rounded-[34px] dark:border dark:border-[color:var(--start-hero-border)]"
          style={{ boxShadow: "var(--start-shadow)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden dark:block dark:bg-[linear-gradient(135deg,rgba(6,182,212,0.12)_0%,rgba(99,102,241,0.1)_45%,rgba(124,58,237,0.16)_100%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden dark:block dark:bg-[radial-gradient(circle_at_18%_16%,rgba(34,211,238,0.06),transparent_30%),radial-gradient(circle_at_84%_12%,rgba(139,92,246,0.1),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]"
          />
          <div className="relative mx-auto max-w-[1048px]">
            <div className="space-y-4 text-center">
              <h1 className="text-[34px] font-semibold tracking-[-0.055em] text-transparent [background-image:linear-gradient(90deg,#2c8dff_0%,#6f3fff_84%)] bg-clip-text md:text-[46px] md:leading-[1.04] dark:font-medium dark:[background-image:linear-gradient(90deg,#22d3ee_0%,#60a5fa_45%,#818cf8_100%)] dark:[text-shadow:0_0_18px_rgba(96,165,250,0.18)]">
                {welcomeTitle}
              </h1>

              <p className="mx-auto max-w-[680px] text-[15px] font-medium text-[var(--start-muted)] dark:text-white/[0.62]">
                Ask anything about Bamboo operations, incidents, suppliers, orders, or system health.
              </p>

              {/*
                Hidden for now, but kept for later reuse if we want to restore top pills.
              */}
              {SHOW_CATEGORY_PILLS ? (
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {categoryPills.map((pill) => (
                    <CategoryPill key={pill.label} {...pill} />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-[22px] md:mt-[24px]">
              <PromptComposer
                inputValue={inputValue}
                onInputChange={setInputValue}
                onPromptSelect={setInputValue}
              />
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

        <StartPageSection title="Try asking">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {suggestionCards.map((card) => (
              <FeatureCard
                key={card.eyebrow}
                {...card}
                onSelect={() => setInputValue(card.title)}
              />
            ))}
          </div>
        </StartPageSection>
      </div>
    </div>
  );
}
