import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function hasExpectedDelegates(candidate: PrismaClient | undefined): candidate is PrismaClient {
  if (!candidate) {
    return false;
  }

  return "chatConversation" in candidate && "chatMessage" in candidate;
}

const prismaClient = hasExpectedDelegates(globalForPrisma.prisma)
  ? globalForPrisma.prisma
  : createPrismaClient();

export const prisma: PrismaClient = prismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
