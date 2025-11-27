import { neo4jService } from './src/lib/neo4j-service';
import { carbonMovementService } from './src/lib/carbon-movement-service';

async function testNeo4j() {
  console.log('🧪 Testing Neo4j Setup...\n');

  try {
    // Test connection
    console.log('1. Testing connection...');
    const isConnected = await neo4jService.testConnection();
    if (!isConnected) {
      console.error('❌ Neo4j connection failed');
      return;
    }
    console.log('✅ Neo4j connected successfully\n');

    // Initialize schema
    console.log('2. Initializing schema...');
    await neo4jService.initializeSchema();
    console.log('✅ Schema initialized\n');

    // Sync all data
    console.log('3. Syncing all data...');
    await carbonMovementService.syncAllData();
    console.log('✅ Data sync completed\n');

    // Check graph data
    console.log('4. Checking graph data...');
    const graphData = await carbonMovementService.getCarbonCreditMovementGraph(10);
    console.log(`📊 Graph contains ${graphData.nodes.length} nodes and ${graphData.relationships.length} relationships`);
    
    if (graphData.nodes.length > 0) {
      console.log('\nSample nodes:');
      graphData.nodes.slice(0, 3).forEach(node => {
        console.log(`  - ${node.type}: ${JSON.stringify(node.properties)}`);
      });
    }

    if (graphData.relationships.length > 0) {
      console.log('\nSample relationships:');
      graphData.relationships.slice(0, 3).forEach(rel => {
        console.log(`  - ${rel.type}: ${rel.startNode} -> ${rel.endNode}`);
      });
    }

    // Test specific query
    console.log('\n5. Testing custom query...');
    const session = neo4jService.getSession();
    try {
      const result = await session.run('MATCH (n) RETURN count(n) as totalNodes');
      const totalNodes = result.records[0].get('totalNodes').toNumber();
      console.log(`📈 Total nodes in database: ${totalNodes}`);
    } finally {
      await session.close();
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testNeo4j();