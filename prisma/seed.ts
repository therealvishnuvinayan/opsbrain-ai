import { prisma } from "../src/lib/prisma";

async function main() {
  console.info("No seed data configured.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
