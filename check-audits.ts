import { orderAuditService } from './src/lib/order-audit-service';

(async () => {
  try {
    const audits = await orderAuditService.getAllOrderAudits();
    console.log(`Found ${audits.length} audit records:`);
    audits.forEach((audit, i) => {
      console.log(`${i+1}. Order ${audit.orderId}: ${audit.hash.substring(0,20)}... (${new Date(audit.timestamp).toLocaleString()})`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
})();