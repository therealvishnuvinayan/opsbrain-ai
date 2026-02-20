import type { Customer, Order, Supplier } from "@/features/operations/types";

const now = Date.now();

function hoursAgo(hours: number) {
  return new Date(now - hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(days: number) {
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

export const suppliers: Supplier[] = [
  {
    id: "sup-runa",
    name: "Runa",
    domain: "runa.io",
    health: "healthy",
    lastPayoutAt: hoursAgo(12),
    updatedAt: hoursAgo(2),
    tags: ["gift-cards", "priority"],
  },
  {
    id: "sup-eneba",
    name: "Eneba",
    domain: "eneba.com",
    health: "warn",
    lastPayoutAt: hoursAgo(28),
    updatedAt: hoursAgo(6),
    tags: ["marketplace", "latency-spike"],
  },
  {
    id: "sup-epay",
    name: "Epay",
    domain: "epayworldwide.com",
    health: "critical",
    lastPayoutAt: hoursAgo(72),
    updatedAt: hoursAgo(1),
    tags: ["payout-blocked", "high-risk"],
  },
  {
    id: "sup-incomm",
    name: "Incomm",
    domain: "incomm.com",
    health: "healthy",
    lastPayoutAt: hoursAgo(20),
    updatedAt: hoursAgo(8),
    tags: ["stable"],
  },
  {
    id: "sup-diggecard",
    name: "Diggecard",
    domain: "diggecard.net",
    health: "warn",
    lastPayoutAt: hoursAgo(40),
    updatedAt: hoursAgo(9),
    tags: ["manual-review"],
  },
  {
    id: "sup-gamivo",
    name: "Gamivo",
    domain: "gamivo.com",
    health: "healthy",
    lastPayoutAt: hoursAgo(10),
    updatedAt: hoursAgo(3),
    tags: ["stable", "api-v2"],
  },
  {
    id: "sup-kinguin",
    name: "Kinguin",
    domain: "kinguin.net",
    health: "warn",
    lastPayoutAt: hoursAgo(34),
    updatedAt: hoursAgo(11),
    tags: ["retries"],
  },
  {
    id: "sup-g2a",
    name: "G2A",
    domain: "g2a.com",
    health: "critical",
    lastPayoutAt: hoursAgo(96),
    updatedAt: hoursAgo(4),
    tags: ["incident-open", "hold"],
  },
  {
    id: "sup-ezpin",
    name: "Ezpin",
    domain: "ezpin.com",
    health: "healthy",
    lastPayoutAt: hoursAgo(16),
    updatedAt: hoursAgo(7),
    tags: ["low-volume"],
  },
  {
    id: "sup-cadooz",
    name: "Cadooz",
    domain: "cadooz.com",
    health: "healthy",
    lastPayoutAt: hoursAgo(18),
    updatedAt: hoursAgo(13),
    tags: ["stable"],
  },
];

export const customers: Customer[] = [
  {
    id: "cus-1001",
    name: "Aarav Menon",
    email: "aarav.menon@acme-pay.com",
    phone: "+1-415-555-0198",
    tier: "VIP",
    createdAt: daysAgo(240),
    updatedAt: hoursAgo(2),
    tags: ["high-ltv", "vip"],
  },
  {
    id: "cus-1002",
    name: "Sophia Turner",
    email: "sophia.turner@northbridge.io",
    phone: "+1-212-555-0112",
    tier: "Standard",
    createdAt: daysAgo(120),
    updatedAt: hoursAgo(14),
    tags: ["frequent-refunds"],
  },
  {
    id: "cus-1003",
    name: "Liam Patel",
    email: "liam.patel@bamboo-retail.com",
    phone: "+1-646-555-0171",
    tier: "VIP",
    createdAt: daysAgo(380),
    updatedAt: hoursAgo(5),
    tags: ["vip", "manual-review"],
  },
  {
    id: "cus-1004",
    name: "Emma Wright",
    email: "emma.wright@arcadia.co",
    phone: "+1-310-555-0180",
    tier: "Standard",
    createdAt: daysAgo(90),
    updatedAt: hoursAgo(29),
    tags: ["active"],
  },
  {
    id: "cus-1005",
    name: "Noah Kim",
    email: "noah.kim@sunwell.ai",
    phone: "+1-408-555-0122",
    tier: "Standard",
    createdAt: daysAgo(66),
    updatedAt: hoursAgo(20),
    tags: ["new"],
  },
  {
    id: "cus-1006",
    name: "Olivia Green",
    email: "olivia.green@pinecrest.tech",
    phone: "+1-617-555-0136",
    tier: "VIP",
    createdAt: daysAgo(420),
    updatedAt: hoursAgo(8),
    tags: ["vip", "escalation-contact"],
  },
  {
    id: "cus-1007",
    name: "Ethan Brown",
    email: "ethan.brown@ledgerlane.com",
    phone: "+1-202-555-0190",
    tier: "Standard",
    createdAt: daysAgo(54),
    updatedAt: hoursAgo(33),
    tags: ["chargeback-risk"],
  },
  {
    id: "cus-1008",
    name: "Ava Rodriguez",
    email: "ava.rodriguez@orbitplay.io",
    phone: "+1-323-555-0192",
    tier: "Standard",
    createdAt: daysAgo(188),
    updatedAt: hoursAgo(12),
    tags: ["active"],
  },
  {
    id: "cus-1009",
    name: "Lucas Hall",
    email: "lucas.hall@deltaops.org",
    phone: "+1-718-555-0111",
    tier: "VIP",
    createdAt: daysAgo(510),
    updatedAt: hoursAgo(3),
    tags: ["vip", "priority-support"],
  },
  {
    id: "cus-1010",
    name: "Mia Clark",
    email: "mia.clark@riverline.app",
    phone: "+1-469-555-0154",
    tier: "Standard",
    createdAt: daysAgo(32),
    updatedAt: hoursAgo(26),
    tags: ["onboarding"],
  },
  {
    id: "cus-1011",
    name: "James Scott",
    email: "james.scott@novaflow.net",
    phone: "+1-917-555-0164",
    tier: "Standard",
    createdAt: daysAgo(74),
    updatedAt: hoursAgo(17),
    tags: ["frequent-refunds"],
  },
  {
    id: "cus-1012",
    name: "Charlotte Adams",
    email: "charlotte.adams@bluepeak.io",
    phone: "+1-503-555-0103",
    tier: "VIP",
    createdAt: daysAgo(630),
    updatedAt: hoursAgo(1),
    tags: ["vip", "high-spend"],
  },
];

const orderStatuses = [
  "delivered",
  "delayed",
  "failed",
  "refund",
  "delivered",
  "delivered",
  "delayed",
  "failed",
  "delivered",
  "refund",
  "delivered",
  "delayed",
  "failed",
  "delivered",
  "delivered",
  "refund",
  "delivered",
  "delayed",
  "failed",
  "delivered",
] as const;

const orderAmounts = [
  148.5,
  420.0,
  56.2,
  89.9,
  271.4,
  115.0,
  730.3,
  220.1,
  64.8,
  399.0,
  180.7,
  940.0,
  52.4,
  310.2,
  127.6,
  280.0,
  73.5,
  512.2,
  88.4,
  205.9,
];

const orderTags: string[][] = [
  ["priority"],
  ["high-value", "delayed"],
  ["failed-auth"],
  ["refund"],
  ["vip"],
  ["standard"],
  ["supplier-latency"],
  ["fetch-failed"],
  ["standard"],
  ["manual-review"],
  ["priority"],
  ["high-value", "delayed"],
  ["validation-error"],
  ["standard"],
  ["stable"],
  ["refund"],
  ["standard"],
  ["delayed"],
  ["failed"],
  ["priority"],
];

export const orders: Order[] = Array.from({ length: 20 }).map((_, index) => {
  const customer = customers[index % customers.length];
  const supplier = suppliers[index % suppliers.length];

  return {
    id: `ord-${(index + 10001).toString()}`,
    orderNumber: `OB-${(index + 24831).toString()}`,
    customerName: customer.name,
    customerEmail: customer.email,
    supplierName: supplier.name,
    amount: orderAmounts[index],
    currency: "USD",
    status: orderStatuses[index],
    createdAt: hoursAgo(4 * (index + 1)),
    updatedAt: hoursAgo(index + 1),
    tags: orderTags[index],
  };
});

export function getOrderById(id: string) {
  return orders.find((order) => order.id === id) ?? null;
}

export function getCustomerById(id: string) {
  return customers.find((customer) => customer.id === id) ?? null;
}

export function getSupplierById(id: string) {
  return suppliers.find((supplier) => supplier.id === id) ?? null;
}
