'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface TransactionHash {
  hash: string;
  timestamp: number;
  blockNumber?: number;
  transactionType: string;
  metadata?: Record<string, any>;
}

interface ConnectionStatus {
  connected: boolean;
  message: string;
  timestamp: string;
}

export default function ImmudbTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<TransactionHash[]>([]);
  const [newTransaction, setNewTransaction] = useState({
    hash: '',
    transactionType: '',
    blockNumber: '',
    metadata: '',
  });
  const [searchHash, setSearchHash] = useState('');
  const [searchResult, setSearchResult] = useState<TransactionHash | null>(null);
  const [verifyHash, setVerifyHash] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; message: string } | null>(null);
  
  const { toast } = useToast();

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/immudb/test-connection');
      const data = await response.json();
      setConnectionStatus(data);
      
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to ImmuDB",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: `Failed to test connection: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const storeTransaction = async () => {
    if (!newTransaction.hash || !newTransaction.transactionType) {
      toast({
        title: "Validation Error",
        description: "Hash and Transaction Type are required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        hash: newTransaction.hash,
        transactionType: newTransaction.transactionType,
        blockNumber: newTransaction.blockNumber ? parseInt(newTransaction.blockNumber) : undefined,
        metadata: newTransaction.metadata ? JSON.parse(newTransaction.metadata) : {},
      };

      const response = await fetch('/api/immudb/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Transaction Stored",
          description: "Transaction hash stored successfully",
        });
        setNewTransaction({ hash: '', transactionType: '', blockNumber: '', metadata: '' });
        loadAllTransactions(); // Refresh the list
      } else {
        toast({
          title: "Storage Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Storage Error",
        description: `Failed to store transaction: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/immudb/transactions');
      const data = await response.json();

      if (data.success) {
        setTransactions(data.data);
      } else {
        toast({
          title: "Load Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Load Error",
        description: `Failed to load transactions: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchTransaction = async () => {
    if (!searchHash) {
      toast({
        title: "Validation Error",
        description: "Please enter a hash to search",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/immudb/transactions?hash=${encodeURIComponent(searchHash)}`);
      const data = await response.json();

      if (data.success) {
        setSearchResult(data.data);
        toast({
          title: "Transaction Found",
          description: "Transaction retrieved successfully",
        });
      } else {
        setSearchResult(null);
        toast({
          title: "Not Found",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Search Error",
        description: `Failed to search transaction: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTransaction = async () => {
    if (!verifyHash) {
      toast({
        title: "Validation Error",
        description: "Please enter a hash to verify",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/immudb/verify?hash=${encodeURIComponent(verifyHash)}`);
      const data = await response.json();

      if (data.success) {
        setVerifyResult({
          verified: data.verified,
          message: data.message,
        });
        toast({
          title: data.verified ? "Verified" : "Not Verified",
          description: data.message,
        });
      } else {
        toast({
          title: "Verification Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Error",
        description: `Failed to verify transaction: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
    loadAllTransactions();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ImmuDB Test Interface</h1>
        <Button onClick={testConnection} disabled={isLoading}>
          {isLoading ? 'Testing...' : 'Test Connection'}
        </Button>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>Current ImmuDB connection status</CardDescription>
        </CardHeader>
        <CardContent>
          {connectionStatus ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Badge variant={connectionStatus.connected ? "default" : "destructive"}>
                  {connectionStatus.connected ? 'Connected' : 'Disconnected'}
                </Badge>
                <span className="text-sm text-gray-600">{connectionStatus.timestamp}</span>
              </div>
              <p className="text-sm">{connectionStatus.message}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Click "Test Connection" to check status</p>
          )}
        </CardContent>
      </Card>

      {/* Store New Transaction */}
      <Card>
        <CardHeader>
          <CardTitle>Store Transaction Hash</CardTitle>
          <CardDescription>Store a new transaction hash in ImmuDB (Key-Value)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hash">Transaction Hash *</Label>
              <Input
                id="hash"
                value={newTransaction.hash}
                onChange={(e) => setNewTransaction({ ...newTransaction, hash: e.target.value })}
                placeholder="0x123abc..."
              />
            </div>
            <div>
              <Label htmlFor="type">Transaction Type *</Label>
              <Input
                id="type"
                value={newTransaction.transactionType}
                onChange={(e) => setNewTransaction({ ...newTransaction, transactionType: e.target.value })}
                placeholder="carbon_credit, transfer, etc."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="block">Block Number (optional)</Label>
              <Input
                id="block"
                type="number"
                value={newTransaction.blockNumber}
                onChange={(e) => setNewTransaction({ ...newTransaction, blockNumber: e.target.value })}
                placeholder="123456"
              />
            </div>
            <div>
              <Label htmlFor="metadata">Metadata JSON (optional)</Label>
              <Input
                id="metadata"
                value={newTransaction.metadata}
                onChange={(e) => setNewTransaction({ ...newTransaction, metadata: e.target.value })}
                placeholder='{"key": "value"}'
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={storeTransaction} disabled={isLoading}>
              {isLoading ? 'Storing...' : 'Store Transaction (KV)'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Transaction */}
      <Card>
        <CardHeader>
          <CardTitle>Search Transaction</CardTitle>
          <CardDescription>Search for a specific transaction hash</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={searchHash}
              onChange={(e) => setSearchHash(e.target.value)}
              placeholder="Enter transaction hash to search"
              className="flex-1"
            />
            <Button onClick={searchTransaction} disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          {searchResult && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Search Result:</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Hash:</strong> {searchResult.hash}</p>
                <p><strong>Type:</strong> {searchResult.transactionType}</p>
                <p><strong>Timestamp:</strong> {new Date(searchResult.timestamp).toLocaleString()}</p>
                {searchResult.blockNumber && <p><strong>Block:</strong> {searchResult.blockNumber}</p>}
                {searchResult.metadata && Object.keys(searchResult.metadata).length > 0 && (
                  <p><strong>Metadata:</strong> {JSON.stringify(searchResult.metadata, null, 2)}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verify Transaction */}
      <Card>
        <CardHeader>
          <CardTitle>Verify Transaction</CardTitle>
          <CardDescription>Cryptographically verify a transaction hash</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={verifyHash}
              onChange={(e) => setVerifyHash(e.target.value)}
              placeholder="Enter transaction hash to verify"
              className="flex-1"
            />
            <Button onClick={verifyTransaction} disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
          {verifyResult && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Badge variant={verifyResult.verified ? "default" : "destructive"}>
                  {verifyResult.verified ? 'Verified' : 'Not Verified'}
                </Badge>
                <span className="text-sm">{verifyResult.message}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Transactions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>List of all stored transaction hashes</CardDescription>
            </div>
            <Button onClick={loadAllTransactions} disabled={isLoading} variant="outline">
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((tx, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Hash:</strong> <code className="text-xs">{tx.hash}</code></p>
                      <p><strong>Type:</strong> {tx.transactionType}</p>
                    </div>
                    <div>
                      <p><strong>Timestamp:</strong> {new Date(tx.timestamp).toLocaleString()}</p>
                      {tx.blockNumber && <p><strong>Block:</strong> {tx.blockNumber}</p>}
                    </div>
                  </div>
                  {tx.metadata && Object.keys(tx.metadata).length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm"><strong>Metadata:</strong></p>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(tx.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No transactions found. Store some transactions to see them here.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}