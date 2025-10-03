# Mock Payment System Documentation

This documentation explains the mock payment system that bypasses Stripe and directly invokes the smart contract for testing purposes.

## Overview

The mock payment system provides an alternative checkout flow that:
1. **Bypasses Stripe payment processing**
2. **Immediately marks orders as completed**
3. **Directly invokes the smart contract to transfer carbon tokens**
4. **Generates certificates and notifications**
5. **Provides instant feedback for testing**

## API Endpoints

### Mock Checkout
- **Endpoint**: `POST /api/checkout/mock`
- **Purpose**: Process a mock payment and complete the order immediately

#### Request Body
```json
{
  "userId": 1,
  "cartItems": [
    {
      "carbonCreditId": 1,
      "quantity": 10,
      "carbonCredit": {
        "pricePerCredit": 25.50,
        "forest": {
          "name": "Amazon Rainforest Conservation"
        }
      }
    }
  ]
}
```

#### Response
```json
{
  "success": true,
  "orderId": 123,
  "paymentId": 456,
  "blockchainTxHash": "0x1234...abcd",
  "message": "Mock payment completed successfully",
  "redirectUrl": "/success?mock_order_id=123"
}
```

### Session Lookup (Enhanced)
- **Endpoint**: `GET /api/checkout/session`
- **Purpose**: Retrieve order details for both Stripe and mock payments

#### Parameters
- `session_id` (for Stripe payments)
- `mock_order_id` (for mock payments)

## Frontend Integration

### Cart Page Changes

The cart page now includes two checkout options:

1. **Stripe Checkout** (original)
   ```tsx
   <Button onClick={handleCheckout}>
     Checkout with Stripe
   </Button>
   ```

2. **Mock Payment** (new)
   ```tsx
   <Button onClick={handleMockCheckout}>
     Mock Payment (Test)
   </Button>
   ```

### Success Page Changes

The success page now handles both payment types:
- Detects mock payments via `mock_order_id` parameter
- Shows "Mock Payment" badge for test transactions
- Displays appropriate messaging for mock vs. real payments

## Workflow Comparison

### Original Stripe Flow
```
Cart → Stripe Checkout → Stripe Payment → Webhook → Order Completion → Smart Contract (if configured)
```

### New Mock Flow
```
Cart → Mock Checkout → Immediate Order Completion → Smart Contract Invocation → Success Page
```

## Database Records

### Order Record
```sql
-- Mock payments create orders with:
status = 'Completed'
paidAt = current_timestamp
```

### Payment Record
```sql
-- Mock payments create payment records with:
status = 'succeeded'
method = 'mock'
stripeSessionId = 'mock_{orderId}_{timestamp}'
```

### Order History
Mock payments create multiple history entries:
1. **created**: Order created with mock payment
2. **paid**: Order paid via mock payment system
3. **blockchain_transfer**: Carbon tokens transferred (if successful)
4. **blockchain_failed**: Blockchain transfer failed (if error)

## Smart Contract Integration

The mock payment system immediately calls the blockchain service:

```typescript
// Transfer tokens to buyer
const blockchainTxHash = await blockchainService.transferTokensToBuyer(totalCredits);

// Record transaction in order history
await prisma.orderHistory.create({
  data: {
    orderId: order.id,
    event: "blockchain_transfer",
    message: `Carbon tokens transferred. TX: ${blockchainTxHash}`,
  },
});
```

## Error Handling

### Blockchain Failures
If the smart contract call fails:
- Order still completes successfully
- Error is logged in order history
- User is notified via notification system
- Support team can manually resolve blockchain issues

### Payment Failures
Mock payments are designed to always succeed, but error handling includes:
- Database transaction rollback
- Detailed error logging
- User-friendly error messages

## Testing

### Manual Testing
1. Add items to cart
2. Click "Mock Payment (Test)" button
3. Verify immediate redirect to success page
4. Check order completion in database
5. Verify blockchain transaction (if Ganache running)

### Automated Testing
Use the provided test functions in `test-mock-payment.ts`:

```typescript
import { testMockPayment, testMockSession } from './test-mock-payment';

// Test full flow
testMockPayment().then(result => {
  if (result.success) {
    return testMockSession(result.data.orderId);
  }
});
```

## Configuration

### Environment Variables
The mock payment system uses existing environment variables:
- Database connection (Prisma)
- Blockchain configuration (in blockchain-service.ts)
- Base URL for redirects

### Development vs Production
- Mock payments should only be available in development/testing environments
- Consider adding environment checks to disable mock payments in production

## Security Considerations

### Development Only
⚠️ **Warning**: This mock payment system is intended for development and testing only. It should never be enabled in production as it bypasses real payment processing.

### Access Control
Consider adding additional checks:
- Environment variable to enable/disable mock payments
- User role checks (admin/developer only)
- IP address restrictions for testing environments

## Benefits for Development

1. **Faster Testing**: No need to use real credit card details
2. **Blockchain Integration**: Immediate smart contract testing
3. **Complete Flow**: Tests entire order completion process
4. **No External Dependencies**: Works without Stripe configuration
5. **Debugging**: Clear error messages and transaction tracking

## Future Enhancements

Potential improvements:
1. **Mock Payment Failures**: Add option to simulate payment failures
2. **Partial Blockchain Success**: Test scenarios where some tokens transfer
3. **Performance Testing**: Bulk order processing
4. **Integration Tests**: Automated end-to-end testing
5. **Admin Dashboard**: View and manage mock transactions