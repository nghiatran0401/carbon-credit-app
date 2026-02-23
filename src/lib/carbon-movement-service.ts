import { neo4jService } from './neo4j-service';
import { prisma } from './prisma';
import { OrderStatus } from '@prisma/client';

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
  /* ------------------------------------------------------------------ */
  /* Public single-entity methods (used by webhook for real-time sync)   */
  /* These fetch from DB, then delegate to the write helpers.            */
  /* ------------------------------------------------------------------ */

  async syncUser(userId: number): Promise<void> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return;
      await this.writeUser(user);
      console.log(`✅ Synced user ${userId} to Neo4j`);
    } catch (error) {
      console.error(`❌ Failed to sync user ${userId}:`, error);
    }
  }

  async syncForest(forestId: number): Promise<void> {
    try {
      const forest = await prisma.forest.findUnique({ where: { id: forestId } });
      if (!forest) return;
      await this.writeForest(forest);
      console.log(`✅ Synced forest ${forestId} to Neo4j`);
    } catch (error) {
      console.error(`❌ Failed to sync forest ${forestId}:`, error);
    }
  }

  async syncCarbonCredit(creditId: number): Promise<void> {
    try {
      const credit = await prisma.carbonCredit.findUnique({
        where: { id: creditId },
        include: { forest: true },
      });
      if (!credit) return;
      await this.writeCarbonCredit(credit);
      console.log(`✅ Synced carbon credit ${creditId} to Neo4j`);
    } catch (error) {
      console.error(`❌ Failed to sync carbon credit ${creditId}:`, error);
    }
  }

  async trackOrderMovement(orderId: number): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          items: { include: { carbonCredit: { include: { forest: true } } } },
        },
      });
      if (!order) return;

      await this.writeUser(order.user);
      await this.writeOrder(order);

      for (const item of order.items) {
        await this.writeCarbonCredit(item.carbonCredit);
        await this.writeOrderItemRelationships(order, item);
      }

      console.log(`✅ Tracked order movement ${orderId} in Neo4j`);
    } catch (error) {
      console.error(`❌ Failed to track order movement ${orderId}:`, error);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Private Neo4j write helpers — accept pre-loaded data, no DB calls  */
  /* ------------------------------------------------------------------ */

  private async writeUser(user: any): Promise<void> {
    const session = neo4jService.getSession();
    try {
      await session.run(
        `MERGE (u:User {id: $id})
         SET u.email = $email, u.name = $name, u.role = $role,
             u.createdAt = $createdAt, u.updatedAt = datetime()`,
        {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim() || 'Unknown',
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        },
      );
    } finally {
      await session.close();
    }
  }

  private async writeForest(forest: any): Promise<void> {
    const session = neo4jService.getSession();
    try {
      await session.run(
        `MERGE (f:Forest {id: $id})
         SET f.name = $name, f.location = $location, f.area = $area,
             f.type = $type, f.status = $status,
             f.lastUpdated = $lastUpdated, f.updatedAt = datetime()`,
        {
          id: forest.id,
          name: forest.name,
          location: forest.location,
          area: forest.area,
          type: forest.type,
          status: forest.status,
          lastUpdated: forest.lastUpdated.toISOString(),
        },
      );
    } finally {
      await session.close();
    }
  }

  private async writeCarbonCredit(credit: any): Promise<void> {
    const session = neo4jService.getSession();
    try {
      await session.run(
        `MERGE (c:CarbonCredit {id: $id})
         SET c.serialNumber = $serialNumber, c.totalCredits = $totalCredits,
             c.availableCredits = $availableCredits, c.retiredCredits = $retiredCredits,
             c.pricePerCredit = $pricePerCredit, c.vintage = $vintage,
             c.certification = $certification, c.createdAt = $createdAt,
             c.updatedAt = datetime()`,
        {
          id: credit.id,
          serialNumber: `CC-${credit.id}`,
          totalCredits: credit.totalCredits,
          availableCredits: credit.availableCredits,
          retiredCredits: credit.retiredCredits,
          pricePerCredit: credit.pricePerCredit,
          vintage: credit.vintage,
          certification: credit.certification,
          createdAt: credit.createdAt.toISOString(),
        },
      );

      if (credit.forest) {
        await this.writeForest(credit.forest);
        await session.run(
          `MATCH (c:CarbonCredit {id: $creditId})
           MATCH (f:Forest {id: $forestId})
           MERGE (f)-[r:GENERATES]->(c)
           SET r.createdAt = $createdAt`,
          {
            creditId: credit.id,
            forestId: credit.forest.id,
            createdAt: credit.createdAt.toISOString(),
          },
        );
      }
    } finally {
      await session.close();
    }
  }

  private async writeOrder(order: any): Promise<void> {
    const session = neo4jService.getSession();
    try {
      await session.run(
        `MERGE (o:Order {id: $id})
         SET o.status = $status, o.totalPrice = $totalPrice,
             o.totalCredits = $totalCredits, o.createdAt = $createdAt,
             o.paidAt = $paidAt, o.updatedAt = datetime()`,
        {
          id: order.id,
          status: order.status,
          totalPrice: order.totalPrice,
          totalCredits: order.totalCredits,
          createdAt: order.createdAt.toISOString(),
          paidAt: order.paidAt?.toISOString() || null,
        },
      );

      await session.run(
        `MATCH (u:User {id: $userId})
         MATCH (o:Order {id: $orderId})
         MERGE (u)-[r:PLACED]->(o)
         SET r.createdAt = $createdAt`,
        {
          userId: order.userId,
          orderId: order.id,
          createdAt: order.createdAt.toISOString(),
        },
      );
    } finally {
      await session.close();
    }
  }

  private async writeOrderItemRelationships(order: any, item: any): Promise<void> {
    const session = neo4jService.getSession();
    try {
      await session.run(
        `MATCH (o:Order {id: $orderId})
         MATCH (c:CarbonCredit {id: $creditId})
         MERGE (o)-[r:PURCHASES]->(c)
         SET r.quantity = $quantity, r.pricePerCredit = $pricePerCredit,
             r.subtotal = $subtotal, r.createdAt = $createdAt`,
        {
          orderId: order.id,
          creditId: item.carbonCreditId,
          quantity: item.quantity,
          pricePerCredit: item.pricePerCredit,
          subtotal: item.subtotal,
          createdAt: order.createdAt.toISOString(),
        },
      );

      if (order.status === OrderStatus.COMPLETED && order.paidAt) {
        await session.run(
          `MATCH (u:User {id: $userId})
           MATCH (c:CarbonCredit {id: $creditId})
           MERGE (u)-[r:OWNS]->(c)
           SET r.quantity = $quantity, r.acquiredAt = $acquiredAt, r.orderId = $orderId`,
          {
            userId: order.userId,
            creditId: item.carbonCreditId,
            quantity: item.quantity,
            acquiredAt: order.paidAt.toISOString(),
            orderId: order.id,
          },
        );
      }
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
        { limit },
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
            properties: startNode.properties,
          });
          nodeIds.add(startNodeId);
        }

        // Add end node
        const endNodeId = `${endNode.labels[0]}_${endNode.properties.id}`;
        if (!nodeIds.has(endNodeId)) {
          nodes.push({
            id: endNodeId,
            type: endNode.labels[0] as any,
            properties: endNode.properties,
          });
          nodeIds.add(endNodeId);
        }

        // Add relationship
        relationships.push({
          id: `${startNodeId}_${relationship.type}_${endNodeId}`,
          type: relationship.type,
          properties: relationship.properties,
          startNode: startNodeId,
          endNode: endNodeId,
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
   * Sync all existing data to Neo4j.
   * Batch-fetches everything from Postgres in 4 queries, then writes to Neo4j
   * without any additional DB round-trips.
   */
  async syncAllData(): Promise<void> {
    console.log('🔄 Starting full data sync to Neo4j...');

    try {
      await neo4jService.initializeSchema();

      const [users, forests, credits, orders] = await Promise.all([
        prisma.user.findMany(),
        prisma.forest.findMany(),
        prisma.carbonCredit.findMany({ include: { forest: true } }),
        prisma.order.findMany({
          include: {
            user: true,
            items: { include: { carbonCredit: { include: { forest: true } } } },
          },
        }),
      ]);

      for (const user of users) {
        await this.writeUser(user);
      }

      for (const forest of forests) {
        await this.writeForest(forest);
      }

      for (const credit of credits) {
        await this.writeCarbonCredit(credit);
      }

      for (const order of orders) {
        await this.writeOrder(order);
        for (const item of order.items) {
          await this.writeCarbonCredit(item.carbonCredit);
          await this.writeOrderItemRelationships(order, item);
        }
      }

      console.log('✅ Full data sync to Neo4j completed');
    } catch (error) {
      console.error('❌ Failed to sync all data:', error);
    }
  }
}

export const carbonMovementService = new CarbonMovementService();
