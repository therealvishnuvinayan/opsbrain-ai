"use client";

import { useEffect, useRef, useState } from "react";

import { fetchOpsWorkspaceStatus, sendMessage } from "@/features/workspace/api";
import type {
  OpsWorkspaceMessage,
  OpsWorkspaceReasoningMode,
  OpsWorkspaceStatus,
} from "@/features/workspace/types";

const MESSAGES_STORAGE_KEY = "opsbrain.workspace.messages";
const REASONING_STORAGE_KEY = "opsbrain.workspace.reasoning";

const defaultStatus: OpsWorkspaceStatus = {
  status: "checking",
  headline: "Checking workspace connection",
  detail: "Confirming access to the OpsBrain backend.",
};

function isReasoningMode(value: string | null): value is OpsWorkspaceReasoningMode {
  return value === "quick" || value === "standard" || value === "deep";
}

function parseMessages(raw: string | null): OpsWorkspaceMessage[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((message): message is OpsWorkspaceMessage => {
        if (!message || typeof message !== "object") {
          return false;
        }

        return (
          typeof message.id === "string" &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          typeof message.createdAt === "string"
        );
      })
      .slice(-16);
  } catch {
    return [];
  }
}

function createMessageId(prefix: "user" | "assistant") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useOpsWorkspaceChat() {
  const [messages, setMessages] = useState<OpsWorkspaceMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [reasoningMode, setReasoningMode] =
    useState<OpsWorkspaceReasoningMode>("standard");
  const [status, setStatus] = useState<OpsWorkspaceStatus>(defaultStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestIdRef = useRef(0);

  async function refreshStatus() {
    setStatus({
      status: "checking",
      headline: "Checking workspace connection",
      detail: "Confirming access to the OpsBrain backend.",
    });

    try {
      const nextStatus = await fetchOpsWorkspaceStatus();
      setStatus(nextStatus);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "OpsBrain could not check backend availability.";

      setStatus({
        status: "unavailable",
        headline: "Backend status unavailable",
        detail: message,
      });
    }
  }

  useEffect(() => {
    const storedMessages = window.localStorage.getItem(MESSAGES_STORAGE_KEY);
    const storedReasoningMode = window.localStorage.getItem(REASONING_STORAGE_KEY);

    setMessages(parseMessages(storedMessages));

    if (isReasoningMode(storedReasoningMode)) {
      setReasoningMode(storedReasoningMode);
    }

    void refreshStatus();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      MESSAGES_STORAGE_KEY,
      JSON.stringify(messages.slice(-16))
    );
  }, [messages]);

  useEffect(() => {
    window.localStorage.setItem(REASONING_STORAGE_KEY, reasoningMode);
  }, [reasoningMode]);

  async function submitQuestion(nextQuestion?: string) {
    const question = (nextQuestion ?? inputValue).trim();

    if (!question || isSubmitting) {
      return;
    }

    if (status.status === "not_configured") {
      setErrorMessage(status.detail);
      return;
    }

    const userMessage: OpsWorkspaceMessage = {
      id: createMessageId("user"),
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMessage].slice(-16);

    setMessages(nextHistory);
    setInputValue("");
    setErrorMessage(null);
    setIsSubmitting(true);

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      const response = await sendMessage({
        question,
        reasoningMode,
        history: nextHistory,
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      const assistantMessage: OpsWorkspaceMessage = {
        id: createMessageId("assistant"),
        role: "assistant",
        content: response.narrative,
        createdAt: new Date().toISOString(),
        response,
      };

      setMessages([...nextHistory, assistantMessage].slice(-16));
      setStatus({
        status: "connected",
        headline: "Live backend connected",
        detail:
          "Queries are flowing through the OpsBrain backend and returning real operational context.",
      });
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "OpsBrain could not complete the request.";

      setErrorMessage(message);
      setStatus((current) =>
        current.status === "not_configured"
          ? current
          : {
              status: "unavailable",
              headline: "Query could not reach the backend",
              detail:
                "The workspace remains real-data only. Restore backend connectivity and try again.",
            }
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setIsSubmitting(false);
      }
    }
  }

  function clearConversation() {
    requestIdRef.current += 1;
    setIsSubmitting(false);
    setMessages([]);
    setInputValue("");
    window.localStorage.removeItem(MESSAGES_STORAGE_KEY);
  }

  return {
    messages,
    inputValue,
    setInputValue,
    reasoningMode,
    setReasoningMode,
    status,
    errorMessage,
    setErrorMessage,
    isSubmitting,
    submitQuestion,
    refreshStatus,
    clearConversation,
  };
}
