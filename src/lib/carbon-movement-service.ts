import { neo4jService } from './neo4j-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MovementNode {
  id: string;
  type: 'User' | 'Forest' | 'CarbonCredit' | 'Order' | 'Certificate';
  properties: Record<string, any>;
}

export interface MovementRelationship {
  id: string;
  type: string;
  properties: Record<string, any>;
  startNode: string;
  endNode: string;
}

export interface CarbonCreditMovement {
  nodes: MovementNode[];
  relationships: MovementRelationship[];
}

class CarbonMovementService {
  /**
   * Sync a user to Neo4j
   */
  async syncUser(userId: number): Promise<void> {
    const session = neo4jService.getSession();
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) return;

      await session.run(
        `MERGE (u:User {id: $id})
         SET u.email = $email,
             u.name = $name,
             u.role = $role,
             u.createdAt = $createdAt,
             u.updatedAt = datetime()`,
        {
          id: user.id,
          email: user.email,
          name: user.name || 'Unknown',
          role: user.role,
          createdAt: user.createdAt.toISOString()
        }
      );

      console.log(`✅ Synced user ${userId} to Neo4j`);
    } catch (error) {
      console.error(`❌ Failed to sync user ${userId}:`, error);
    } finally {
      await session.close();
    }
  }

  /**
   * Sync a forest to Neo4j
   */
  async syncForest(forestId: number): Promise<void> {
    const session = neo4jService.getSession();
    try {
      const forest = await prisma.forest.findUnique({
        where: { id: forestId }
      });

      if (!forest) return;

      await session.run(
        `MERGE (f:Forest {id: $id})
         SET f.name = $name,
             f.location = $location,
             f.area = $area,
             f.carbonCapacity = $carbonCapacity,
             f.createdAt = $createdAt,
             f.updatedAt = datetime()`,
        {
          id: forest.id,
          name: forest.name,
          location: forest.location,
          area: forest.area,
          carbonCapacity: forest.carbonCapacity,
          createdAt: forest.createdAt.toISOString()
        }
      );

      console.log(`✅ Synced forest ${forestId} to Neo4j`);
    } catch (error) {
      console.error(`❌ Failed to sync forest ${forestId}:`, error);
    } finally {
      await session.close();
    }
  }

  /**
   * Sync carbon credits to Neo4j
   */
  async syncCarbonCredit(creditId: number): Promise<void> {
    const session = neo4jService.getSession();
    try {
      const credit = await prisma.carbonCredit.findUnique({
        where: { id: creditId },
        include: {
          forest: true
        }
      });

      if (!credit) return;

      // Create carbon credit node
      await session.run(
        `MERGE (c:CarbonCredit {id: $id})
         SET c.serialNumber = $serialNumber,
             c.amount = $amount,
             c.pricePerCredit = $pricePerCredit,
             c.vintage = $vintage,
             c.retired = $retired,
             c.createdAt = $createdAt,
             c.updatedAt = datetime()`,
        {
          id: credit.id,
          serialNumber: credit.serialNumber,
          amount: credit.amount,
          pricePerCredit: credit.pricePerCredit,
          vintage: credit.vintage,
          retired: credit.retired,
          createdAt: credit.createdAt.toISOString()
        }
      );

      // Create relationship to forest
      if (credit.forest) {
        await this.syncForest(credit.forest.id);
        
        await session.run(
          `MATCH (c:CarbonCredit {id: $creditId})
           MATCH (f:Forest {id: $forestId})
           MERGE (f)-[r:GENERATES]->(c)
           SET r.createdAt = $createdAt`,
          {
            creditId: credit.id,
            forestId: credit.forest.id,
            createdAt: credit.createdAt.toISOString()
          }
        );
      }

      console.log(`✅ Synced carbon credit ${creditId} to Neo4j`);
    } catch (error) {
      console.error(`❌ Failed to sync carbon credit ${creditId}:`, error);
    } finally {
      await session.close();
    }
  }

  /**
   * Track order and its carbon credit movements
   */
  async trackOrderMovement(orderId: number): Promise<void> {
    const session = neo4jService.getSession();
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          items: {
            include: {
              carbonCredit: {
                include: {
                  forest: true
                }
              }
            }
          }
        }
      });

      if (!order) return;

      // Sync user
      await this.syncUser(order.userId);

      // Create order node
      await session.run(
        `MERGE (o:Order {id: $id})
         SET o.status = $status,
             o.totalPrice = $totalPrice,
             o.totalCredits = $totalCredits,
             o.createdAt = $createdAt,
             o.paidAt = $paidAt,
             o.updatedAt = datetime()`,
        {
          id: order.id,
          status: order.status,
          totalPrice: order.totalPrice,
          totalCredits: order.totalCredits,
          createdAt: order.createdAt.toISOString(),
          paidAt: order.paidAt?.toISOString() || null
        }
      );

      // Create relationship between user and order
      await session.run(
        `MATCH (u:User {id: $userId})
         MATCH (o:Order {id: $orderId})
         MERGE (u)-[r:PLACED]->(o)
         SET r.createdAt = $createdAt`,
        {
          userId: order.userId,
          orderId: order.id,
          createdAt: order.createdAt.toISOString()
        }
      );

      // Track each carbon credit purchase
      for (const item of order.items) {
        // Sync carbon credit
        await this.syncCarbonCredit(item.carbonCreditId);

        // Create purchase relationship
        await session.run(
          `MATCH (o:Order {id: $orderId})
           MATCH (c:CarbonCredit {id: $creditId})
           MERGE (o)-[r:PURCHASES]->(c)
           SET r.quantity = $quantity,
               r.pricePerCredit = $pricePerCredit,
               r.subtotal = $subtotal,
               r.createdAt = $createdAt`,
          {
            orderId: order.id,
            creditId: item.carbonCreditId,
            quantity: item.quantity,
            pricePerCredit: item.pricePerCredit,
            subtotal: item.subtotal,
            createdAt: order.createdAt.toISOString()
          }
        );

        // If order is completed, create ownership transfer
        if (order.status === 'Completed' && order.paidAt) {
          await session.run(
            `MATCH (u:User {id: $userId})
             MATCH (c:CarbonCredit {id: $creditId})
             MERGE (u)-[r:OWNS]->(c)
             SET r.quantity = $quantity,
                 r.acquiredAt = $acquiredAt,
                 r.orderId = $orderId`,
            {
              userId: order.userId,
              creditId: item.carbonCreditId,
              quantity: item.quantity,
              acquiredAt: order.paidAt.toISOString(),
              orderId: order.id
            }
          );
        }
      }

      console.log(`✅ Tracked order movement ${orderId} in Neo4j`);
    } catch (error) {
      console.error(`❌ Failed to track order movement ${orderId}:`, error);
    } finally {
      await session.close();
    }
  }

  /**
   * Get carbon credit movement graph for visualization
   */
  async getCarbonCreditMovementGraph(limit: number = 50): Promise<CarbonCreditMovement> {
    const session = neo4jService.getSession();
    try {
      const result = await session.run(
        `MATCH (n)-[r]->(m)
         WHERE n:User OR n:Forest OR n:CarbonCredit OR n:Order
         RETURN n, r, m
         LIMIT $limit`,
        { limit }
      );

      const nodes: MovementNode[] = [];
      const relationships: MovementRelationship[] = [];
      const nodeIds = new Set<string>();

      for (const record of result.records) {
        const startNode = record.get('n');
        const relationship = record.get('r');
        const endNode = record.get('m');

        // Add start node
        const startNodeId = `${startNode.labels[0]}_${startNode.properties.id}`;
        if (!nodeIds.has(startNodeId)) {
          nodes.push({
            id: startNodeId,
            type: startNode.labels[0] as any,
            properties: startNode.properties
          });
          nodeIds.add(startNodeId);
        }

        // Add end node
        const endNodeId = `${endNode.labels[0]}_${endNode.properties.id}`;
        if (!nodeIds.has(endNodeId)) {
          nodes.push({
            id: endNodeId,
            type: endNode.labels[0] as any,
            properties: endNode.properties
          });
          nodeIds.add(endNodeId);
        }

        // Add relationship
        relationships.push({
          id: `${startNodeId}_${relationship.type}_${endNodeId}`,
          type: relationship.type,
          properties: relationship.properties,
          startNode: startNodeId,
          endNode: endNodeId
        });
      }

      return { nodes, relationships };
    } catch (error) {
      console.error('❌ Failed to get movement graph:', error);
      return { nodes: [], relationships: [] };
    } finally {
      await session.close();
    }
  }

  /**
   * Sync all existing data to Neo4j
   */
  async syncAllData(): Promise<void> {
    console.log('🔄 Starting full data sync to Neo4j...');
    
    try {
      // Initialize schema first
      await neo4jService.initializeSchema();

      // Sync all users
      const users = await prisma.user.findMany();
      for (const user of users) {
        await this.syncUser(user.id);
      }

      // Sync all forests
      const forests = await prisma.forest.findMany();
      for (const forest of forests) {
        await this.syncForest(forest.id);
      }

      // Sync all carbon credits
      const credits = await prisma.carbonCredit.findMany();
      for (const credit of credits) {
        await this.syncCarbonCredit(credit.id);
      }

      // Sync all orders
      const orders = await prisma.order.findMany();
      for (const order of orders) {
        await this.trackOrderMovement(order.id);
      }

      console.log('✅ Full data sync to Neo4j completed');
    } catch (error) {
      console.error('❌ Failed to sync all data:', error);
    }
  }
}

export const carbonMovementService = new CarbonMovementService();