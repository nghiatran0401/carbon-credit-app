import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrders() {
  console.log('📋 Checking all orders in the database...\n');

  try {
    // Get all orders with their details
    const allOrders = await prisma.order.findMany({
      orderBy: { id: 'desc' },
      include: {
        user: { select: { email: true } },
        payments: true
      }
    });

    console.log(`Found ${allOrders.length} total orders:\n`);

    allOrders.forEach(order => {
      console.log(`Order ${order.id}:`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Total Credits: ${order.totalCredits}`);
      console.log(`  Total Price: $${order.totalPrice}`);
      console.log(`  Created: ${order.createdAt}`);
      console.log(`  Paid At: ${order.paidAt || 'Not paid'}`);
      console.log(`  User: ${order.user?.email || 'Unknown'}`);
      
      if (order.payments.length > 0) {
        console.log(`  Payments:`);
        order.payments.forEach(payment => {
          console.log(`    - Status: ${payment.status}, Amount: $${payment.amount}`);
        });
      }
      console.log('');
    });

    // Show completed orders specifically
    const completedOrders = allOrders.filter(order => 
      order.status === 'Completed' && order.paidAt !== null
    );

    console.log(`\n🟢 Completed orders that should have audit records: ${completedOrders.length}`);
    completedOrders.forEach(order => {
      console.log(`  Order ${order.id}: Paid at ${order.paidAt}`);
    });

    // Show pending/other orders
    const nonCompletedOrders = allOrders.filter(order => 
      order.status !== 'Completed' || order.paidAt === null
    );

    console.log(`\n🟡 Non-completed orders: ${nonCompletedOrders.length}`);
    nonCompletedOrders.forEach(order => {
      console.log(`  Order ${order.id}: Status ${order.status}, Paid: ${order.paidAt ? 'Yes' : 'No'}`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrders();