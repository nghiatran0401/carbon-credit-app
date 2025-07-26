import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  // Create users
  await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@gmail.com",
        passwordHash: await bcrypt.hash("cos20031", 10),
        firstName: "Admin",
        lastName: "User",
        company: null,
        role: "admin",
        emailVerified: true,
        stripeCustomerId: "cus_admin_001",
      },
    }),
    prisma.user.create({
      data: {
        email: "user1@gmail.com",
        passwordHash: await bcrypt.hash("cos20031", 10),
        firstName: "Alice",
        lastName: "Nguyen",
        company: "GreenTech",
        role: "user",
        emailVerified: true,
        stripeCustomerId: "cus_user1_001",
      },
    }),
    prisma.user.create({
      data: {
        email: "user2@gmail.com",
        passwordHash: await bcrypt.hash("cos20031", 10),
        firstName: "Bob",
        lastName: "Tran",
        company: "EcoWorks",
        role: "user",
        emailVerified: false,
        stripeCustomerId: "cus_user2_001",
      },
    }),
  ]);

  // Create forests
  const forests = await Promise.all([
    prisma.forest.create({
      data: {
        name: "Can Gio Mangrove Forest",
        location: "Can Gio District, Ho Chi Minh City",
        type: "Mangrove",
        area: 850,
        description: "Primary mangrove conservation area with high biodiversity.",
        status: "Active",
        lastUpdated: new Date("2024-01-15"),
      },
    }),
    prisma.forest.create({
      data: {
        name: "Xuan Thuy National Park",
        location: "Giao Thuy District, Nam Dinh Province",
        type: "Wetland",
        area: 750,
        description: "Vietnam's first Ramsar site, important for migratory birds.",
        status: "Active",
        lastUpdated: new Date("2024-01-12"),
      },
    }),
    prisma.forest.create({
      data: {
        name: "Cuc Phuong National Park",
        location: "Nho Quan District, Ninh Binh Province",
        type: "Tropical Evergreen",
        area: 222,
        description: "Vietnam's oldest national park, rich in flora and fauna.",
        status: "Monitoring",
        lastUpdated: new Date("2024-01-10"),
      },
    }),
    prisma.forest.create({
      data: {
        name: "Bach Ma National Park",
        location: "Phu Loc District, Thua Thien Hue Province",
        type: "Tropical Montane",
        area: 370,
        description: "Mountainous park with cloud forests and waterfalls.",
        status: "Active",
        lastUpdated: new Date("2024-01-09"),
      },
    }),
    prisma.forest.create({
      data: {
        name: "Yok Don National Park",
        location: "Buon Don District, Dak Lak Province",
        type: "Dry Dipterocarp",
        area: 1155,
        description: "Largest national park in Vietnam, home to elephants and rare birds.",
        status: "Active",
        lastUpdated: new Date("2024-01-08"),
      },
    }),
  ]);

  // Create carbon credits for each forest
  const credits = [];
  for (const forest of forests) {
    for (let year = 2023; year <= 2026; year++) {
      let totalCredits = 1000 + randomBetween(0, 5000);
      let availableCredits;
      // Randomly assign status for each credit
      const statusType = randomBetween(1, 3);
      if (statusType === 1) {
        availableCredits = totalCredits; // Fully available
      } else if (statusType === 2) {
        availableCredits = Math.floor((totalCredits * randomBetween(10, 80)) / 100); // Partially available (10-80%)
      } else {
        availableCredits = 0; // Sold out
      }
      const credit = await prisma.carbonCredit.create({
        data: {
          forestId: forest.id,
          vintage: year,
          certification: ["VCS", "Gold Standard", "CCB"][year % 3],
          totalCredits,
          availableCredits,
          pricePerCredit: randomBetween(5, 15),
        },
      });
      credits.push(credit);
    }
  }

  // Create exchange rates for each carbon credit (simulate rate changes over time)
  const exchangeRates: any = [];
  for (const credit of credits) {
    // 3 rates: 2023-01-01, 2023-07-01, 2024-01-01
    const rate1 = await prisma.exchangeRate.create({
      data: {
        carbonCreditId: credit.id,
        rate: randomBetween(5, 10) + Math.random(),
        currency: "USD",
        effectiveFrom: new Date("2023-01-01"),
        effectiveTo: new Date("2023-12-31"),
      },
    });
    const rate2 = await prisma.exchangeRate.create({
      data: {
        carbonCreditId: credit.id,
        rate: randomBetween(8, 15) + Math.random(),
        currency: "USD",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: new Date("2024-12-31"),
      },
    });
    const rate3 = await prisma.exchangeRate.create({
      data: {
        carbonCreditId: credit.id,
        rate: randomBetween(10, 20) + Math.random(),
        currency: "USD",
        effectiveFrom: new Date("2025-01-01"),
        effectiveTo: new Date("2025-12-31"),
      },
    });
    exchangeRates.push(rate1, rate2, rate3);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
