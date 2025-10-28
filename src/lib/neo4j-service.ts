import neo4j, { Driver, Session } from 'neo4j-driver';

class Neo4jService {
  private driver: Driver;
  private static instance: Neo4jService;

  private constructor() {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    console.log('Neo4j driver created');
  }

  public static getInstance(): Neo4jService {
    if (!Neo4jService.instance) {
      Neo4jService.instance = new Neo4jService();
    }
    return Neo4jService.instance;
  }

  public getSession(): Session {
    return this.driver.session();
  }

  public async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
    }
  }

  // Test connection
  public async testConnection(): Promise<boolean> {
    const session = this.getSession();
    try {
      const result = await session.run('RETURN 1 as test');
      console.log('Neo4j connection successful');
      return true;
    } catch (error) {
      console.error('Neo4j connection failed:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  // Initialize graph schema and constraints
  public async initializeSchema(): Promise<void> {
    const session = this.getSession();
    try {
      // Create constraints and indexes
      const queries = [
        // User node constraints
        `CREATE CONSTRAINT user_id_unique IF NOT EXISTS 
         FOR (u:User) REQUIRE u.id IS UNIQUE`,
        
        // CarbonCredit node constraints
        `CREATE CONSTRAINT credit_id_unique IF NOT EXISTS 
         FOR (c:CarbonCredit) REQUIRE c.id IS UNIQUE`,
        
        // Order node constraints
        `CREATE CONSTRAINT order_id_unique IF NOT EXISTS 
         FOR (o:Order) REQUIRE o.id IS UNIQUE`,
        
        // Forest node constraints
        `CREATE CONSTRAINT forest_id_unique IF NOT EXISTS 
         FOR (f:Forest) REQUIRE f.id IS UNIQUE`,
        
        // Certificate node constraints
        `CREATE CONSTRAINT certificate_id_unique IF NOT EXISTS 
         FOR (cert:Certificate) REQUIRE cert.id IS UNIQUE`,
        
        // Create indexes for better performance
        `CREATE INDEX user_email_index IF NOT EXISTS 
         FOR (u:User) ON (u.email)`,
        
        `CREATE INDEX credit_serial_index IF NOT EXISTS 
         FOR (c:CarbonCredit) ON (c.serialNumber)`,
        
        `CREATE INDEX order_date_index IF NOT EXISTS 
         FOR (o:Order) ON (o.createdAt)`,
      ];

      for (const query of queries) {
        try {
          await session.run(query);
          console.log(`✅ Schema query executed: ${query.split('\n')[0].trim()}`);
        } catch (error: any) {
          if (!error.message.includes('already exists')) {
            console.error(`❌ Schema query failed: ${query.split('\n')[0].trim()}`, error.message);
          }
        }
      }

      console.log('✅ Neo4j schema initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Neo4j schema:', error);
    } finally {
      await session.close();
    }
  }
}

export const neo4jService = Neo4jService.getInstance();