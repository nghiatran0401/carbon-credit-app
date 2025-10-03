/**
 * Mock Payment System Test File
 * 
 * This file demonstrates how to test the mock payment flow:
 * 1. Add items to cart
 * 2. Use mock checkout
 * 3. Verify order completion and blockchain interaction
 */

export interface MockPaymentTestData {
  userId: number;
  cartItems: Array<{
    carbonCreditId: number;
    quantity: number;
    carbonCredit: {
      pricePerCredit: number;
      forest: {
        name: string;
      };
    };
  }>;
}

export const sampleTestData: MockPaymentTestData = {
  userId: 1,
  cartItems: [
    {
      carbonCreditId: 1,
      quantity: 10,
      carbonCredit: {
        pricePerCredit: 25.50,
        forest: {
          name: "Amazon Rainforest Conservation"
        }
      }
    },
    {
      carbonCreditId: 2,
      quantity: 5,
      carbonCredit: {
        pricePerCredit: 30.00,
        forest: {
          name: "Pacific Northwest Forest"
        }
      }
    }
  ]
};

/**
 * Test the mock payment endpoint
 * This function demonstrates how to call the mock payment API
 */
export async function testMockPayment(baseUrl = "http://localhost:3000") {
  try {
    console.log("🧪 Testing Mock Payment System...");
    console.log("📊 Test Data:", JSON.stringify(sampleTestData, null, 2));

    const response = await fetch(`${baseUrl}/api/checkout/mock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sampleTestData),
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log("✅ Mock Payment Successful!");
      console.log("📦 Order ID:", result.orderId);
      console.log("💳 Payment ID:", result.paymentId);
      console.log("⛓️  Blockchain TX Hash:", result.blockchainTxHash);
      console.log("🔄 Redirect URL:", result.redirectUrl);
      
      return {
        success: true,
        data: result
      };
    } else {
      console.log("❌ Mock Payment Failed!");
      console.log("Error:", result.error || result);
      
      return {
        success: false,
        error: result.error || "Unknown error"
      };
    }

  } catch (error) {
    console.error("🚨 Test Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error"
    };
  }
}

/**
 * Test the session endpoint with mock order
 */
export async function testMockSession(orderId: number, baseUrl = "http://localhost:3000") {
  try {
    console.log("🔍 Testing Mock Session Lookup...");
    
    const response = await fetch(`${baseUrl}/api/checkout/session?mock_order_id=${orderId}`);
    const result = await response.json();
    
    if (response.ok && result.order) {
      console.log("✅ Session Lookup Successful!");
      console.log("📦 Order Status:", result.order.status);
      console.log("💰 Total Price:", result.order.totalPrice);
      console.log("🌿 Total Credits:", result.order.totalCredits);
      
      return {
        success: true,
        data: result
      };
    } else {
      console.log("❌ Session Lookup Failed!");
      console.log("Error:", result.error || result);
      
      return {
        success: false,
        error: result.error || "Unknown error"
      };
    }

  } catch (error) {
    console.error("🚨 Session Test Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error"
    };
  }
}

// Usage example:
// testMockPayment().then(result => {
//   if (result.success && result.data.orderId) {
//     return testMockSession(result.data.orderId);
//   }
// });