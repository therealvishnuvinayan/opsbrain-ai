"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { respondToQuestion } from "@/features/operations/aiResponder";
import { ChatThread } from "@/features/operations/components/chat-thread";
import { EntitiesPanel } from "@/features/operations/components/entities-panel";
import { ModeToggle } from "@/features/operations/components/mode-toggle";
import { OperationsSearchBar } from "@/features/operations/components/operations-search-bar";
import { PreviewPanel } from "@/features/operations/components/preview-panel";
import { ResultsList } from "@/features/operations/components/results-list";
import { SearchFilters } from "@/features/operations/components/search-filters";
import { StructuredResponsePanel } from "@/features/operations/components/structured-response-panel";
import { customers, orders, suppliers } from "@/features/operations/mock";
import type {
  AIResponse,
  OperationsChatMessage,
  OperationsSearchMode,
  SearchDateRange,
  SearchEntityType,
  SearchResult,
  SearchStatusFilter,
} from "@/features/operations/types";
import { searchEntities } from "@/features/operations/utils";
import { Card, CardContent } from "@/components/ui/card";

const RECENT_SEARCHES_KEY = "opsbrain.operations.recentSearches";
const ASK_MESSAGES_KEY = "opsbrain.operations.ask.messages";

const LOOKUP_SUGGESTIONS = [
  "OB-24831",
  "Eneba",
  "vip",
  "failed",
  "runa.io",
  "refund",
];

const ASK_EXAMPLE_QUESTIONS = [
  "Why is OB-24831 delayed and who owns the blocker?",
  "Is Eneba supplier health driving failed payout orders?",
  "Summarize customer risk for charlotte.adams@bluepeak.io",
];

function resultKey(result: SearchResult) {
  return `${result.type}:${result.id}`;
}

function parseRecentSearches(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6);
  } catch {
    return [];
  }
}

function parseAskMessages(raw: string | null): OperationsChatMessage[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is OperationsChatMessage => {
        if (!item || typeof item !== "object") {
          return false;
        }

        return (
          typeof item.id === "string" &&
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string" &&
          typeof item.createdAt === "string"
        );
      })
      .slice(-10);
  } catch {
    return [];
  }
}

export function OperationsSearchView() {
  const [mode, setMode] = useState<OperationsSearchMode>("lookup");

  const [lookupQuery, setLookupQuery] = useState("");
  const [debouncedLookupQuery, setDebouncedLookupQuery] = useState("");
  const [entityType, setEntityType] = useState<SearchEntityType>("all");
  const [statusFilter, setStatusFilter] = useState<SearchStatusFilter>("any");
  const [dateRange, setDateRange] = useState<SearchDateRange>("30d");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResultKey, setSelectedResultKey] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [askInput, setAskInput] = useState("");
  const [chatMessages, setChatMessages] = useState<OperationsChatMessage[]>([]);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);

  const hasInitializedLookup = useRef(false);
  const askTimerRef = useRef<number | null>(null);

  const data = useMemo(
    () => ({
      orders,
      customers,
      suppliers,
    }),
    []
  );

  useEffect(() => {
    const storedSearches = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    setRecentSearches(parseRecentSearches(storedSearches));

    const storedMessages = window.localStorage.getItem(ASK_MESSAGES_KEY);
    setChatMessages(parseAskMessages(storedMessages));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      ASK_MESSAGES_KEY,
      JSON.stringify(chatMessages.slice(-10))
    );
  }, [chatMessages]);

  useEffect(() => {
    if (!hasInitializedLookup.current) {
      hasInitializedLookup.current = true;
      setDebouncedLookupQuery(lookupQuery);
      return;
    }

    setIsSearching(true);

    const timeout = window.setTimeout(() => {
      setDebouncedLookupQuery(lookupQuery);
      setIsSearching(false);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [dateRange, entityType, lookupQuery, statusFilter]);

  useEffect(() => {
    const normalized = debouncedLookupQuery.trim();

    if (normalized.length < 2) {
      return;
    }

    setRecentSearches((current) => {
      const next = [
        normalized,
        ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
      ].slice(0, 6);
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, [debouncedLookupQuery]);

  const results = useMemo(
    () => searchEntities(data, debouncedLookupQuery, entityType, statusFilter, dateRange),
    [data, dateRange, debouncedLookupQuery, entityType, statusFilter]
  );

  useEffect(() => {
    if (!debouncedLookupQuery.trim()) {
      if (selectedResultKey !== null) {
        setSelectedResultKey(null);
      }
      return;
    }

    const currentList =
      entityType === "all"
        ? results.all
        : entityType === "order"
          ? results.orders
          : entityType === "customer"
            ? results.customers
            : results.suppliers;

    if (currentList.length === 0) {
      if (selectedResultKey !== null) {
        setSelectedResultKey(null);
      }
      return;
    }

    if (
      !selectedResultKey ||
      !currentList.some((item) => resultKey(item) === selectedResultKey)
    ) {
      setSelectedResultKey(resultKey(currentList[0]));
    }
  }, [debouncedLookupQuery, entityType, results, selectedResultKey]);

  useEffect(() => {
    return () => {
      if (askTimerRef.current) {
        window.clearTimeout(askTimerRef.current);
      }
    };
  }, []);

  const selectedResult = useMemo(
    () => results.all.find((result) => resultKey(result) === selectedResultKey) ?? null,
    [results.all, selectedResultKey]
  );

  const latestResponse = useMemo<AIResponse | null>(() => {
    for (let index = chatMessages.length - 1; index >= 0; index -= 1) {
      const message = chatMessages[index];
      if (message.role === "assistant" && message.response) {
        return message.response;
      }
    }

    return null;
  }, [chatMessages]);

  const submitAsk = () => {
    const question = askInput.trim();

    if (!question || isAssistantThinking) {
      return;
    }

    const userMessage: OperationsChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };

    setChatMessages((current) => [...current, userMessage].slice(-20));
    setAskInput("");
    setIsAssistantThinking(true);

    const response = respondToQuestion(question, data);
    const thinkingDuration = 600 + Math.floor(Math.random() * 600);

    askTimerRef.current = window.setTimeout(() => {
      const assistantMessage: OperationsChatMessage = {
        id: `msg-assistant-${Date.now()}`,
        role: "assistant",
        content: response.answerMarkdown,
        createdAt: new Date().toISOString(),
        response,
      };

      setChatMessages((current) => [...current, assistantMessage].slice(-20));
      setIsAssistantThinking(false);
    }, thinkingDuration);
  };

  const clearChat = () => {
    if (askTimerRef.current) {
      window.clearTimeout(askTimerRef.current);
      askTimerRef.current = null;
    }

    setIsAssistantThinking(false);
    setChatMessages([]);
    window.localStorage.removeItem(ASK_MESSAGES_KEY);
  };

  const promptSuggestions = latestResponse?.suggestedPrompts ?? ASK_EXAMPLE_QUESTIONS;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Search</h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Entity lookup across orders, customers, and supplier operations.
        </p>
      </section>

      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ModeToggle mode={mode} onChange={setMode} />
            {mode === "ask" ? (
              <p className="text-xs text-muted-foreground">Enter to send · Shift+Enter for new line</p>
            ) : null}
          </div>

          <OperationsSearchBar
            mode={mode}
            value={mode === "ask" ? askInput : lookupQuery}
            onChange={mode === "ask" ? setAskInput : setLookupQuery}
            onSubmit={mode === "ask" ? submitAsk : undefined}
            isSubmitting={mode === "ask" ? isAssistantThinking : false}
            submitLabel="Send"
          />

          {mode === "lookup" ? (
            <SearchFilters
              entityType={entityType}
              status={statusFilter}
              dateRange={dateRange}
              onEntityTypeChange={setEntityType}
              onStatusChange={setStatusFilter}
              onDateRangeChange={setDateRange}
            />
          ) : null}
        </CardContent>
      </Card>

      {mode === "lookup" ? (
        <div className="grid gap-4 xl:grid-cols-[1.08fr_1fr]">
          <ResultsList
            entityType={entityType}
            results={results}
            query={debouncedLookupQuery}
            isLoading={isSearching}
            selectedKey={selectedResultKey}
            recentSearches={recentSearches}
            suggestions={LOOKUP_SUGGESTIONS}
            onEntityTypeChange={setEntityType}
            onSelect={(result) => setSelectedResultKey(resultKey(result))}
            onUseSuggestion={(value) => {
              setLookupQuery(value);
            }}
          />

          <PreviewPanel selectedResult={selectedResult} />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.08fr_1fr]">
          <ChatThread
            messages={chatMessages}
            isThinking={isAssistantThinking}
            emptyPrompts={ASK_EXAMPLE_QUESTIONS}
            onPromptSelect={setAskInput}
            onClear={clearChat}
          />

          <div className="space-y-4">
            <StructuredResponsePanel response={latestResponse} onPromptSelect={setAskInput} />
            <EntitiesPanel response={latestResponse} data={data} />
          </div>
        </div>
      )}
    </div>
  );
}
