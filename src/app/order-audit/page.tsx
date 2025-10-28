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

interface OrderAudit {
  orderId: number;
  hash: string;
  timestamp: number;
  transactionData: {
    orderId: number;
    totalCredits: number;
    totalPrice: number;
    paidAt: string;
  };
}

interface VerificationResult {
  isValid: boolean;
  storedHash?: string;
  computedHash: string;
  key: string;
}

export default function OrderAuditPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [audits, setAudits] = useState<OrderAudit[]>([]);
  const [verifyOrderId, setVerifyOrderId] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [selectedAudit, setSelectedAudit] = useState<OrderAudit | null>(null);
  
  const { toast } = useToast();

  const loadAudits = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/orders/audit');
      const data = await response.json();
      
      if (data.success) {
        setAudits(data.audits);
        toast({
          title: "Audits Loaded",
          description: `Found ${data.count} order audit records`,
        });
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
        description: `Failed to load audits: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOrder = async () => {
    if (!verifyOrderId.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an order ID to verify",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/orders/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: parseInt(verifyOrderId) })
      });

      const data = await response.json();
      
      if (data.success) {
        setVerificationResult(data);
        toast({
          title: data.verification.isValid ? "Verification Passed" : "Verification Failed",
          description: data.verification.isValid 
            ? "Order integrity verified successfully" 
            : "Order data has been tampered with or audit record not found",
          variant: data.verification.isValid ? "default" : "destructive",
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
        description: `Failed to verify order: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  useEffect(() => {
    loadAudits();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Order Audit Trail</h1>
        <div className="flex space-x-2">
          <Badge variant="outline">ImmuDB Integration</Badge>
          <Button onClick={loadAudits} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audits">Audit Records</TabsTrigger>
          <TabsTrigger value="verify">Verify Order</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">Total Audited Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">{audits.length}</div>
                <p className="text-xs text-blue-700">Stored in ImmuDB</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-900">Total Credits Audited</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">
                  {audits.reduce((sum, audit) => sum + audit.transactionData.totalCredits, 0)}
                </div>
                <p className="text-xs text-green-700">Carbon credits</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-900">Total Value Audited</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">
                  {formatCurrency(audits.reduce((sum, audit) => sum + audit.transactionData.totalPrice, 0))}
                </div>
                <p className="text-xs text-purple-700">Transaction value</p>
              </CardContent>
            </Card>
          </div>

          {/* Hash Algorithm Info */}
          <Card>
            <CardHeader>
              <CardTitle>Hash Algorithm</CardTitle>
              <CardDescription>How order integrity is ensured</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Formula</Label>
                <div className="font-mono text-sm bg-gray-100 p-3 rounded">
                  SHA256(orderId + totalCredits + totalPrice + paidAtTimestamp)
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Storage</Label>
                <p className="text-sm text-gray-600">
                  Each completed order generates a unique hash stored immutably in ImmuDB. 
                  Any tampering with the original order data will result in a different hash.
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Key Pattern</Label>
                <div className="font-mono text-sm bg-gray-100 p-3 rounded">
                  order_[orderId] → {"{"} hash, timestamp, orderData {"}"}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Order Audit Records</CardTitle>
              <CardDescription>Immutable audit trail of completed orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {audits.map((audit, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm font-medium">Order ID</div>
                        <div className="text-lg font-bold">#{audit.orderId}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Credits / Value</div>
                        <div className="text-sm">{audit.transactionData.totalCredits} credits</div>
                        <div className="text-sm text-gray-600">{formatCurrency(audit.transactionData.totalPrice)}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Paid At</div>
                        <div className="text-sm">{formatTimestamp(new Date(audit.transactionData.paidAt).getTime())}</div>
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAudit(audit)}
                        >
                          View Hash
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {audits.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No audit records found.</p>
                    <p className="text-sm">Complete some orders to see audit trails here.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verify" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verify Order Integrity</CardTitle>
              <CardDescription>Check if order data has been tampered with</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  value={verifyOrderId}
                  onChange={(e) => setVerifyOrderId(e.target.value)}
                  placeholder="Enter order ID to verify..."
                  type="number"
                  className="flex-1"
                />
                <Button onClick={verifyOrder} disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
              
              {verificationResult && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${
                    verificationResult.verification.isValid 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant={verificationResult.verification.isValid ? "default" : "destructive"}>
                        {verificationResult.verification.isValid ? 'VERIFIED' : 'TAMPERED'}
                      </Badge>
                      <span className="font-medium">Order #{verificationResult.orderId}</span>
                    </div>
                    <p className="text-sm">
                      {verificationResult.verification.isValid 
                        ? 'Order data integrity verified. No tampering detected.' 
                        : 'Order data has been modified or audit record not found.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Stored Hash (ImmuDB)</Label>
                      <div className="font-mono text-xs bg-gray-100 p-2 rounded break-all">
                        {verificationResult.verification.storedHash || 'Not found'}
                      </div>
                    </div>
                    <div>
                      <Label>Computed Hash (Current Data)</Label>
                      <div className="font-mono text-xs bg-gray-100 p-2 rounded break-all">
                        {verificationResult.verification.computedHash}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Hash Computation Details</Label>
                    <div className="text-xs space-y-1 bg-gray-50 p-3 rounded">
                      <div><strong>Formula:</strong> {verificationResult.hashComputation.formula}</div>
                      <div><strong>Data String:</strong> {verificationResult.hashComputation.dataString}</div>
                      <div><strong>PaidAt Timestamp:</strong> {verificationResult.hashComputation.paidAtTimestamp}</div>
                    </div>
                  </div>

                  <div>
                    <Label>Current Order Data</Label>
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                      {JSON.stringify(verificationResult.orderData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Audit Detail Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-96 overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Audit Record Details - Order #{selectedAudit.orderId}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAudit(null)}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                
                <div className="font-mono text-xs break-all bg-gray-100 p-3 rounded">
                  <Label>SHA256 Hash</Label><br></br>
                  {selectedAudit.hash}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 ">
                <div className="font-mono text-xs break-all bg-gray-100 p-3 rounded">
                  <Label>Order ID</Label>
                  <div className="text-sm">#{selectedAudit.transactionData.orderId}</div>
                </div>
                <div className="font-mono text-xs break-all bg-gray-100 p-3 rounded">
                  <Label>Total Credits</Label>
                  <div className="text-sm">{selectedAudit.transactionData.totalCredits}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="font-mono text-xs break-all bg-gray-100 p-3 rounded">
                  <Label>Total Price</Label>
                  <div className="text-sm">{formatCurrency(selectedAudit.transactionData.totalPrice)}</div>
                </div>
                <div className="font-mono text-xs break-all bg-gray-100 p-3 rounded">
                  <Label>Paid At</Label>
                  <div className="text-sm">{formatTimestamp(new Date(selectedAudit.transactionData.paidAt).getTime())}</div>
                </div>
              </div>

              <div className="font-mono text-xs break-all bg-gray-100 p-3 rounded">
                <Label>Audit Timestamp</Label>
                <div className="text-sm">{formatTimestamp(selectedAudit.timestamp)}</div>
              </div>

              <div className="font-mono text-xs break-all bg-gray-100 p-3 rounded">
                <Label>ImmuDB Key</Label>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                  order_{selectedAudit.orderId}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}