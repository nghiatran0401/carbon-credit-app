import { PrismaClient } from '@prisma/client';
import { orderAuditService } from './src/lib/order-audit-service';

const prisma = new PrismaClient();

async function testWebhookIntegration() {
  console.log('🧪 Testing Webhook Integration...\n');

  try {
    // Find a pending order
    const pendingOrder = await prisma.order.findFirst({
      where: {
        status: 'Pending',
        paidAt: null
      },
      include: {
        items: {
          include: {
            carbonCredit: true,
          },
        },
        payments: true
      }
    });

    if (!pendingOrder) {
      console.log('No pending orders found. Creating a test order...');
      
      // Create a test order
      const testOrder = await prisma.order.create({
        data: {
          userId: 1, // Assuming user ID 1 exists
          status: 'Pending',
          totalPrice: 15.00,
          items: {
            create: [
              {
                carbonCreditId: 1, // Assuming credit ID 1 exists
                quantity: 3,
                pricePerCredit: 5.00,
                subtotal: 15.00
              }
            ]
          }
        },
        include: {
          items: {
            include: {
              carbonCredit: true,
            },
          },
          payments: true
        }
      });

      // Create a payment for this order
      await prisma.payment.create({
        data: {
          orderId: testOrder.id,
          amount: 15.00,
          currency: 'USD',
          status: 'pending',
          stripeSessionId: `test_session_${Date.now()}`
        }
      });

      console.log(`✅ Created test order ${testOrder.id} with payment`);
      
      // Now simulate the webhook completion
      console.log('\n🔄 Simulating webhook completion...');
      
      // Mark order as completed (simulating what webhook does)
      const completedOrder = await prisma.order.update({
        where: { id: testOrder.id },
        data: {
          status: 'Completed',
          paidAt: new Date(),
        },
        include: {
          items: {
            include: {
              carbonCredit: true,
            },
          },
        },
      });

      // Calculate total credits
      const totalCredits = completedOrder.items.reduce((sum, item) => sum + item.quantity, 0);

      console.log(`Order ${completedOrder.id}: ${totalCredits} credits, $${completedOrder.totalPrice}`);

      // Store audit trail (simulating webhook)
      try {
        const auditData = {
          orderId: completedOrder.id,
          totalCredits: totalCredits,
          totalPrice: completedOrder.totalPrice,
          paidAt: completedOrder.paidAt!
        };
        
        console.log('Storing audit data:', auditData);
        await orderAuditService.storeOrderAudit(auditData);
        console.log(`✅ Audit trail stored successfully for order ${completedOrder.id}`);
        
        // Verify the audit
        const verification = await orderAuditService.verifyOrderIntegrity(completedOrder.id, auditData);
        console.log(`🔐 Verification result: ${verification.isValid ? 'VALID' : 'INVALID'}`);
        
      } catch (error: any) {
        console.error(`❌ Error storing audit:`, error.message);
      }

    } else {
      console.log(`Found pending order ${pendingOrder.id}, simulating completion...`);
      
      // Complete the pending order
      const completedOrder = await prisma.order.update({
        where: { id: pendingOrder.id },
        data: {
          status: 'Completed',
          paidAt: new Date(),
        },
        include: {
          items: {
            include: {
              carbonCredit: true,
            },
          },
        },
      });

      const totalCredits = completedOrder.items.reduce((sum, item) => sum + item.quantity, 0);

      try {
        await orderAuditService.storeOrderAudit({
          orderId: completedOrder.id,
          totalCredits: totalCredits,
          totalPrice: completedOrder.totalPrice,
          paidAt: completedOrder.paidAt!
        });
        console.log(`✅ Audit trail stored for order ${completedOrder.id}`);
      } catch (error: any) {
        console.error(`❌ Error storing audit:`, error.message);
      }
    }

  } catch (error: any) {
    console.error('Test error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testWebhookIntegration();