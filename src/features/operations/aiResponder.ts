import type { Customer, Order, Supplier, AIResponse } from "@/features/operations/types";
import { formatCurrency, formatDateTime, relativeFromNow } from "@/features/operations/utils";

interface ResponderData {
  orders: Order[];
  customers: Customer[];
  suppliers: Supplier[];
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function uniqById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    output.push(item);
  }

  return output;
}

function recentFirst<T extends { updatedAt: string }>(items: T[]) {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function findCustomerForOrder(order: Order, customers: Customer[]) {
  return (
    customers.find((customer) => customer.email === order.customerEmail) ??
    customers.find((customer) => customer.name === order.customerName) ??
    null
  );
}

function asInvestigationHref(
  entityType: "order" | "customer" | "supplier",
  entityId: string,
  entityLabel: string
) {
  return `/investigation?${new URLSearchParams({
    entityType,
    entityId,
    entityLabel,
  }).toString()}`;
}

function fallbackActions(data: ResponderData) {
  const order = recentFirst(data.orders)[0];
  const customer = recentFirst(data.customers)[0];

  return [
    {
      label: "Open Order profile",
      href: order ? `/operations/orders/${order.id}` : "/operations/orders",
    },
    {
      label: "Open Customer profile",
      href: customer ? `/operations/customers/${customer.id}` : "/operations/customers",
    },
    {
      label: "Start Investigation",
      href: order
        ? asInvestigationHref("order", order.id, order.orderNumber)
        : "/investigation",
    },
    {
      label: "Create Action",
      href: "/actions?source=operations-ask",
    },
  ];
}

export function respondToQuestion(question: string, data: ResponderData): AIResponse {
  const trimmedQuestion = question.trim();
  const loweredQuestion = normalize(trimmedQuestion);

  const orderRefs = [
    ...new Set((trimmedQuestion.match(/OB-\d+/gi) ?? []).map((value) => value.toUpperCase())),
  ];

  let matchedOrders = data.orders.filter((order) =>
    orderRefs.includes(order.orderNumber.toUpperCase())
  );

  const matchedSuppliers = data.suppliers.filter((supplier) => {
    const supplierName = supplier.name.toLowerCase();
    const supplierDomain = supplier.domain?.toLowerCase() ?? "";

    return loweredQuestion.includes(supplierName) ||
      (supplierDomain.length > 0 && loweredQuestion.includes(supplierDomain));
  });

  const matchedCustomers = data.customers.filter((customer) => {
    return loweredQuestion.includes(customer.name.toLowerCase()) ||
      loweredQuestion.includes(customer.email.toLowerCase()) ||
      (customer.phone ? loweredQuestion.includes(customer.phone.toLowerCase()) : false);
  });

  if (matchedOrders.length === 0 && matchedSuppliers.length > 0) {
    matchedOrders = data.orders
      .filter((order) => matchedSuppliers.some((supplier) => supplier.name === order.supplierName))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4);
  }

  if (matchedOrders.length === 0 && matchedCustomers.length > 0) {
    matchedOrders = data.orders
      .filter((order) =>
        matchedCustomers.some(
          (customer) =>
            customer.name === order.customerName || customer.email === order.customerEmail
        )
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3);
  }

  if (matchedOrders.length === 0 && loweredQuestion.includes("delayed")) {
    matchedOrders = recentFirst(
      data.orders.filter((order) => order.status === "delayed")
    ).slice(0, 3);
  }

  if (matchedOrders.length === 0 && loweredQuestion.includes("failed")) {
    matchedOrders = recentFirst(
      data.orders.filter((order) => order.status === "failed")
    ).slice(0, 3);
  }

  if (matchedCustomers.length === 0 && loweredQuestion.includes("vip")) {
    matchedCustomers.push(...recentFirst(data.customers.filter((customer) => customer.tier === "VIP")).slice(0, 2));
  }

  const uniqueOrders = uniqById(matchedOrders);
  const uniqueCustomers = uniqById(matchedCustomers);
  const uniqueSuppliers = uniqById(matchedSuppliers);

  if (
    uniqueOrders.length === 0 &&
    uniqueCustomers.length === 0 &&
    uniqueSuppliers.length === 0
  ) {
    return {
      answerMarkdown:
        "I could not map that question to a specific order, customer, or supplier in the current workspace. " +
        "Try an order reference like OB-24831, a customer email, or a supplier name.",
      structured: {
        diagnosis: "No direct entity match",
        keyFindings: [
          "The query did not contain an identifiable order number or known entity token.",
          "No high-confidence lookup matches were produced from mock operational records.",
        ],
        evidence: [
          "[matcher] regex scan for OB-#### returned 0 exact order references.",
          "[matcher] supplier/customer token scan produced 0 direct entity matches.",
          "[guidance] use exact order IDs, customer emails, or supplier domains for highest precision.",
        ],
        recommendedActions: fallbackActions(data),
      },
      entities: {
        orders: [],
        customers: [],
        suppliers: [],
      },
      suggestedPrompts: [
        "Why is OB-24831 delayed?",
        "Show customer risk for charlotte.adams@bluepeak.io",
        "Is Eneba supplier health impacting failed orders?",
      ],
    };
  }

  const failedOrders = uniqueOrders.filter((order) => order.status === "failed");
  const delayedOrders = uniqueOrders.filter((order) => order.status === "delayed");
  const criticalSuppliers = uniqueSuppliers.filter((supplier) => supplier.health === "critical");
  const warnSuppliers = uniqueSuppliers.filter((supplier) => supplier.health === "warn");

  const diagnosis =
    failedOrders.length > 0 || criticalSuppliers.length > 0
      ? "High-risk operational degradation"
      : delayedOrders.length > 0 || warnSuppliers.length > 0
        ? "Emerging fulfillment and reconciliation latency"
        : "Operational posture appears stable";

  const summaryLines = [
    `Matched ${uniqueOrders.length} order(s), ${uniqueCustomers.length} customer(s), and ${uniqueSuppliers.length} supplier(s) from the question context.`,
    failedOrders.length > 0
      ? `${failedOrders.length} matched order(s) are currently in failed state, requiring immediate triage.`
      : delayedOrders.length > 0
        ? `${delayedOrders.length} matched order(s) are delayed with elevated payout latency risk.`
        : "No failed orders were detected in the matched set.",
    uniqueSuppliers.length > 0
      ? `Supplier health signals: ${uniqueSuppliers
          .map((supplier) => `${supplier.name}=${supplier.health}`)
          .join(", ")}.`
      : "Supplier-specific health signals were not directly referenced by the query.",
  ];

  const keyFindings = [
    `${uniqueOrders.length} linked order(s) identified from the provided context.`,
    `${failedOrders.length} failed and ${delayedOrders.length} delayed order(s) in the matched set.`,
    uniqueCustomers.length > 0
      ? `${uniqueCustomers.length} customer profile(s) connected to the incident context.`
      : "No explicit customer profile token matched in the query.",
    uniqueSuppliers.length > 0
      ? `${criticalSuppliers.length} critical and ${warnSuppliers.length} warning supplier signal(s).`
      : "No explicit supplier token matched in the query.",
  ];

  const evidence = [
    ...uniqueOrders.slice(0, 4).map(
      (order) =>
        `[db.orders] ${order.orderNumber} status=${order.status} supplier=${order.supplierName} amount=${formatCurrency(order.amount, order.currency)} updated=${formatDateTime(order.updatedAt)}`
    ),
    ...uniqueCustomers.slice(0, 3).map(
      (customer) =>
        `[db.customers] ${customer.name} tier=${customer.tier} email=${customer.email} updated=${formatDateTime(customer.updatedAt)}`
    ),
    ...uniqueSuppliers.slice(0, 3).map(
      (supplier) =>
        `[db.suppliers] ${supplier.name} health=${supplier.health} domain=${supplier.domain ?? "n/a"} updated=${formatDateTime(supplier.updatedAt)}`
    ),
  ];

  const primaryOrder = uniqueOrders[0] ?? recentFirst(data.orders)[0];
  const derivedCustomer =
    uniqueCustomers[0] ?? (primaryOrder ? findCustomerForOrder(primaryOrder, data.customers) : null);

  const primaryEntity =
    uniqueOrders[0]
      ? {
          type: "order" as const,
          id: uniqueOrders[0].id,
          label: uniqueOrders[0].orderNumber,
        }
      : uniqueCustomers[0]
        ? {
            type: "customer" as const,
            id: uniqueCustomers[0].id,
            label: uniqueCustomers[0].name,
          }
        : uniqueSuppliers[0]
          ? {
              type: "supplier" as const,
              id: uniqueSuppliers[0].id,
              label: uniqueSuppliers[0].name,
            }
          : null;

  const recommendedActions = [
    {
      label: "Open Order profile",
      href: primaryOrder ? `/operations/orders/${primaryOrder.id}` : "/operations/orders",
    },
    {
      label: "Open Customer profile",
      href: derivedCustomer
        ? `/operations/customers/${derivedCustomer.id}`
        : "/operations/customers",
    },
    {
      label: "Start Investigation",
      href: primaryEntity
        ? asInvestigationHref(primaryEntity.type, primaryEntity.id, primaryEntity.label)
        : "/investigation",
    },
    {
      label: "Create Action",
      href: `/actions?${new URLSearchParams({
        source: "operations-ask",
        entityType: primaryEntity?.type ?? "order",
        entityId: primaryEntity?.id ?? "",
      }).toString()}`,
    },
  ];

  if (uniqueSuppliers[0]) {
    recommendedActions.push({
      label: "Open Supplier profile",
      href: `/operations/suppliers/${uniqueSuppliers[0].id}`,
    });
  }

  return {
    answerMarkdown: `${summaryLines.join(" ")} Latest matched record updated ${relativeFromNow(
      (uniqueOrders[0] ?? uniqueCustomers[0] ?? uniqueSuppliers[0])?.updatedAt ?? new Date().toISOString()
    )}.`,
    structured: {
      diagnosis,
      keyFindings,
      evidence,
      recommendedActions,
    },
    entities: {
      orders: uniqueOrders.map((order) => order.id),
      customers: uniqById(
        [
          ...uniqueCustomers,
          ...uniqueOrders
            .map((order) => findCustomerForOrder(order, data.customers))
            .filter((customer): customer is Customer => Boolean(customer)),
        ]
      )
        .slice(0, 5)
        .map((customer) => customer.id),
      suppliers: uniqById(
        [
          ...uniqueSuppliers,
          ...uniqueOrders
            .map((order) =>
              data.suppliers.find((supplier) => supplier.name === order.supplierName) ?? null
            )
            .filter((supplier): supplier is Supplier => Boolean(supplier)),
        ]
      )
        .slice(0, 5)
        .map((supplier) => supplier.id),
    },
    suggestedPrompts: [
      "Which linked orders are most likely to fail in the next 24h?",
      "Compare supplier health impact for Eneba vs Epay",
      "Show escalation-ready summary for finance operations",
    ],
  };
}
