"use client";

import { Bot, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getCustomerById, getOrderById, getSupplierById } from "@/features/operations/mock";
import type { OperationsChatMessage } from "@/features/operations/types";
import { relativeFromNow } from "@/features/operations/utils";
import { cn } from "@/lib/utils";

interface ChatMessageBubbleProps {
  message: OperationsChatMessage;
}

function citationLabels(message: OperationsChatMessage) {
  const response = message.response;

  if (!response) {
    return [];
  }

  const orderLabels = response.entities.orders
    .map((id) => getOrderById(id))
    .filter((order): order is NonNullable<typeof order> => Boolean(order))
    .map((order) => `Order ${order.orderNumber}`);

  const customerLabels = response.entities.customers
    .map((id) => getCustomerById(id))
    .filter((customer): customer is NonNullable<typeof customer> => Boolean(customer))
    .map((customer) => customer.name);

  const supplierLabels = response.entities.suppliers
    .map((id) => getSupplierById(id))
    .filter((supplier): supplier is NonNullable<typeof supplier> => Boolean(supplier))
    .map((supplier) => supplier.name);

  return [...orderLabels, ...customerLabels, ...supplierLabels].slice(0, 6);
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";
  const labels = citationLabels(message);

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <article
        className={cn(
          "max-w-[92%] rounded-2xl border px-3 py-2.5",
          isUser
            ? "border-primary/30 bg-primary/15"
            : "border-white/10 bg-white/[0.04]"
        )}
      >
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-md",
              isUser ? "bg-primary/20 text-primary" : "bg-white/[0.08]"
            )}
          >
            {isUser ? <UserRound className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
          </span>
          <span>{isUser ? "You" : "OpsBrain"}</span>
          <span>·</span>
          <span>{relativeFromNow(message.createdAt)}</span>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>

        {!isUser && labels.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {labels.map((label, index) => (
              <Badge key={`${message.id}-citation-${index}`} variant="neutral">
                {label}
              </Badge>
            ))}
          </div>
        ) : null}
      </article>
    </div>
  );
}
