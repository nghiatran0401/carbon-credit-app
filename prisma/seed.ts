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

  // Create sample notifications for testing
  const users = await prisma.user.findMany();
  const user1 = users.find((u) => u.email === "user1@gmail.com");
  const user2 = users.find((u) => u.email === "user2@gmail.com");

  if (user1 && user2) {
    // Create 5 different types of notifications for testing
    await Promise.all([
      // 1. Order notification - Order created
      prisma.notification.create({
        data: {
          userId: user1.id,
          type: "order",
          title: "Order Created Successfully",
          message: "Your order #1234 has been created and is pending payment. Total: $1,250.00",
          data: {
            orderId: 1234,
            event: "created",
            status: "pending",
            totalAmount: 1250.0,
          },
          read: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
      }),

      // 2. Payment notification - Payment succeeded
      prisma.notification.create({
        data: {
          userId: user1.id,
          type: "payment",
          title: "Payment Successful",
          message: "Payment for order #1234 has been processed successfully. Your carbon credits are now available.",
          data: {
            orderId: 1234,
            event: "payment_succeeded",
            status: "completed",
            amount: 1250.0,
          },
          read: true,
          readAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        },
      }),

      // 3. Credit notification - New credits available
      prisma.notification.create({
        data: {
          userId: user1.id,
          type: "credit",
          title: "New Carbon Credits Available",
          message: "New VCS certified credits from Can Gio Mangrove Forest are now available for purchase.",
          data: {
            creditId: credits[0]?.id || 1,
            forestName: "Can Gio Mangrove Forest",
            event: "new_credits",
            certification: "VCS",
            availableCredits: 5000,
          },
          read: false,
          createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        },
      }),

      // 4. System notification - Platform maintenance
      prisma.notification.create({
        data: {
          userId: user1.id,
          type: "system",
          title: "Scheduled Maintenance",
          message: "The platform will be undergoing maintenance on Sunday, 2:00-4:00 AM UTC. Some features may be temporarily unavailable.",
          data: {
            event: "maintenance",
            scheduledDate: "2024-01-28T02:00:00Z",
            duration: "2 hours",
          },
          read: false,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        },
      }),

      // 5. Order notification - Order completed with certificate
      prisma.notification.create({
        data: {
          userId: user1.id,
          type: "order",
          title: "Certificate Generated",
          message: "Your carbon credit certificate for order #1234 has been generated and is ready for download.",
          data: {
            orderId: 1234,
            event: "certificate_generated",
            status: "completed",
            certificateId: "cert_abc123",
          },
          read: false,
          createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        },
      }),

      // 6. Payment notification - Payment failed (for user2)
      prisma.notification.create({
        data: {
          userId: user2.id,
          type: "payment",
          title: "Payment Failed",
          message: "Payment for order #5678 failed. Please check your payment method and try again.",
          data: {
            orderId: 5678,
            event: "payment_failed",
            status: "failed",
            failureReason: "Insufficient funds",
          },
          read: false,
          createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        },
      }),

      // 7. Credit notification - Price change alert
      prisma.notification.create({
        data: {
          userId: user2.id,
          type: "credit",
          title: "Price Alert",
          message: "The price for Gold Standard credits from Xuan Thuy National Park has increased by 15%.",
          data: {
            creditId: credits[1]?.id || 2,
            forestName: "Xuan Thuy National Park",
            event: "price_change",
            oldPrice: 12.5,
            newPrice: 14.38,
            changePercent: 15,
          },
          read: true,
          readAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        },
      }),

      // 8. System notification - Welcome message
      prisma.notification.create({
        data: {
          userId: user2.id,
          type: "system",
          title: "Welcome to EcoCredit!",
          message: "Thank you for joining EcoCredit. Start exploring our carbon credit marketplace and make a positive impact on the environment.",
          data: {
            event: "welcome",
            userType: "new_user",
          },
          read: false,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
      }),

      // 9. Order notification - Order shipped
      prisma.notification.create({
        data: {
          userId: user1.id,
          type: "order",
          title: "Order Status Updated",
          message: "Your order #1234 has been processed and your carbon credits have been retired on your behalf.",
          data: {
            orderId: 1234,
            event: "credits_retired",
            status: "completed",
            retiredCredits: 100,
          },
          read: false,
          createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        },
      }),

      // 10. Credit notification - Limited availability
      prisma.notification.create({
        data: {
          userId: user2.id,
          type: "credit",
          title: "Limited Availability",
          message: "Only 50 VCS credits remaining from Cuc Phuong National Park. Don't miss out!",
          data: {
            creditId: credits[2]?.id || 3,
            forestName: "Cuc Phuong National Park",
            event: "low_stock",
            remainingCredits: 50,
            certification: "VCS",
          },
          read: false,
          createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        },
      }),
    ]);
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
