// Mock data for carbon credit movement graph
export interface MockGraphNode {
  id: string;
  type: 'User' | 'Forest' | 'CarbonCredit' | 'Order' | 'Certificate';
  properties: Record<string, any>;
  val?: number;
  color?: string;
}

export interface MockGraphLink {
  id: string;
  type: string;
  properties: Record<string, any>;
  source: string;
  target: string;
  value?: number;
  color?: string;
}

export interface MockGraphData {
  nodes: MockGraphNode[];
  links: MockGraphLink[];
}

// Mock data generator
export class MockCarbonMovementData {
  private static instance: MockCarbonMovementData;
  private mockData: MockGraphData;

  private constructor() {
    this.mockData = this.generateMockData();
  }

  public static getInstance(): MockCarbonMovementData {
    if (!MockCarbonMovementData.instance) {
      MockCarbonMovementData.instance = new MockCarbonMovementData();
    }
    return MockCarbonMovementData.instance;
  }

  private generateMockData(): MockGraphData {
    const nodes: MockGraphNode[] = [];
    const links: MockGraphLink[] = [];

    // Colors for different node types
    const NODE_COLORS = {
      User: '#3B82F6',      // Blue
      Forest: '#10B981',    // Green
      CarbonCredit: '#8B5CF6', // Purple
      Order: '#F59E0B',     // Amber
      Certificate: '#EF4444' // Red
    };

    // Create Users
    const users = [
      { id: 'user_1', name: 'John Smith', email: 'john@example.com', role: 'Individual' },
      { id: 'user_2', name: 'Alice Johnson', email: 'alice@example.com', role: 'Corporate' },
      { id: 'user_3', name: 'Bob Wilson', email: 'bob@example.com', role: 'NGO' },
      { id: 'user_4', name: 'Carol Brown', email: 'carol@example.com', role: 'Government' },
      { id: 'user_5', name: 'David Lee', email: 'david@example.com', role: 'Individual' },
      { id: 'user_6', name: 'Emma Davis', email: 'emma@example.com', role: 'Corporate' }
    ];

    users.forEach((user, index) => {
      const totalPurchased = Math.floor(Math.random() * 500) + 50;
      nodes.push({
        id: user.id,
        type: 'User',
        properties: {
          id: index + 1, // Database ID
          name: user.name,
          firstName: user.name.split(' ')[0],
          lastName: user.name.split(' ')[1] || '',
          email: user.email,
          role: user.role,
          userType: user.role,
          company: user.role === 'Corporate' ? `${user.name.split(' ')[0]} Corp` : null,
          country: ['USA', 'Canada', 'UK', 'Germany', 'Australia', 'Japan'][Math.floor(Math.random() * 6)],
          phoneNumber: `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          joinDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString(),
          lastLoginDate: new Date(2024, 10, Math.floor(Math.random() * 28)).toISOString(),
          totalPurchased: totalPurchased,
          totalCreditsOwned: Math.floor(totalPurchased * 0.8), // Some might have been retired
          totalCreditsRetired: Math.floor(totalPurchased * 0.2),
          totalSpent: totalPurchased * (Math.floor(Math.random() * 50) + 15),
          preferredCurrency: 'USD',
          carbonFootprint: Math.floor(Math.random() * 50) + 10, // Tons CO2e per year
          offsetGoal: Math.floor(Math.random() * 100) + 50, // % of footprint to offset
          verified: true,
          emailVerified: true,
          kycStatus: ['Verified', 'Pending', 'Not Required'][Math.floor(Math.random() * 3)],
          riskProfile: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
          investmentExperience: ['Beginner', 'Intermediate', 'Advanced'][Math.floor(Math.random() * 3)],
          sustainabilityGoals: ['Net Zero', 'Carbon Neutral', 'Offset Travel', 'Corporate ESG'][Math.floor(Math.random() * 4)],
          createdAt: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString(),
          updatedAt: new Date().toISOString()
        },
        val: Math.floor(Math.random() * 20) + 10,
        color: NODE_COLORS.User
      });
    });

    // Create Forests
    const forests = [
      { id: 'forest_1', name: 'Amazon Rainforest Project', location: 'Brazil', area: 50000 },
      { id: 'forest_2', name: 'Congo Basin Initiative', location: 'DRC', area: 30000 },
      { id: 'forest_3', name: 'Boreal Forest Conservation', location: 'Canada', area: 75000 },
      { id: 'forest_4', name: 'Indonesian Peatland Restoration', location: 'Indonesia', area: 25000 },
      { id: 'forest_5', name: 'African Savanna Reforestation', location: 'Kenya', area: 40000 }
    ];

    forests.forEach((forest, index) => {
      const totalCreditsGenerated = Math.floor(Math.random() * 10000) + 1000;
      nodes.push({
        id: forest.id,
        type: 'Forest',
        properties: {
          id: index + 1, // Database ID
          name: forest.name,
          location: forest.location,
          country: forest.location,
          region: ['Amazon', 'Congo Basin', 'Boreal', 'Southeast Asia', 'East Africa'][index],
          area: forest.area,
          areaUnit: 'hectares',
          forestType: ['Tropical Rainforest', 'Temperate Forest', 'Boreal Forest', 'Mangrove', 'Savanna'][Math.floor(Math.random() * 5)],
          description: `${forest.name} is a crucial ecosystem contributing to global carbon sequestration and biodiversity conservation.`,
          status: ['Active', 'Under Development', 'Completed'][Math.floor(Math.random() * 3)],
          certificationStandard: ['VCS', 'CDM', 'Gold Standard', 'Climate Action Reserve'][Math.floor(Math.random() * 4)],
          projectStart: new Date(2022, Math.floor(Math.random() * 12), 1).toISOString(),
          projectEnd: new Date(2032, Math.floor(Math.random() * 12), 1).toISOString(),
          totalCreditsGenerated: totalCreditsGenerated,
          availableCredits: Math.floor(totalCreditsGenerated * 0.7),
          soldCredits: Math.floor(totalCreditsGenerated * 0.2),
          retiredCredits: Math.floor(totalCreditsGenerated * 0.1),
          carbonCapacity: Math.floor(forest.area * (Math.random() * 50 + 20)), // 20-70 tons CO2/hectare
          carbonSequestrationRate: Math.floor(Math.random() * 10) + 5, // 5-15 tons CO2/hectare/year
          biodiversityScore: Math.floor(Math.random() * 100) + 1,
          communityImpact: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
          localJobs: Math.floor(Math.random() * 500) + 50,
          projectType: ['REDD+', 'Afforestation', 'Reforestation', 'Forest Management'][Math.floor(Math.random() * 4)],
          methodology: ['VM0009', 'VM0015', 'ACM0002', 'AMS-III.X'][Math.floor(Math.random() * 4)],
          verifier: ['SCS Global Services', 'DNV GL', 'TÜV SÜD', 'Bureau Veritas'][Math.floor(Math.random() * 4)],
          lastVerification: new Date(2024, Math.floor(Math.random() * 12), 1).toISOString(),
          nextVerification: new Date(2025, Math.floor(Math.random() * 12), 1).toISOString(),
          coordinates: {
            latitude: -10 + Math.random() * 60, // Rough global forest distribution
            longitude: -180 + Math.random() * 360
          },
          climateZone: ['Tropical', 'Temperate', 'Boreal', 'Mediterranean'][Math.floor(Math.random() * 4)],
          riskFactors: ['Deforestation', 'Climate Change', 'Political Instability', 'Natural Disasters'].slice(0, Math.floor(Math.random() * 3) + 1),
          monitoringFrequency: ['Monthly', 'Quarterly', 'Annually'][Math.floor(Math.random() * 3)],
          sateliteMonitoring: true,
          groundTruthing: Math.random() > 0.3,
          createdAt: new Date(2022, Math.floor(Math.random() * 12), 1).toISOString(),
          updatedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        },
        val: Math.floor(forest.area / 1000) + 15,
        color: NODE_COLORS.Forest
      });
    });

    // Create Carbon Credits
    const carbonCredits = [];
    for (let i = 1; i <= 20; i++) {
      const forestId = forests[Math.floor(Math.random() * forests.length)].id;
      const creditId = `credit_${i}`;
      const quantity = Math.floor(Math.random() * 100) + 10;
      const pricePerCredit = Math.floor(Math.random() * 50) + 15;
      const issuanceDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString();
      
      carbonCredits.push({
        id: creditId,
        forestId: forestId,
        vintage: 2024,
        quantity: quantity,
        pricePerCredit: pricePerCredit,
        issuanceDate: issuanceDate
      });

      nodes.push({
        id: creditId,
        type: 'CarbonCredit',
        properties: {
          id: i, // Database ID
          serialNumber: `CC-2024-${forestId.toUpperCase()}-${String(i).padStart(6, '0')}`, // Unique serial number
          registryId: `REG-${String(i).padStart(8, '0')}`, // Registry identifier
          vintage: 2024,
          quantity: quantity,
          availableCredits: Math.floor(quantity * (0.7 + Math.random() * 0.3)), // Some credits might be reserved/sold
          totalCredits: quantity,
          retiredCredits: Math.floor(quantity * Math.random() * 0.3), // Some might be retired
          pricePerCredit: pricePerCredit,
          certification: ['VCS', 'CDM', 'Gold Standard', 'Climate Action Reserve'][Math.floor(Math.random() * 4)],
          methodology: ['REDD+', 'Afforestation', 'Forest Management', 'Improved Forest Management'][Math.floor(Math.random() * 4)],
          projectType: ['Forestry', 'REDD+', 'Reforestation', 'Afforestation'][Math.floor(Math.random() * 4)],
          verificationStandard: ['VCS', 'CDM', 'Gold Standard'][Math.floor(Math.random() * 3)],
          symbol: `${forests.find(f => f.id === forestId)?.name.split(' ')[0].toUpperCase() || 'FOREST'}CC${i}`,
          issuanceDate: issuanceDate,
          expiryDate: new Date(2034, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString(),
          status: ['Available', 'Reserved', 'Retired', 'Pending'][Math.floor(Math.random() * 4)],
          qualityRating: ['A+', 'A', 'B+', 'B'][Math.floor(Math.random() * 4)],
          additionalityStatus: 'Verified',
          permanenceRating: Math.floor(Math.random() * 50) + 50, // 50-100 years
          cobenefits: ['Biodiversity', 'Community Development', 'Water Conservation', 'Soil Protection'].slice(0, Math.floor(Math.random() * 4) + 1),
          geolocation: {
            latitude: -10 + Math.random() * 20, // Random lat between -10 and 10
            longitude: -180 + Math.random() * 360 // Random long between -180 and 180
          },
          carbonStandard: ['Verra VCS', 'CDM', 'Gold Standard', 'Climate Action Reserve'][Math.floor(Math.random() * 4)],
          monitoringPeriod: `${2024 - Math.floor(Math.random() * 5)}-${2024}`,
          bufferPoolContribution: Math.floor(Math.random() * 10) + 5, // 5-15%
          leakageRisk: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
          createdAt: issuanceDate,
          updatedAt: new Date().toISOString()
        },
        val: Math.floor(quantity / 10) + 5,
        color: NODE_COLORS.CarbonCredit
      });

      // Link forest to carbon credit (GENERATES)
      links.push({
        id: `${forestId}_generates_${creditId}`,
        type: 'GENERATES',
        source: forestId,
        target: creditId,
        properties: {
          generatedDate: carbonCredits[i-1].issuanceDate,
          quantity: carbonCredits[i-1].quantity
        },
        value: Math.floor(carbonCredits[i-1].quantity / 20) + 1,
        color: '#10B981'
      });
    }

    // Create Orders and link users to carbon credits
    const orders = [];
    for (let i = 1; i <= 15; i++) {
      const userId = users[Math.floor(Math.random() * users.length)].id;
      const creditId = carbonCredits[Math.floor(Math.random() * carbonCredits.length)].id;
      const orderId = `order_${i}`;
      const quantity = Math.floor(Math.random() * 20) + 1;
      const totalPrice = quantity * (Math.floor(Math.random() * 50) + 15);

      orders.push({
        id: orderId,
        userId: userId,
        creditId: creditId,
        quantity: quantity,
        totalPrice: totalPrice,
        orderDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString()
      });

      nodes.push({
        id: orderId,
        type: 'Order',
        properties: {
          id: i, // Database ID
          orderNumber: `ORD-2024-${String(i).padStart(8, '0')}`, // Human-readable order number
          quantity: quantity,
          totalCredits: quantity, // Add totalCredits field
          totalPrice: totalPrice,
          pricePerCredit: Math.floor(totalPrice / quantity),
          status: ['Completed', 'Pending', 'Processing', 'Cancelled'][Math.floor(Math.random() * 4)],
          orderDate: orders[i-1].orderDate,
          paymentMethod: ['Credit Card', 'Bank Transfer', 'Crypto', 'PayPal'][Math.floor(Math.random() * 4)],
          paymentStatus: ['Paid', 'Pending', 'Failed', 'Refunded'][Math.floor(Math.random() * 4)],
          currency: 'USD',
          taxAmount: Math.floor(totalPrice * 0.1), // 10% tax
          fees: Math.floor(totalPrice * 0.025), // 2.5% processing fees
          netAmount: Math.floor(totalPrice * 0.875), // After tax and fees
          shippingAddress: {
            country: ['USA', 'Canada', 'UK', 'Germany', 'Australia'][Math.floor(Math.random() * 5)],
            city: ['New York', 'Toronto', 'London', 'Berlin', 'Sydney'][Math.floor(Math.random() * 5)]
          },
          retirementReason: ['Corporate Net Zero', 'Personal Offset', 'Event Offset', 'Compliance'][Math.floor(Math.random() * 4)],
          notes: `Order for ${quantity} carbon credits`,
          createdAt: orders[i-1].orderDate,
          updatedAt: new Date().toISOString(),
          expectedDelivery: new Date(new Date(orders[i-1].orderDate).getTime() + 7*24*60*60*1000).toISOString(),
          trackingNumber: `TRK-${String(i).padStart(10, '0')}`
        },
        val: Math.floor(quantity / 2) + 3,
        color: NODE_COLORS.Order
      });

      // Link user to order (PLACES)
      links.push({
        id: `${userId}_places_${orderId}`,
        type: 'PLACES',
        source: userId,
        target: orderId,
        properties: {
          orderDate: orders[i-1].orderDate,
          quantity: quantity
        },
        value: Math.floor(quantity / 5) + 1,
        color: '#3B82F6'
      });

      // Link order to carbon credit (PURCHASES)
      links.push({
        id: `${orderId}_purchases_${creditId}`,
        type: 'PURCHASES',
        source: orderId,
        target: creditId,
        properties: {
          quantity: quantity,
          totalPrice: totalPrice,
          purchaseDate: orders[i-1].orderDate
        },
        value: Math.floor(quantity / 3) + 1,
        color: '#F59E0B'
      });
    }

    // Create Certificates for completed orders
    const completedOrders = orders.filter((_, i) => i % 2 === 0); // Mock: every other order is completed
    completedOrders.forEach((order, i) => {
      const certId = `cert_${i + 1}`;
      
      nodes.push({
        id: certId,
        type: 'Certificate',
        properties: {
          id: `CERT-${String(i + 1).padStart(8, '0')}`, // Certificate ID
          orderId: order.id,
          certificateNumber: `CERT-2024-${String(i + 1).padStart(6, '0')}`,
          serialNumber: `SN-${String(i + 1).padStart(12, '0')}`, // Unique serial number
          quantity: order.quantity,
          retirementReason: ['Corporate Net Zero', 'Personal Carbon Neutral', 'Event Offset', 'Compliance Requirement'][Math.floor(Math.random() * 4)],
          issuanceDate: new Date(new Date(order.orderDate).getTime() + 24*60*60*1000).toISOString(),
          retirementDate: new Date(new Date(order.orderDate).getTime() + 48*60*60*1000).toISOString(),
          verified: true,
          verifiedBy: ['Verra', 'Gold Standard', 'Climate Action Reserve', 'American Carbon Registry'][Math.floor(Math.random() * 4)],
          verificationDate: new Date(new Date(order.orderDate).getTime() + 72*60*60*1000).toISOString(),
          certificateHash: `0x${Math.random().toString(16).substring(2, 66)}`, // Mock blockchain hash
          blockchainTxHash: `0x${Math.random().toString(16).substring(2, 66)}`, // Transaction hash
          status: ['Active', 'Retired', 'Expired'][Math.floor(Math.random() * 3)],
          issuer: 'Carbon Credit Registry',
          registryUrl: `https://registry.example.com/certificates/${certId}`,
          beneficiary: {
            name: users.find(u => u.id === order.userId)?.name || 'Unknown',
            type: ['Individual', 'Corporation', 'NGO', 'Government'][Math.floor(Math.random() * 4)]
          },
          metadata: {
            projectName: forests[Math.floor(Math.random() * forests.length)].name,
            projectType: ['Forest Conservation', 'Reforestation', 'REDD+'][Math.floor(Math.random() * 3)],
            methodology: ['VM0009', 'VM0015', 'ACM0002'][Math.floor(Math.random() * 3)],
            vintage: 2024,
            geography: ['Brazil', 'Indonesia', 'Canada', 'Kenya'][Math.floor(Math.random() * 4)]
          },
          auditTrail: [
            {
              action: 'Certificate Issued',
              timestamp: new Date(new Date(order.orderDate).getTime() + 24*60*60*1000).toISOString(),
              actor: 'System'
            },
            {
              action: 'Certificate Retired',
              timestamp: new Date(new Date(order.orderDate).getTime() + 48*60*60*1000).toISOString(),
              actor: users.find(u => u.id === order.userId)?.name || 'Unknown'
            }
          ],
          createdAt: new Date(new Date(order.orderDate).getTime() + 24*60*60*1000).toISOString(),
          updatedAt: new Date().toISOString()
        },
        val: Math.floor(order.quantity / 3) + 2,
        color: NODE_COLORS.Certificate
      });

      // Link order to certificate (GENERATES_CERTIFICATE)
      links.push({
        id: `${order.id}_generates_${certId}`,
        type: 'GENERATES_CERTIFICATE',
        source: order.id,
        target: certId,
        properties: {
          issuanceDate: new Date(new Date(order.orderDate).getTime() + 24*60*60*1000).toISOString(),
          quantity: order.quantity
        },
        value: Math.floor(order.quantity / 4) + 1,
        color: '#EF4444'
      });
    });

    // Add user-to-user carbon credit transfer transactions (secondary market)
    // Create a credit lifecycle chain showing complete provenance:
    // User A -> Order -> Credit (from Forest) -> User B -> User C -> User D
    
    // First, create a specific order from User A (John) for a specific credit
    const lifecycleOrder = orders[0]; // Use first order
    const lifecycleCreditId = lifecycleOrder.creditId;
    const lifecycleUserId = lifecycleOrder.userId;
    
    // Create transfer chain: A->B->C->D showing credit ownership transfer
    const creditLifecycleChain = [
      { from: lifecycleUserId, to: users[1].id, quantity: 50, description: 'Initial resale from original purchaser to Alice' },
      { from: users[1].id, to: users[2].id, quantity: 50, description: 'Secondary market trade from Alice to Bob' },
      { from: users[2].id, to: users[3].id, quantity: 50, description: 'Portfolio rebalancing from Bob to Carol' },
      { from: users[3].id, to: users[4].id, quantity: 50, description: 'Final transfer from Carol to David' }
    ];

    creditLifecycleChain.forEach((transfer, index) => {
      const transferId = `lifecycle_transfer_${index + 1}`;
      const transferDate = new Date(2024, 9 + index, 10 + index * 3).toISOString();
      const pricePerCredit = 30 + index * 3; // Increasing price: $30, $33, $36, $39
      const totalPrice = transfer.quantity * pricePerCredit;

      links.push({
        id: transferId,
        type: 'TRANSFERS_CREDIT',
        source: transfer.from,
        target: transfer.to,
        properties: {
          creditId: lifecycleCreditId,
          quantity: transfer.quantity,
          transferDate: transferDate,
          pricePerCredit: pricePerCredit,
          totalPrice: totalPrice,
          transferType: 'Credit Lifecycle Transfer',
          reason: transfer.description,
          transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
          status: 'Completed',
          fees: Math.floor(totalPrice * 0.02), // 2% transaction fee
          netAmount: Math.floor(totalPrice * 0.98),
          stage: `Stage ${index + 1} of 4`
        },
        value: Math.floor(transfer.quantity / 10) + 3,
        color: '#A855F7' // Lighter purple for lifecycle transfers
      });
    });

    // Create a chain of transfers: A->B->C->D with increasing quantities (general transfers)
    const transferChain = [
      { from: users[0], to: users[1], quantity: 100, description: 'Direct transfer from John to Alice' },
      { from: users[1], to: users[2], quantity: 200, description: 'Secondary market sale from Alice to Bob' },
      { from: users[2], to: users[3], quantity: 300, description: 'Portfolio transfer from Bob to Carol' }
    ];

    transferChain.forEach((transfer, index) => {
      const transferId = `transfer_chain_${index + 1}`;
      const transferDate = new Date(2024, 8 + index, 15 + index * 5).toISOString();
      const pricePerCredit = 25 + index * 5; // Increasing price: $25, $30, $35
      const totalPrice = transfer.quantity * pricePerCredit;

      links.push({
        id: transferId,
        type: 'TRANSFERS_TO',
        source: transfer.from.id,
        target: transfer.to.id,
        properties: {
          quantity: transfer.quantity,
          transferDate: transferDate,
          pricePerCredit: pricePerCredit,
          totalPrice: totalPrice,
          transferType: 'Secondary Market',
          reason: transfer.description,
          transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
          status: 'Completed',
          fees: Math.floor(totalPrice * 0.02), // 2% transaction fee
          netAmount: Math.floor(totalPrice * 0.98)
        },
        value: Math.floor(transfer.quantity / 20) + 2,
        color: '#8B5CF6'
      });
    });

    // Add additional random secondary market transactions between other users
    for (let i = 1; i <= 5; i++) {
      const seller = users[Math.floor(Math.random() * users.length)];
      const buyer = users[Math.floor(Math.random() * users.length)];
      
      if (seller.id !== buyer.id) {
        const transferId = `transfer_${i}`;
        const quantity = Math.floor(Math.random() * 50) + 10;
        const pricePerCredit = Math.floor(Math.random() * 40) + 20;
        const totalPrice = quantity * pricePerCredit;
        
        links.push({
          id: transferId,
          type: 'TRANSFERS_TO',
          source: seller.id,
          target: buyer.id,
          properties: {
            quantity: quantity,
            transferDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString(),
            pricePerCredit: pricePerCredit,
            totalPrice: totalPrice,
            transferType: 'Secondary Market',
            reason: 'Secondary Market Sale',
            transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
            status: ['Completed', 'Pending', 'Processing'][Math.floor(Math.random() * 3)],
            fees: Math.floor(totalPrice * 0.02),
            netAmount: Math.floor(totalPrice * 0.98)
          },
          value: Math.floor(quantity / 10) + 1,
          color: '#8B5CF6'
        });
      }
    }

    return { nodes, links };
  }

  public getMockData(limit?: number): MockGraphData {
    if (!limit) {
      return this.mockData;
    }

    // Apply limit to both nodes and links
    const limitedNodes = this.mockData.nodes.slice(0, limit);
    const nodeIds = new Set(limitedNodes.map(node => node.id));
    
    // Filter links to only include those between limited nodes
    const limitedLinks = this.mockData.links.filter(link => 
      nodeIds.has(link.source) && nodeIds.has(link.target)
    );

    return {
      nodes: limitedNodes,
      links: limitedLinks
    };
  }

  public getFilteredData(options: {
    nodeTypes?: string[];
    linkTypes?: string[];
    limit?: number;
    dateRange?: { start: string; end: string };
  } = {}): MockGraphData {
    let { nodes, links } = this.mockData;

    // Filter by node types
    if (options.nodeTypes && options.nodeTypes.length > 0) {
      nodes = nodes.filter(node => options.nodeTypes!.includes(node.type));
    }

    // Filter by link types
    if (options.linkTypes && options.linkTypes.length > 0) {
      links = links.filter(link => options.linkTypes!.includes(link.type));
    }

    // Filter by date range
    if (options.dateRange) {
      const { start, end } = options.dateRange;
      links = links.filter(link => {
        const date = link.properties.orderDate || 
                     link.properties.purchaseDate || 
                     link.properties.transferDate || 
                     link.properties.generatedDate ||
                     link.properties.issuanceDate;
        
        if (date) {
          return date >= start && date <= end;
        }
        return false;
      });
    }

    // Update nodes to only include those connected by filtered links
    const connectedNodeIds = new Set<string>();
    links.forEach(link => {
      connectedNodeIds.add(link.source);
      connectedNodeIds.add(link.target);
    });
    
    nodes = nodes.filter(node => 
      connectedNodeIds.has(node.id) || 
      (options.nodeTypes && options.nodeTypes.includes(node.type))
    );

    // Apply limit
    if (options.limit) {
      nodes = nodes.slice(0, options.limit);
      const nodeIds = new Set(nodes.map(node => node.id));
      links = links.filter(link => 
        nodeIds.has(link.source) && nodeIds.has(link.target)
      );
    }

    return { nodes, links };
  }

  public getCarbonCredits(limit?: number): MockGraphNode[] {
    const carbonCredits = this.mockData.nodes.filter(node => node.type === 'CarbonCredit');
    return limit ? carbonCredits.slice(0, limit) : carbonCredits;
  }

  public getCarbonCreditById(id: string): MockGraphNode | undefined {
    return this.mockData.nodes.find(node => node.type === 'CarbonCredit' && node.id === id);
  }

  public getCarbonCreditsByForest(forestId: string, limit?: number): MockGraphNode[] {
    const credits = this.mockData.nodes.filter(node => 
      node.type === 'CarbonCredit' && 
      this.mockData.links.some(link => 
        link.type === 'GENERATES' && 
        link.source === forestId && 
        link.target === node.id
      )
    );
    return limit ? credits.slice(0, limit) : credits;
  }

  public getOrdersByUser(userId: string, limit?: number): MockGraphNode[] {
    const orders = this.mockData.nodes.filter(node => 
      node.type === 'Order' && 
      this.mockData.links.some(link => 
        link.type === 'PLACES' && 
        link.source === userId && 
        link.target === node.id
      )
    );
    return limit ? orders.slice(0, limit) : orders;
  }

  public getCertificatesByUser(userId: string, limit?: number): MockGraphNode[] {
    // Get orders by user first, then find certificates for those orders
    const userOrders = this.getOrdersByUser(userId);
    const orderIds = new Set(userOrders.map(order => order.id));
    
    const certificates = this.mockData.nodes.filter(node => 
      node.type === 'Certificate' && 
      this.mockData.links.some(link => 
        link.type === 'GENERATES_CERTIFICATE' && 
        orderIds.has(link.source) && 
        link.target === node.id
      )
    );
    return limit ? certificates.slice(0, limit) : certificates;
  }

  public getStatistics() {
    const { nodes, links } = this.mockData;
    
    const stats = {
      totalNodes: nodes.length,
      totalLinks: links.length,
      nodeTypes: {} as Record<string, number>,
      linkTypes: {} as Record<string, number>,
      totalCarbonCredits: 0,
      totalQuantityTransacted: 0,
      totalValue: 0
    };

    // Count node types
    nodes.forEach(node => {
      stats.nodeTypes[node.type] = (stats.nodeTypes[node.type] || 0) + 1;
      
      if (node.type === 'CarbonCredit') {
        stats.totalCarbonCredits += node.properties.quantity || 0;
      }
    });

    // Count link types and calculate totals
    links.forEach(link => {
      stats.linkTypes[link.type] = (stats.linkTypes[link.type] || 0) + 1;
      
      if (link.properties.quantity) {
        stats.totalQuantityTransacted += link.properties.quantity;
      }
      
      if (link.properties.totalPrice) {
        stats.totalValue += link.properties.totalPrice;
      }
    });

    return stats;
  }

  public getTimelineData() {
    const { links } = this.mockData;
    const timeline: Array<{
      date: string;
      events: Array<{
        type: string;
        description: string;
        quantity?: number;
        value?: number;
      }>;
    }> = [];

    // Group events by date
    const eventsByDate: Record<string, any[]> = {};

    links.forEach(link => {
      const date = link.properties.orderDate || 
                   link.properties.purchaseDate || 
                   link.properties.transferDate || 
                   link.properties.generatedDate;
      
      if (date) {
        const dateKey = new Date(date).toISOString().split('T')[0];
        if (!eventsByDate[dateKey]) {
          eventsByDate[dateKey] = [];
        }

        let description = '';
        switch (link.type) {
          case 'GENERATES':
            description = `Forest generated ${link.properties.quantity} carbon credits`;
            break;
          case 'PLACES':
            description = `User placed order for ${link.properties.quantity} credits`;
            break;
          case 'PURCHASES':
            description = `Order purchased ${link.properties.quantity} credits for $${link.properties.totalPrice}`;
            break;
          case 'TRANSFERS_TO':
            description = `Secondary market transfer of ${link.properties.quantity} credits`;
            break;
          case 'GENERATES_CERTIFICATE':
            description = `Certificate issued for ${link.properties.quantity} retired credits`;
            break;
        }

        eventsByDate[dateKey].push({
          type: link.type,
          description,
          quantity: link.properties.quantity,
          value: link.properties.totalPrice || link.properties.price
        });
      }
    });

    // Convert to timeline format
    Object.keys(eventsByDate)
      .sort()
      .forEach(date => {
        timeline.push({
          date,
          events: eventsByDate[date]
        });
      });

    return timeline;
  }
}

// Export singleton instance
export const mockCarbonMovementData = MockCarbonMovementData.getInstance();