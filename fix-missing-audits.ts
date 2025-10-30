import { PrismaClient } from '@prisma/client';
import { orderAuditService } from './src/lib/order-audit-service';

const prisma = new PrismaClient();

async function fixMissingAudits() {
  console.log('🔧 Fixing missing audit records...\n');

  try {
    // Get all completed orders
    const completedOrders = await prisma.order.findMany({
      where: {
        status: 'Completed',
        paidAt: { not: null }
      },
      orderBy: { id: 'desc' }
    });

    console.log(`Found ${completedOrders.length} completed orders that should have audit records:\n`);

    // Check each order and create missing audit records
    for (const order of completedOrders) {
      console.log(`Checking Order ${order.id}...`);
      
      try {
        // Try to verify if audit record exists
        const verification = await orderAuditService.verifyOrderIntegrity(order.id, {
          orderId: order.id,
          totalCredits: order.totalCredits,
          totalPrice: order.totalPrice,
          paidAt: order.paidAt!,
          buyer: (order as any).buyer,
          seller: (order as any).seller
        });

        if (!verification.storedHash) {
          console.log(`  ❌ Missing audit record for Order ${order.id} - Creating now...`);
          
          // Create the missing audit record
          await orderAuditService.storeOrderAudit({
            orderId: order.id,
            totalCredits: order.totalCredits,
            totalPrice: order.totalPrice,
            paidAt: order.paidAt!,
            buyer: (order as any).buyer,
            seller: (order as any).seller
          });
          
          console.log(`  ✅ Audit record created for Order ${order.id}`);
        } else {
          console.log(`  ✅ Audit record exists for Order ${order.id}`);
        }
      } catch (error: any) {
        console.log(`  ❌ Error processing Order ${order.id}: ${error.message}`);
        
        // If verification fails, try to create the audit record anyway
        try {
          await orderAuditService.storeOrderAudit({
            orderId: order.id,
            totalCredits: order.totalCredits,
            totalPrice: order.totalPrice,
            paidAt: order.paidAt!
          });
          console.log(`  ✅ Audit record created for Order ${order.id} (after error)`);
        } catch (storeError: any) {
          console.log(`  ❌ Failed to create audit for Order ${order.id}: ${storeError.message}`);
        }
      }
      console.log('');
    }

    // Show final audit records
    console.log('\n📊 Final Audit Records in ImmuDB:');
    const allAudits = await orderAuditService.getAllOrderAudits();
    console.log(`Found ${allAudits.length} audit records:`);
    
    allAudits.forEach((audit, index) => {
      console.log(`${index + 1}. Order ${audit.orderId}: ${audit.hash.substring(0, 20)}... (${new Date(audit.timestamp).toLocaleString()})`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingAudits();