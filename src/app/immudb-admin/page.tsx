'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface TransactionHash {
  hash: string;
  timestamp: number;
  blockNumber?: number;
  transactionType: string;
  metadata?: Record<string, any>;
}

interface DatabaseStats {
  totalTransactions: number;
  transactionTypes: Record<string, number>;
  recentTransactions: TransactionHash[];
}

export default function ImmudbAdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [allTransactions, setAllTransactions] = useState<TransactionHash[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionHash[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionHash | null>(null);
  const [filterType, setFilterType] = useState('all');

  const { toast } = useToast();

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load all transactions
      const response = await fetch('/api/immudb/transactions?limit=1000');
      const data = await response.json();

      if (data.success) {
        const transactions = data.data as TransactionHash[];
        setAllTransactions(transactions);
        setFilteredTransactions(transactions);

        // Calculate stats
        const typeCount: Record<string, number> = {};
        transactions.forEach((tx) => {
          typeCount[tx.transactionType] = (typeCount[tx.transactionType] || 0) + 1;
        });

        setStats({
          totalTransactions: transactions.length,
          transactionTypes: typeCount,
          recentTransactions: transactions.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10),
        });
      }
    } catch (error) {
      toast({
        title: 'Load Error',
        description: `Failed to load dashboard data: ${error}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredTransactions(allTransactions);
      return;
    }

    const filtered = allTransactions.filter(
      (tx) =>
        tx.hash.toLowerCase().includes(query.toLowerCase()) ||
        tx.transactionType.toLowerCase().includes(query.toLowerCase()) ||
        (tx.blockNumber && tx.blockNumber.toString().includes(query)) ||
        (tx.metadata && JSON.stringify(tx.metadata).toLowerCase().includes(query.toLowerCase())),
    );

    setFilteredTransactions(filtered);
  };

  const handleTypeFilter = (type: string) => {
    setFilterType(type);
    if (type === 'all') {
      setFilteredTransactions(allTransactions);
    } else {
      const filtered = allTransactions.filter((tx) => tx.transactionType === type);
      setFilteredTransactions(filtered);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateHash = (hash: string, length: number = 16) => {
    return hash.length > length ? `${hash.substring(0, length)}...` : hash;
  };

  useEffect(() => {
    loadDashboardData();
    // Intentional: run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handleSearch(searchQuery);
    // handleSearch filters allTransactions; listing it would cause unnecessary re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, allTransactions]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ImmuDB Admin Console</h1>
        <Button onClick={loadDashboardData} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="transactions">Browse Transactions</TabsTrigger>
          <TabsTrigger value="raw-query">Raw Query</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalTransactions || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Transaction Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.keys(stats?.transactionTypes || {}).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Database Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="default">Connected</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Types Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Types Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats?.transactionTypes || {}).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="font-medium">{type}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{count} transactions</span>
                      <Badge variant="outline">
                        {((count / (stats?.totalTransactions || 1)) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest 10 transactions stored in ImmuDB</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats?.recentTransactions.map((tx, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                  >
                    <div>
                      <div className="font-mono text-sm">{truncateHash(tx.hash)}</div>
                      <div className="text-xs text-gray-600">
                        {tx.transactionType} • {formatTimestamp(tx.timestamp)}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedTransaction(tx)}>
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          {/* Search and Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="search">Search transactions</Label>
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by hash, type, block number, or metadata..."
                />
              </div>

              <div>
                <Label>Filter by type</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant={filterType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTypeFilter('all')}
                  >
                    All ({allTransactions.length})
                  </Button>
                  {Object.entries(stats?.transactionTypes || {}).map(([type, count]) => (
                    <Button
                      key={type}
                      variant={filterType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleTypeFilter(type)}
                    >
                      {type} ({count})
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredTransactions.map((tx, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm font-medium">Hash</div>
                        <div className="font-mono text-xs break-all">{tx.hash}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Type</div>
                        <Badge variant="outline">{tx.transactionType}</Badge>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Timestamp</div>
                        <div className="text-xs">{formatTimestamp(tx.timestamp)}</div>
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTransaction(tx)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                    {tx.blockNumber && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-600">Block: {tx.blockNumber}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw-query">
          <Card>
            <CardHeader>
              <CardTitle>Raw Query Interface</CardTitle>
              <CardDescription>Execute raw queries against ImmuDB</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <p>Raw query interface coming soon...</p>
                <p className="text-sm">For now, use the REST API endpoints directly:</p>
                <div className="mt-4 space-y-1 text-xs font-mono">
                  <div>GET /api/immudb/transactions - List all transactions</div>
                  <div>GET /api/immudb/transactions?hash=... - Get specific transaction</div>
                  <div>GET /api/immudb/verify?hash=... - Verify transaction</div>
                  <div>GET /api/immudb/history?hash=... - Get transaction history</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-96 overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Transaction Details</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setSelectedTransaction(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Hash</Label>
                <div className="font-mono text-sm break-all bg-gray-100 p-2 rounded">
                  {selectedTransaction.hash}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <div>
                    <Badge>{selectedTransaction.transactionType}</Badge>
                  </div>
                </div>
                <div>
                  <Label>Timestamp</Label>
                  <div className="text-sm">{formatTimestamp(selectedTransaction.timestamp)}</div>
                </div>
              </div>

              {selectedTransaction.blockNumber && (
                <div>
                  <Label>Block Number</Label>
                  <div className="text-sm">{selectedTransaction.blockNumber}</div>
                </div>
              )}

              {selectedTransaction.metadata &&
                Object.keys(selectedTransaction.metadata).length > 0 && (
                  <div>
                    <Label>Metadata</Label>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
