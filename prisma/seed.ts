import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  // Clean up all tables in correct order
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.exchangeRate.deleteMany();
  await prisma.carbonCredit.deleteMany();
  await prisma.forest.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const users = [];
  users.push(
    await prisma.user.create({
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
    })
  );
  users.push(
    await prisma.user.create({
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
    })
  );
  users.push(
    await prisma.user.create({
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
    })
  );
  users.push(
    await prisma.user.create({
      data: {
        email: "climatehero@gmail.com",
        passwordHash: await bcrypt.hash("climatehero", 10),
        firstName: "Climate",
        lastName: "Hero",
        company: "EarthGuardians",
        role: "user",
        emailVerified: true,
        stripeCustomerId: "cus_climatehero_001",
      },
    })
  );

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
    for (let year = 2021; year <= 2024; year++) {
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
        effectiveTo: new Date("2023-06-30"),
      },
    });
    const rate2 = await prisma.exchangeRate.create({
      data: {
        carbonCreditId: credit.id,
        rate: randomBetween(8, 15) + Math.random(),
        currency: "USD",
        effectiveFrom: new Date("2023-07-01"),
        effectiveTo: new Date("2023-12-31"),
      },
    });
    const rate3 = await prisma.exchangeRate.create({
      data: {
        carbonCreditId: credit.id,
        rate: randomBetween(10, 20) + Math.random(),
        currency: "USD",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      },
    });
    exchangeRates.push(rate1, rate2, rate3);
  }

  // Seed bookmarks for users
  for (const user of users) {
    const shuffled = forests.slice().sort(() => 0.5 - Math.random());
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      await prisma.bookmark.create({
        data: {
          userId: user.id,
          forestId: shuffled[i].id,
        },
      });
    }
  }

  // Seed cart items for each user (1-3 items per user)
  for (const user of users) {
    const usedCreditIds = new Set();
    const numItems = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numItems; i++) {
      let credit;
      do {
        credit = credits[Math.floor(Math.random() * credits.length)];
      } while (usedCreditIds.has(credit.id));
      usedCreditIds.add(credit.id);
      await prisma.cartItem.create({
        data: {
          userId: user.id,
          carbonCreditId: credit.id,
          quantity: 1 + Math.floor(Math.random() * 10),
        },
      });
    }
  }

  // Helper to get the exchange rate for a credit at a given date
  function getExchangeRateForDate(creditId: number, date: Date) {
    // Find all rates for this credit
    const rates = exchangeRates.filter((r: any) => r.carbonCreditId === creditId);
    // Find the rate where effectiveFrom <= date && (effectiveTo is null or date <= effectiveTo)
    return rates.find((r: any) => r.effectiveFrom <= date && (!r.effectiveTo || date <= r.effectiveTo));
  }

  // Create orders for users
  const years = [2023, 2024];
  for (const user of users) {
    for (const year of years) {
      for (let month = 0; month < 3; month++) {
        // Fewer orders for demo
        // Create 1-2 orders per month
        const numOrders = 1 + Math.floor(Math.random() * 2);
        for (let o = 0; o < numOrders; o++) {
          const orderDate = new Date(year, month, 1 + Math.floor(Math.random() * 28));
          const order = await prisma.order.create({
            data: {
              userId: user.id,
              status: ["Pending", "Completed", "Cancelled"][Math.floor(Math.random() * 3)],
              totalPrice: 0, // will update after items
              totalCredits: 0,
              totalUsd: 0,
              currency: "USD",
              createdAt: orderDate,
            },
          });
          let total = 0;
          let totalCredits = 0;
          let totalUsd = 0;
          // Add 2-3 items per order
          for (let j = 0; j < 2 + Math.floor(Math.random() * 2); j++) {
            const credit = credits[Math.floor(Math.random() * credits.length)];
            const quantity = 10 + Math.floor(Math.random() * 50);
            const price = credit.pricePerCredit;
            const subtotal = quantity * price;
            const rate = getExchangeRateForDate(credit.id, orderDate);
            const usdAmount = quantity * (rate ? rate.rate : price);
            await prisma.orderItem.create({
              data: {
                orderId: order.id,
                carbonCreditId: credit.id,
                quantity,
                pricePerCredit: price,
                subtotal,
                usdAmount,
                exchangeRateId: rate ? rate.id : null,
              },
            });
            total += subtotal;
            totalCredits += quantity;
            totalUsd += usdAmount;
          }
          await prisma.order.update({
            where: { id: order.id },
            data: { totalPrice: total, totalCredits, totalUsd },
          });
        }
      }
    }
  }

  // Seed a paid order with Stripe paymentIntentId and paidAt
  const paidOrder = await prisma.order.create({
    data: {
      userId: users[1].id,
      status: "Completed",
      totalPrice: 0,
      totalCredits: 0,
      totalUsd: 0,
      currency: "USD",
      paymentIntentId: "pi_test_12345",
      paidAt: new Date(),
      createdAt: new Date(),
      shippingAddress: "123 Green Lane, Eco City, Vietnam",
    },
  });
  let paidTotal = 0;
  let paidCredits = 0;
  let paidUsd = 0;
  for (let i = 0; i < 2; i++) {
    const credit = credits[Math.floor(Math.random() * credits.length)];
    const quantity = 5 + Math.floor(Math.random() * 10);
    const price = credit.pricePerCredit;
    const subtotal = quantity * price;
    const rate = getExchangeRateForDate(credit.id, new Date());
    const usdAmount = quantity * (rate ? rate.rate : price);
    await prisma.orderItem.create({
      data: {
        orderId: paidOrder.id,
        carbonCreditId: credit.id,
        quantity,
        pricePerCredit: price,
        subtotal,
        usdAmount,
        exchangeRateId: rate ? rate.id : null,
        retired: i === 0, // Mark one item as retired
      },
    });
    paidTotal += subtotal;
    paidCredits += quantity;
    paidUsd += usdAmount;
  }
  await prisma.order.update({
    where: { id: paidOrder.id },
    data: { totalPrice: paidTotal, totalCredits: paidCredits, totalUsd: paidUsd },
  });

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
