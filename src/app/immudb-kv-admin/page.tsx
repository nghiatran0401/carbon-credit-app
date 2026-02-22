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

/** Transaction record as returned by ImmuDB debug/API */
interface ImmuDBTransaction {
  hash?: string;
  timestamp?: number;
  [key: string]: unknown;
}

interface KeyValuePair {
  key: string;
  value: string;
  timestamp?: number;
  parsedValue?: unknown;
}

interface DebugResult {
  success: boolean;
  logs: string[];
  testTransaction?: ImmuDBTransaction;
  retrievedTransaction?: ImmuDBTransaction;
  totalTransactions: number;
  allTransactions: ImmuDBTransaction[];
  error?: string;
}

export default function ImmudbKeyValueAdmin() {
  const [isLoading, setIsLoading] = useState(false);
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [keyValuePairs, setKeyValuePairs] = useState<KeyValuePair[]>([]);
  const [searchKey, setSearchKey] = useState('');
  const [searchResult, setSearchResult] = useState<KeyValuePair | null>(null);
  const [selectedKV, setSelectedKV] = useState<KeyValuePair | null>(null);

  const { toast } = useToast();

  const runDebugTest = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/immudb/debug');
      const data = await response.json();
      setDebugResult(data);

      if (data.success) {
        // Convert transactions to key-value pairs
        const kvPairs: KeyValuePair[] = data.allTransactions.map((tx: ImmuDBTransaction) => ({
          key: `tx_${tx.hash}`,
          value: JSON.stringify(tx),
          timestamp: tx.timestamp,
          parsedValue: tx,
        }));
        setKeyValuePairs(kvPairs);

        toast({
          title: 'Debug Complete',
          description: `Found ${data.totalTransactions} key-value pairs`,
        });
      } else {
        toast({
          title: 'Debug Failed',
          description: data.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Debug Error',
        description: `Failed to run debug test: ${error}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchForKey = async () => {
    if (!searchKey.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a key to search',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Try to get the key directly (assuming it's a transaction hash)
      const response = await fetch(
        `/api/immudb/transactions?hash=${encodeURIComponent(searchKey)}`,
      );
      const data = await response.json();

      if (data.success && data.data) {
        const kv: KeyValuePair = {
          key: `tx_${searchKey}`,
          value: JSON.stringify(data.data),
          timestamp: data.data.timestamp,
          parsedValue: data.data,
        };
        setSearchResult(kv);
        toast({
          title: 'Key Found',
          description: 'Key-value pair retrieved successfully',
        });
      } else {
        setSearchResult(null);
        toast({
          title: 'Key Not Found',
          description: 'No value found for this key',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Search Error',
        description: `Failed to search for key: ${error}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatValue = (value: string, maxLength: number = 100) => {
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + '...';
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  useEffect(() => {
    // runDebugTest();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ImmuDB Key-Value Store Viewer</h1>
        <Button onClick={runDebugTest} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh Data'}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="key-values">Key-Value Pairs</TabsTrigger>
          <TabsTrigger value="search">Search Key</TabsTrigger>
          <TabsTrigger value="debug-logs">Debug Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle>Database Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {debugResult?.success ? 'Connected' : 'Disconnected'}
                  </div>
                  <div className="text-sm text-gray-600">Connection Status</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {debugResult?.totalTransactions || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Keys</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">Key-Value</div>
                  <div className="text-sm text-gray-600">Storage Type</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => window.open('http://localhost:8080', '_blank')}
                  variant="outline"
                >
                  Open ImmuDB Console
                </Button>
                <Button onClick={() => window.open('/immudb-test', '_blank')} variant="outline">
                  Test Interface
                </Button>
                <Button onClick={runDebugTest} variant="outline" disabled={isLoading}>
                  Run Debug Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sample Keys */}
          {keyValuePairs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sample Key-Value Pairs</CardTitle>
                <CardDescription>First 5 keys in the database</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {keyValuePairs.slice(0, 5).map((kv, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                    >
                      <div className="flex-1">
                        <div className="font-mono text-sm font-medium">{kv.key}</div>
                        <div className="text-xs text-gray-600">{formatValue(kv.value, 80)}</div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedKV(kv)}>
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="key-values" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Key-Value Pairs ({keyValuePairs.length})</CardTitle>
              <CardDescription>Complete list of keys and values stored in ImmuDB</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {keyValuePairs.map((kv, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm font-medium">Key</div>
                        <div className="font-mono text-xs break-all">{kv.key}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Value Preview</div>
                        <div className="text-xs text-gray-600 break-all">
                          {formatValue(kv.value, 60)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">Timestamp</div>
                          <div className="text-xs">{formatTimestamp(kv.timestamp)}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedKV(kv)}>
                          View Full
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {keyValuePairs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No key-value pairs found.</p>
                    <p className="text-sm">
                      Try running the debug test or storing some data first.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search by Key</CardTitle>
              <CardDescription>
                Search for a specific key in the ImmuDB key-value store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  placeholder="Enter key or transaction hash to search..."
                  className="flex-1"
                />
                <Button onClick={searchForKey} disabled={isLoading}>
                  {isLoading ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {searchResult && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Search Result:</h4>
                  <div className="space-y-2">
                    <div>
                      <Label>Key</Label>
                      <div className="font-mono text-sm bg-white p-2 rounded border">
                        {searchResult.key}
                      </div>
                    </div>
                    <div>
                      <Label>Value</Label>
                      <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                        {JSON.stringify(searchResult.parsedValue || searchResult.value, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <Label>Timestamp</Label>
                      <div className="text-sm">{formatTimestamp(searchResult.timestamp)}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug-logs">
          <Card>
            <CardHeader>
              <CardTitle>Debug Logs</CardTitle>
              <CardDescription>Detailed logs from the last debug test execution</CardDescription>
            </CardHeader>
            <CardContent>
              {debugResult?.logs ? (
                <div className="space-y-2">
                  {debugResult.logs.map((log, index) => (
                    <div key={index} className="font-mono text-sm p-2 bg-gray-100 rounded">
                      {log}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">
                  No debug logs available. Run a debug test to see logs.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Key-Value Detail Modal */}
      {selectedKV && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-96 overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Key-Value Pair Details</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setSelectedKV(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Key</Label>
                <div className="font-mono text-sm break-all bg-gray-100 p-3 rounded">
                  {selectedKV.key}
                </div>
              </div>

              <div>
                <Label>Raw Value</Label>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                  {selectedKV.value}
                </pre>
              </div>

              {selectedKV.parsedValue != null ? (
                <div>
                  <Label>Parsed Value (JSON)</Label>
                  <pre className="text-xs bg-blue-50 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedKV.parsedValue as object, null, 2)}
                  </pre>
                </div>
              ) : null}

              <div>
                <Label>Timestamp</Label>
                <div className="text-sm">{formatTimestamp(selectedKV.timestamp)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
