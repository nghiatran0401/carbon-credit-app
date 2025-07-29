import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import { getConfig } from "./seed-config";

const prisma = new PrismaClient();

// Get configuration (default to LARGE preset)
const SEED_PRESET = (process.env.SEED_PRESET as "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE") || "LARGE";
const CONFIG = getConfig(SEED_PRESET);

// Forest types and locations for realistic data
const FOREST_TYPES = ["Mangrove", "Tropical Evergreen", "Deciduous", "Montane", "Wetland", "Dry Dipterocarp", "Mixed Forest", "Bamboo Forest", "Pine Forest"];

const VIETNAM_PROVINCES = [
  "Ho Chi Minh City",
  "Hanoi",
  "Da Nang",
  "Hai Phong",
  "Can Tho",
  "Bien Hoa",
  "Hue",
  "Nha Trang",
  "Buon Ma Thuot",
  "Vung Tau",
  "Qui Nhon",
  "Rach Gia",
  "Long Xuyen",
  "My Tho",
  "Bac Lieu",
  "Ca Mau",
  "Soc Trang",
  "Tra Vinh",
  "Ben Tre",
  "Tien Giang",
  "Vinh Long",
  "Dong Thap",
  "An Giang",
  "Kien Giang",
];

const CERTIFICATIONS = ["VCS", "Gold Standard", "CCB", "CAR", "ACR", "Plan Vivo"];

const ORDER_STATUSES = ["pending", "processing", "completed", "cancelled", "failed"];
const PAYMENT_STATUSES = ["pending", "succeeded", "failed", "canceled", "refunded"];
const NOTIFICATION_TYPES = ["order", "credit", "system", "payment"];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomArrayElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

async function createUsers() {
  console.log("👥 Creating users...");
  const users = [];

  // Create demo accounts first
  console.log("   Creating demo accounts...");
  const demoUsers = await Promise.all([
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

  users.push(...demoUsers);
  console.log("   ✅ Demo accounts created");

  // Create additional random users
  for (let i = 0; i < CONFIG.USERS; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash("password123", 10),
        firstName,
        lastName,
        company: Math.random() > 0.3 ? faker.company.name() : null,
        role: Math.random() > 0.9 ? "admin" : "user",
        emailVerified: Math.random() > 0.2,
        stripeCustomerId: `cus_${faker.string.alphanumeric(10)}`,
      },
    });
    users.push(user);

    if (i % 100 === 0) console.log(`   Created ${i + 1}/${CONFIG.USERS} additional users`);
  }

  return users;
}

async function createForests() {
  console.log("🌲 Creating forests...");
  const forests = [];

  for (let i = 0; i < CONFIG.FORESTS; i++) {
    const province = randomArrayElement(VIETNAM_PROVINCES);
    const district = faker.location.city();
    const forestType = randomArrayElement(FOREST_TYPES);

    const forest = await prisma.forest.create({
      data: {
        name: `${faker.location.street()} ${forestType}`,
        location: `${district}, ${province}`,
        type: forestType,
        area: randomFloat(50, 2000),
        description: faker.lorem.sentence(),
        status: Math.random() > 0.1 ? "Active" : "Monitoring",
        lastUpdated: randomDate(new Date("2020-01-01"), new Date()),
      },
    });
    forests.push(forest);

    if (i % 50 === 0) console.log(`   Created ${i + 1}/${CONFIG.FORESTS} forests`);
  }

  return forests;
}

async function createCarbonCredits(forests: any[]) {
  console.log("💚 Creating carbon credits...");
  const credits = [];

  for (const forest of forests) {
    for (let year = 2020; year <= 2027; year++) {
      for (let certIndex = 0; certIndex < 2; certIndex++) {
        const totalCredits = randomBetween(1000, 50000);
        const availableCredits = Math.floor(totalCredits * randomFloat(0.1, 1.0));

        const credit = await prisma.carbonCredit.create({
          data: {
            forestId: forest.id,
            vintage: year,
            certification: CERTIFICATIONS[certIndex % CERTIFICATIONS.length],
            totalCredits,
            availableCredits,
            pricePerCredit: randomFloat(5, 25),
            retiredCredits: totalCredits - availableCredits,
          },
        });
        credits.push(credit);
      }
    }
  }

  console.log(`   Created ${credits.length} carbon credits`);
  return credits;
}

async function createExchangeRates(credits: any[]) {
  console.log("💱 Creating exchange rates...");
  const rates = [];

  for (const credit of credits) {
    for (let i = 0; i < CONFIG.EXCHANGE_RATES_PER_CREDIT; i++) {
      const startDate = new Date(2020 + i, 0, 1);
      const endDate = new Date(2020 + i + 1, 0, 1);

      const rate = await prisma.exchangeRate.create({
        data: {
          carbonCreditId: credit.id,
          rate: randomFloat(1, 1.5),
          currency: "USD",
          effectiveFrom: startDate,
          effectiveTo: endDate,
        },
      });
      rates.push(rate);
    }
  }

  console.log(`   Created ${rates.length} exchange rates`);
  return rates;
}

async function createOrders(users: any[], credits: any[]) {
  console.log("📦 Creating orders...");
  const orders = [];

  for (let i = 0; i < CONFIG.ORDERS; i++) {
    const user = randomArrayElement(users);
    const status = randomArrayElement(ORDER_STATUSES);
    const createdAt = randomDate(new Date("2020-01-01"), new Date());

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status,
        totalPrice: 0, // Will be calculated after items
        totalCredits: 0,
        currency: "USD",
        totalUsd: 0,
        createdAt,
        paidAt: status === "completed" ? randomDate(createdAt, new Date()) : null,
        failureReason: status === "failed" ? faker.lorem.sentence() : null,
        stripeSessionId: status !== "pending" ? `cs_${faker.string.alphanumeric(20)}` : null,
      },
    });

    // Create order items
    const numItems = randomBetween(1, 5);
    let totalPrice = 0;
    let totalCredits = 0;

    for (let j = 0; j < numItems; j++) {
      const credit = randomArrayElement(credits);
      const quantity = randomBetween(10, 500);
      const pricePerCredit = credit.pricePerCredit;
      const subtotal = quantity * pricePerCredit;

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          carbonCreditId: credit.id,
          quantity,
          pricePerCredit,
          subtotal,
          usdAmount: subtotal,
          retired: status === "completed",
        },
      });

      totalPrice += subtotal;
      totalCredits += quantity;
    }

    // Update order totals
    await prisma.order.update({
      where: { id: order.id },
      data: {
        totalPrice,
        totalCredits,
        totalUsd: totalPrice,
      },
    });

    orders.push(order);

    if (i % 500 === 0) console.log(`   Created ${i + 1}/${CONFIG.ORDERS} orders`);
  }

  return orders;
}

async function createPayments(orders: any[]) {
  console.log("💳 Creating payments...");
  const payments = [];

  for (const order of orders) {
    if (order.status !== "pending") {
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          stripeSessionId: order.stripeSessionId,
          stripePaymentIntentId: `pi_${faker.string.alphanumeric(20)}`,
          amount: order.totalPrice,
          currency: "USD",
          status: order.status === "completed" ? "succeeded" : order.status === "failed" ? "failed" : "pending",
          failureReason: order.failureReason,
          method: "card",
          createdAt: order.createdAt,
          updatedAt: order.paidAt || order.createdAt,
        },
      });
      payments.push(payment);
    }
  }

  console.log(`   Created ${payments.length} payments`);
  return payments;
}

async function createOrderHistory(orders: any[]) {
  console.log("📋 Creating order history...");
  const history = [];

  for (const order of orders) {
    const events = ["created"];
    if (order.status !== "pending") events.push("processing");
    if (order.status === "completed") events.push("paid");
    if (order.status === "failed") events.push("failed");
    if (order.status === "cancelled") events.push("cancelled");

    for (const event of events) {
      const historyEntry = await prisma.orderHistory.create({
        data: {
          orderId: order.id,
          event,
          message: faker.lorem.words(8),
          createdAt: randomDate(order.createdAt, new Date()),
        },
      });
      history.push(historyEntry);
    }
  }

  console.log(`   Created ${history.length} order history entries`);
  return history;
}

async function createNotifications(users: any[], orders: any[], credits: any[]) {
  console.log("🔔 Creating notifications...");
  const notifications = [];

  for (const user of users) {
    for (let i = 0; i < CONFIG.NOTIFICATIONS_PER_USER; i++) {
      const type = randomArrayElement(NOTIFICATION_TYPES);
      const createdAt = randomDate(new Date("2020-01-01"), new Date());

      let title, message, data;

      switch (type) {
        case "order":
          const order = randomArrayElement(orders);
          title = "Order Status Updated";
          message = `Your order #${order.id} has been ${order.status}`;
          data = { orderId: order.id, status: order.status };
          break;
        case "credit":
          const credit = randomArrayElement(credits);
          title = "New Credits Available";
          message = `New ${credit.certification} credits from ${credit.forest?.name} are available`;
          data = { creditId: credit.id, certification: credit.certification };
          break;
        case "payment":
          title = "Payment Processed";
          message = "Your payment has been processed successfully";
          data = { status: "succeeded" };
          break;
        case "system":
          title = "System Update";
          message = faker.lorem.words(10);
          data = { event: "system_update" };
          break;
      }

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type,
          title: title || "",
          message: message || "",
          data,
          read: Math.random() > 0.3,
          readAt: Math.random() > 0.3 ? randomDate(createdAt, new Date()) : null,
          createdAt,
        },
      });
      notifications.push(notification);
    }
  }

  console.log(`   Created ${notifications.length} notifications`);
  return notifications;
}

async function createBookmarks(users: any[], forests: any[]) {
  console.log("🔖 Creating bookmarks...");
  const bookmarks = [];

  for (const user of users) {
    const userForests = faker.helpers.arrayElements(forests, CONFIG.BOOKMARKS_PER_USER);

    for (const forest of userForests) {
      const bookmark = await prisma.bookmark.create({
        data: {
          userId: user.id,
          forestId: forest.id,
          createdAt: randomDate(new Date("2020-01-01"), new Date()),
        },
      });
      bookmarks.push(bookmark);
    }
  }

  console.log(`   Created ${bookmarks.length} bookmarks`);
  return bookmarks;
}

async function createCartItems(users: any[], credits: any[]) {
  console.log("🛒 Creating cart items...");
  const cartItems = [];

  for (const user of users) {
    const userCredits = faker.helpers.arrayElements(credits, CONFIG.CART_ITEMS_PER_USER);

    for (const credit of userCredits) {
      const cartItem = await prisma.cartItem.create({
        data: {
          userId: user.id,
          carbonCreditId: credit.id,
          quantity: randomBetween(1, 100),
          createdAt: randomDate(new Date("2020-01-01"), new Date()),
          updatedAt: new Date(),
          addedAt: new Date(),
        },
      });
      cartItems.push(cartItem);
    }
  }

  console.log(`   Created ${cartItems.length} cart items`);
  return cartItems;
}

async function createCertificates(orders: any[]) {
  console.log("📜 Creating certificates...");
  const certificates = [];

  for (const order of orders) {
    if (order.status === "completed") {
      const certificate = await prisma.certificate.create({
        data: {
          orderId: order.id,
          certificateHash: faker.string.alphanumeric(32),
          issuedAt: order.paidAt || order.createdAt,
          status: "active",
          metadata: {
            totalCredits: order.totalCredits,
            totalValue: order.totalPrice,
            issuedDate: order.paidAt || order.createdAt,
          },
        },
      });
      certificates.push(certificate);
    }
  }

  console.log(`   Created ${certificates.length} certificates`);
  return certificates;
}

async function main() {
  console.log("🚀 Starting large-scale data seeding...");
  console.log("Configuration:", CONFIG);

  try {
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log("🧹 Clearing existing data...");
    await prisma.$transaction([
      prisma.certificate.deleteMany(),
      prisma.orderHistory.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.cartItem.deleteMany(),
      prisma.bookmark.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.exchangeRate.deleteMany(),
      prisma.carbonCredit.deleteMany(),
      prisma.forest.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    // Create data in order of dependencies
    const users = await createUsers();
    const forests = await createForests();
    const credits = await createCarbonCredits(forests);
    const exchangeRates = await createExchangeRates(credits);
    const orders = await createOrders(users, credits);
    const payments = await createPayments(orders);
    const orderHistory = await createOrderHistory(orders);
    const notifications = await createNotifications(users, orders, credits);
    const bookmarks = await createBookmarks(users, forests);
    const cartItems = await createCartItems(users, credits);
    const certificates = await createCertificates(orders);

    console.log("\n✅ Large-scale seeding completed successfully!");
    console.log("\n📊 Data Summary:");
    console.log(`   Users: ${users.length}`);
    console.log(`   Forests: ${forests.length}`);
    console.log(`   Carbon Credits: ${credits.length}`);
    console.log(`   Exchange Rates: ${exchangeRates.length}`);
    console.log(`   Orders: ${orders.length}`);
    console.log(`   Payments: ${payments.length}`);
    console.log(`   Order History: ${orderHistory.length}`);
    console.log(`   Notifications: ${notifications.length}`);
    console.log(`   Bookmarks: ${bookmarks.length}`);
    console.log(`   Cart Items: ${cartItems.length}`);
    console.log(`   Certificates: ${certificates.length}`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
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
