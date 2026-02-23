'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphNode {
  id: string;
  type: 'User' | 'Forest' | 'CarbonCredit' | 'Order' | 'Certificate';
  properties: Record<string, any>;
  val?: number;
  color?: string;
}

interface GraphLink {
  id: string;
  type: string;
  properties: Record<string, any>;
  source: string;
  target: string;
  value?: number;
  color?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const NODE_COLORS = {
  User: '#3B82F6', // Blue
  Forest: '#10B981', // Green
  CarbonCredit: '#8B5CF6', // Purple
  Order: '#F59E0B', // Amber
  Certificate: '#EF4444', // Red
};

const LINK_COLORS = {
  GENERATES: '#10B981', // Green
  PLACED: '#3B82F6', // Blue
  PURCHASES: '#F59E0B', // Amber
  OWNS: '#8B5CF6', // Purple
  TRANSFERS_TO: '#8B5CF6', // Purple - User to user transfers
  TRANSFERS_CREDIT: '#A855F7', // Light Purple - Credit lifecycle transfers
  GENERATES_CERTIFICATE: '#EF4444', // Red
  CERTIFIES: '#EF4444', // Red
};

export default function CarbonMovementGraphPage() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [limit, setLimit] = useState(50);
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null);
  const [searchUser, setSearchUser] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filteredGraphData, setFilteredGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [graphStats, setGraphStats] = useState({ nodeCount: 0, relationshipCount: 0 });
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const { toast } = useToast();

  // Test Neo4j connection
  const testConnection = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/neo4j/test');
      const data = await response.json();

      if (data.success) {
        setIsConnected(true);
        toast({
          title: 'Neo4j Connected',
          description: 'Connected to Neo4j graph database',
        });
      } else {
        setIsConnected(false);
        toast({
          title: 'Connection Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      setIsConnected(false);
      toast({
        title: 'Connection Error',
        description: `Failed to connect to Neo4j: ${error}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Sync data to Neo4j
  const syncData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/neo4j/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sync Started',
          description: data.message,
        });
        await new Promise((r) => setTimeout(r, 3000));
        await loadGraphData();
      } else {
        toast({
          title: 'Sync Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Sync Error',
        description: `Failed to sync data: ${error}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load graph data from Neo4j
  const loadGraphData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());

      const response = await fetch(`/api/neo4j/graph?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const rawNodes = data.data.nodes || [];
        const rawRels = data.data.relationships || [];

        const nodes: GraphNode[] = rawNodes.map((node: GraphNode) => ({
          ...node,
          val: 5 + (node.type === 'CarbonCredit' ? 3 : 0),
          color: NODE_COLORS[node.type as keyof typeof NODE_COLORS] || '#6B7280',
        }));

        const links: GraphLink[] = rawRels.map((rel: any) => ({
          id: rel.id,
          type: rel.type,
          properties: rel.properties,
          source: rel.startNode,
          target: rel.endNode,
          value: 1,
          color: LINK_COLORS[rel.type as keyof typeof LINK_COLORS] || '#6B7280',
        }));

        // Client-side node type filter
        if (selectedNodeTypes.length > 0) {
          const filteredNodeIds = new Set(
            nodes.filter((n) => selectedNodeTypes.includes(n.type)).map((n) => n.id),
          );
          const filteredNodes = nodes.filter((n) => filteredNodeIds.has(n.id));
          const filteredLinks = links.filter(
            (l) =>
              filteredNodeIds.has(l.source as string) && filteredNodeIds.has(l.target as string),
          );
          setGraphData({ nodes: filteredNodes, links: filteredLinks });
          setGraphStats({
            nodeCount: filteredNodes.length,
            relationshipCount: filteredLinks.length,
          });
        } else {
          setGraphData({ nodes, links });
          setGraphStats({ nodeCount: nodes.length, relationshipCount: links.length });
        }

        setInitialLoadDone(true);
        toast({
          title: 'Graph Loaded',
          description: `Loaded ${nodes.length} nodes and ${links.length} relationships from Neo4j`,
        });
      } else {
        toast({
          title: 'Load Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Load Error',
        description: `Failed to load graph data: ${error}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [limit, selectedNodeTypes, toast]);

  // Node click handler (react-force-graph-2d passes generic node; our graphData uses GraphNode)
  const handleNodeClick = useCallback((node: unknown) => {
    setSelectedNode(node as GraphNode);
    setSelectedLink(null); // Clear link selection when node is clicked
  }, []);

  // Link click handler
  const handleLinkClick = useCallback((link: unknown) => {
    setSelectedLink(link as GraphLink);
    setSelectedNode(null); // Clear node selection when link is clicked
  }, []);

  const getNodeLabel = useCallback((node: unknown): string => {
    const graphNode = node as GraphNode;
    if (!graphNode.type || !graphNode.properties) {
      return (graphNode as { id?: string }).id || 'Unknown';
    }
    switch (graphNode.type) {
      case 'User':
        return graphNode.properties.email || `User ${graphNode.properties.id}`;
      case 'Forest':
        return graphNode.properties.name || `Forest ${graphNode.properties.id}`;
      case 'CarbonCredit':
        return `Credit ${graphNode.properties.serialNumber || graphNode.properties.id}`;
      case 'Order':
        return `Order #${graphNode.properties.id}`;
      default:
        return `${graphNode.type} ${graphNode.properties.id}`;
    }
  }, []);

  const nodeCanvasObject = useCallback(
    (node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode & { x?: number; y?: number };
      const label = getNodeLabel(node);
      const fontSize = 12 / globalScale;
      ctx.font = `${fontSize}px Sans-Serif`;
      const textWidth = ctx.measureText(label).width;
      const bckgDimensions = [textWidth, fontSize].map((d) => d + fontSize * 0.2) as [
        number,
        number,
      ];

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(
        (n.x || 0) - bckgDimensions[0] / 2,
        (n.y || 0) - bckgDimensions[1] / 2,
        bckgDimensions[0],
        bckgDimensions[1],
      );

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = n.color || '#6B7280';
      ctx.fillText(label, n.x || 0, n.y || 0);
    },
    [getNodeLabel],
  );

  const getLinkEndpointLabel = useCallback((endpoint: string | GraphNode | any): string => {
    if (typeof endpoint === 'string') return endpoint;
    if (endpoint && typeof endpoint === 'object' && endpoint.id) return endpoint.id;
    return String(endpoint);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchUser), 300);
    return () => clearTimeout(id);
  }, [searchUser]);

  useEffect(() => {
    testConnection().then(() => loadGraphData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload graph data when limit changes (with debouncing)
  useEffect(() => {
    if (initialLoadDone) {
      const timeoutId = setTimeout(() => {
        loadGraphData();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setFilteredGraphData(graphData);
      return;
    }

    const searchLower = debouncedSearch.toLowerCase();

    // Find matching user nodes
    const matchingUsers = graphData.nodes.filter(
      (node) =>
        node.type === 'User' &&
        (node.properties.name?.toLowerCase().includes(searchLower) ||
          node.properties.email?.toLowerCase().includes(searchLower) ||
          node.id.toLowerCase().includes(searchLower)),
    );

    if (matchingUsers.length === 0) {
      setFilteredGraphData({ nodes: [], links: [] });
      return;
    }

    const matchingUserIds = new Set(matchingUsers.map((u) => u.id));

    // Build the complete chain of nodes and links
    const relatedNodeIds = new Set<string>(matchingUserIds);
    const relatedLinks: GraphLink[] = [];
    const processedLinks = new Set<string>();

    // Step 1: Get direct links from the user to Orders only (exclude user-to-user transfers)
    graphData.links.forEach((link) => {
      const linkId = link.id;
      if (processedLinks.has(linkId)) return;

      // Only include if it's from the filtered user and NOT a TRANSFERS_TO link
      if (matchingUserIds.has(link.source as string) && link.type !== 'TRANSFERS_TO') {
        relatedLinks.push(link);
        processedLinks.add(linkId);
        relatedNodeIds.add(link.source as string);
        relatedNodeIds.add(link.target as string);
      }
    });

    // Step 2: Get intermediate nodes (Orders, Credits, Certificates) from Step 1
    const intermediateNodeIds = new Set<string>();
    relatedNodeIds.forEach((nodeId) => {
      const node = graphData.nodes.find((n) => n.id === nodeId);
      if (
        node &&
        (node.type === 'Order' || node.type === 'CarbonCredit' || node.type === 'Certificate')
      ) {
        intermediateNodeIds.add(nodeId);
      }
    });

    // Step 3: Find all links connected to intermediate nodes to complete the chain
    graphData.links.forEach((link) => {
      const linkId = link.id;
      if (processedLinks.has(linkId)) return;

      // If source or target is an intermediate node, include this link
      if (
        intermediateNodeIds.has(link.source as string) ||
        intermediateNodeIds.has(link.target as string)
      ) {
        relatedLinks.push(link);
        processedLinks.add(linkId);
        relatedNodeIds.add(link.source as string);
        relatedNodeIds.add(link.target as string);
      }
    });

    // Get all related nodes
    const relatedNodes = graphData.nodes.filter((node) => relatedNodeIds.has(node.id));

    setFilteredGraphData({
      nodes: relatedNodes,
      links: relatedLinks,
    });
  }, [debouncedSearch, graphData]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Carbon Credit Movement Graph</h1>
          <p className="text-gray-600 mt-2">
            Visualize carbon credit transactions and ownership flows
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button onClick={testConnection} disabled={isLoading} variant="outline">
            Test Connection
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Graph Controls</CardTitle>
          <CardDescription>Manage your carbon credit movement graph</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="limit">Limit:</Label>
              <Input
                id="limit"
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                className="w-20"
                min="10"
                max="500"
              />
            </div>
            <div className="flex items-center space-x-2 flex-1">
              <Label htmlFor="searchUser">Filter User:</Label>
              <Input
                id="searchUser"
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="flex-1 max-w-xs"
              />
              {searchUser && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchUser('')}
                  className="px-2"
                >
                  Clear
                </Button>
              )}
            </div>
            <Button onClick={syncData} disabled={isLoading}>
              {isLoading ? 'Syncing...' : 'Sync Data'}
            </Button>
            <Button onClick={loadGraphData} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Load Graph'}
            </Button>
          </div>

          {/* Legend */}
          <div>
            <Label className="text-sm font-medium">Node Types:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(NODE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center space-x-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs">{type}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Relationship Types:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5" style={{ backgroundColor: '#8B5CF6' }} />
                <span className="text-xs">User Transfers</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5" style={{ backgroundColor: '#A855F7' }} />
                <span className="text-xs">Credit Lifecycle</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5" style={{ backgroundColor: '#10B981' }} />
                <span className="text-xs">Forest Generates</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5" style={{ backgroundColor: '#3B82F6' }} />
                <span className="text-xs">User Places Order</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5" style={{ backgroundColor: '#F59E0B' }} />
                <span className="text-xs">Order Purchases</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5" style={{ backgroundColor: '#EF4444' }} />
                <span className="text-xs">Certificate</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {searchUser ? 'Filtered Nodes' : 'Total Nodes'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredGraphData.nodes.length}</div>
            <p className="text-xs text-muted-foreground">
              {searchUser ? `Showing nodes for filtered user` : `Users, Credits, Orders, Forests`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {searchUser ? 'Filtered Relationships' : 'Total Relationships'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredGraphData.links.length}</div>
            <p className="text-xs text-muted-foreground">
              {searchUser ? `Transactions involving filtered user` : `Connections between entities`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredGraphData.links.length}</div>
            <p className="text-xs text-muted-foreground">Currently visible relationships</p>
          </CardContent>
        </Card>
      </div>

      {/* Graph Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Movement Graph</CardTitle>
                <CardDescription>Interactive visualization of carbon credit flows</CardDescription>
              </div>
              {searchUser && (
                <Badge variant="secondary" className="ml-2">
                  Filtered: {searchUser}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96 w-full border rounded overflow-hidden relative">
              {filteredGraphData.nodes.length > 0 ? (
                <ForceGraph2D
                  graphData={filteredGraphData}
                  width={800}
                  height={384}
                  nodeLabel={getNodeLabel}
                  nodeColor="color"
                  linkColor="color"
                  onNodeClick={handleNodeClick}
                  onLinkClick={handleLinkClick}
                  nodeCanvasObject={nodeCanvasObject}
                  linkDirectionalArrowLength={3.5}
                  linkDirectionalArrowRelPos={1}
                  linkCurvature={0.25}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    {searchUser ? (
                      <>
                        <p>No matching users found</p>
                        <p className="text-sm">Try a different search term or clear the filter</p>
                      </>
                    ) : (
                      <>
                        <p>No graph data available</p>
                        <p className="text-sm">
                          Click &quot;Load Graph&quot; to visualize carbon credit movements
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Node Details */}
        <Card>
          <CardHeader>
            <CardTitle>{selectedLink ? 'Transfer Details' : 'Node Details'}</CardTitle>
            <CardDescription>
              {selectedLink
                ? 'Click on a link to see transfer details'
                : 'Click on a node to see its details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedLink ? (
              <div className="space-y-3">
                <div>
                  <Badge style={{ backgroundColor: selectedLink.color }}>{selectedLink.type}</Badge>
                </div>

                {(selectedLink.type === 'TRANSFERS_TO' ||
                  selectedLink.type === 'TRANSFERS_CREDIT') && (
                  <>
                    <div>
                      <Label className="text-sm font-medium">From → To:</Label>
                      <p className="text-sm">
                        {getLinkEndpointLabel(selectedLink.source)} →{' '}
                        {getLinkEndpointLabel(selectedLink.target)}
                      </p>
                    </div>
                    {selectedLink.type === 'TRANSFERS_CREDIT' &&
                      selectedLink.properties.creditId && (
                        <div>
                          <Label className="text-sm font-medium">Credit ID:</Label>
                          <p className="text-sm font-mono">{selectedLink.properties.creditId}</p>
                        </div>
                      )}
                    {selectedLink.properties.stage && (
                      <div>
                        <Label className="text-sm font-medium">Lifecycle Stage:</Label>
                        <Badge variant="outline">{selectedLink.properties.stage}</Badge>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium">Quantity:</Label>
                      <p className="text-lg font-bold">
                        {selectedLink.properties.quantity} credits
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Price per Credit:</Label>
                      <p className="text-sm">${selectedLink.properties.pricePerCredit}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total Price:</Label>
                      <p className="text-sm font-bold">
                        ${selectedLink.properties.totalPrice?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Transfer Type:</Label>
                      <p className="text-sm">
                        {selectedLink.properties.transferType || 'Secondary Market'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status:</Label>
                      <Badge
                        variant={
                          selectedLink.properties.status === 'Completed' ? 'default' : 'secondary'
                        }
                      >
                        {selectedLink.properties.status || 'Completed'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Reason:</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedLink.properties.reason}
                      </p>
                    </div>
                    {selectedLink.properties.transactionHash && (
                      <div>
                        <Label className="text-sm font-medium">Transaction Hash:</Label>
                        <p className="text-xs font-mono break-all">
                          {selectedLink.properties.transactionHash}
                        </p>
                      </div>
                    )}
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium">Transfer Date:</Label>
                      <p className="text-sm">
                        {new Date(selectedLink.properties.transferDate).toLocaleString()}
                      </p>
                    </div>
                  </>
                )}

                {selectedLink.type === 'PURCHASES' && (
                  <>
                    <div>
                      <Label className="text-sm font-medium">Order → Credit:</Label>
                      <p className="text-sm">
                        {selectedLink.source} → {selectedLink.target}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Quantity:</Label>
                      <p className="text-sm">{selectedLink.properties.quantity} credits</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total Price:</Label>
                      <p className="text-sm">
                        ${selectedLink.properties.totalPrice?.toLocaleString()}
                      </p>
                    </div>
                  </>
                )}

                {selectedLink.type === 'GENERATES' && (
                  <>
                    <div>
                      <Label className="text-sm font-medium">Forest → Credit:</Label>
                      <p className="text-sm">
                        {selectedLink.source} → {selectedLink.target}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Generated:</Label>
                      <p className="text-sm">{selectedLink.properties.quantity} credits</p>
                    </div>
                  </>
                )}
              </div>
            ) : selectedNode ? (
              <div className="space-y-3">
                <div>
                  <Badge style={{ backgroundColor: selectedNode.color }}>{selectedNode.type}</Badge>
                </div>

                <div>
                  <Label className="text-sm font-medium">ID:</Label>
                  <p className="text-sm">{selectedNode.properties.id}</p>
                </div>

                {selectedNode.type === 'User' && (
                  <>
                    <div>
                      <Label className="text-sm font-medium">Email:</Label>
                      <p className="text-sm">{selectedNode.properties.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Role:</Label>
                      <p className="text-sm">{selectedNode.properties.role}</p>
                    </div>
                  </>
                )}

                {selectedNode.type === 'CarbonCredit' && (
                  <>
                    <div>
                      <Label className="text-sm font-medium">Serial Number:</Label>
                      <p className="text-sm">{selectedNode.properties.serialNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Quantity:</Label>
                      <p className="text-sm">{selectedNode.properties.quantity} tons CO2</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Price per Credit:</Label>
                      <p className="text-sm">${selectedNode.properties.pricePerCredit}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status:</Label>
                      <Badge
                        variant={
                          selectedNode.properties.status === 'Retired' ? 'destructive' : 'default'
                        }
                      >
                        {selectedNode.properties.status || 'Available'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Certification:</Label>
                      <p className="text-sm">{selectedNode.properties.certification || 'N/A'}</p>
                    </div>
                  </>
                )}

                {selectedNode.type === 'Order' && (
                  <>
                    <div>
                      <Label className="text-sm font-medium">Status:</Label>
                      <Badge
                        variant={
                          selectedNode.properties.status === 'Completed' ? 'default' : 'secondary'
                        }
                      >
                        {selectedNode.properties.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total Price:</Label>
                      <p className="text-sm">${selectedNode.properties.totalPrice}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total Credits:</Label>
                      <p className="text-sm">{selectedNode.properties.totalCredits}</p>
                    </div>
                  </>
                )}

                {selectedNode.type === 'Forest' && (
                  <>
                    <div>
                      <Label className="text-sm font-medium">Name:</Label>
                      <p className="text-sm">{selectedNode.properties.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Location:</Label>
                      <p className="text-sm">{selectedNode.properties.location}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Area:</Label>
                      <p className="text-sm">{selectedNode.properties.area} hectares</p>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <Label className="text-sm font-medium">Created:</Label>
                  <p className="text-sm">
                    {new Date(selectedNode.properties.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Select a node or link to view details</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
