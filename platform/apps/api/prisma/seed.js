const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Fixed, well-known id so the frontend can book as this user without a
// login flow — there is no auth system yet (see ARCHITECTURE.md).
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    create: {
      id: DEMO_USER_ID,
      email: "demo@aeros.example",
      firstName: "Alexandra",
      lastName: "Reyes",
      role: "traveler",
    },
    update: {},
  });

  console.log(`Seeded demo user ${DEMO_USER_ID}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
