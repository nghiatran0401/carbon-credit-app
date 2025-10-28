import { PrismaClient } from '@prisma/client';
import { orderAuditService } from './src/lib/order-audit-service';

const prisma = new PrismaClient();

async function testOrderAudit() {
  console.log('🔍 Testing Order Audit System...\n');

  try {
    // Find completed orders
    const completedOrders = await prisma.order.findMany({
      where: {
        status: 'Completed',
        paidAt: { not: null }
      },
      orderBy: { id: 'desc' },
      take: 5
    });

    console.log(`Found ${completedOrders.length} completed orders`);

    if (completedOrders.length === 0) {
      console.log('No completed orders found. Creating a test audit record...\n');
      
      // Create a test audit record
      const testOrder = {
        orderId: 9999,
        totalCredits: 100,
        totalPrice: 250.50,
        paidAt: new Date()
      };

      console.log('Test order data:', testOrder);

      // Store audit
      await orderAuditService.storeOrderAudit(testOrder);
      console.log('✅ Test audit record stored successfully\n');

      // Verify the test record
      const verification = await orderAuditService.verifyOrderIntegrity(testOrder.orderId, testOrder);
      console.log('Verification result:', verification);

    } else {
      console.log('\n📋 Processing existing completed orders:\n');

      for (const order of completedOrders) {
        console.log(`Order ${order.id}:`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Total Credits: ${order.totalCredits}`);
        console.log(`  Total Price: $${order.totalPrice}`);
        console.log(`  Paid At: ${order.paidAt}`);

        try {
          // Try to store audit for this order
          await orderAuditService.storeOrderAudit({
            orderId: order.id,
            totalCredits: order.totalCredits,
            totalPrice: order.totalPrice,
            paidAt: order.paidAt!
          });
          console.log(`  ✅ Audit stored for order ${order.id}`);

          // Verify integrity
          const verification = await orderAuditService.verifyOrderIntegrity(order.id, {
            orderId: order.id,
            totalCredits: order.totalCredits,
            totalPrice: order.totalPrice,
            paidAt: order.paidAt!
          });
          console.log(`  🔐 Verification: ${verification.isValid ? 'VALID' : 'INVALID'}`);

        } catch (error: any) {
          console.log(`  ❌ Error processing order ${order.id}: ${error.message}`);
        }
        console.log('');
      }
    }

    // Show all audit records
    console.log('\n📊 All Audit Records in ImmuDB:');
    const allAudits = await orderAuditService.getAllOrderAudits();
    console.log(`Found ${allAudits.length} audit records:`);
    
    allAudits.forEach((audit, index) => {
      console.log(`${index + 1}. Order ${audit.orderId}: ${audit.hash.substring(0, 20)}...`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testOrderAudit();