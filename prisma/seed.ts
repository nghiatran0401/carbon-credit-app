import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clean up all tables in correct order
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
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
      },
    })
  );
  users.push(
    await prisma.user.create({
      data: {
        email: "user1@gmail.com",
        passwordHash: await bcrypt.hash("cos20031", 10),
        firstName: "User",
        lastName: "One",
        company: null,
        role: "user",
      },
    })
  );
  users.push(
    await prisma.user.create({
      data: {
        email: "user2@gmail.com",
        passwordHash: await bcrypt.hash("cos20031", 10),
        firstName: "User",
        lastName: "Two",
        company: null,
        role: "user",
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
    ...Array.from({ length: 10 }).map((_, i) =>
      prisma.forest.create({
        data: {
          name: `Test Forest ${i + 1}`,
          location: `Test Location ${i + 1}`,
          type: ["Mangrove", "Wetland", "Tropical", "Pine", "Mountain"][i % 5],
          area: 100 + i * 10,
          description: `Test forest description ${i + 1}`,
          status: i % 2 === 0 ? "Active" : "Monitoring",
          lastUpdated: new Date(`2024-01-${10 + i}`),
        },
      })
    ),
  ]);

  // Create carbon credits for each forest
  const credits = [];
  for (const forest of forests) {
    for (let year = 2021; year <= 2024; year++) {
      const credit = await prisma.carbonCredit.create({
        data: {
          forestId: forest.id,
          vintage: year,
          certification: ["VCS", "Gold Standard", "CCB"][year % 3],
          totalCredits: 1000 + Math.floor(Math.random() * 5000),
          availableCredits: 500 + Math.floor(Math.random() * 2000),
          pricePerCredit: 2.5 + Math.random() * 2,
        },
      });
      credits.push(credit);
    }
  }

  // Create orders for users
  const years = [2023, 2024, 2025];
  for (const user of users) {
    for (const year of years) {
      for (let month = 0; month < 12; month++) {
        // Create 1-2 orders per month
        const numOrders = 1 + Math.floor(Math.random() * 2);
        for (let o = 0; o < numOrders; o++) {
          const orderDate = new Date(year, month, 1 + Math.floor(Math.random() * 28));
          const order = await prisma.order.create({
            data: {
              userId: user.id,
              status: ["Pending", "Completed", "Cancelled"][Math.floor(Math.random() * 3)],
              totalPrice: 0, // will update after items
              createdAt: orderDate,
            },
          });
          let total = 0;
          // Add 2-4 items per order
          for (let j = 0; j < 2 + Math.floor(Math.random() * 3); j++) {
            const credit = credits[Math.floor(Math.random() * credits.length)];
            const quantity = 10 + Math.floor(Math.random() * 50);
            const price = credit.pricePerCredit;
            const subtotal = quantity * price;
            await prisma.orderItem.create({
              data: {
                orderId: order.id,
                carbonCreditId: credit.id,
                quantity,
                pricePerCredit: price,
                subtotal,
              },
            });
            total += subtotal;
          }
          await prisma.order.update({
            where: { id: order.id },
            data: { totalPrice: total },
          });
        }
      }
    }
  }

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
