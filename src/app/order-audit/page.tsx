'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface OrderAudit {
  orderId: number;
  hash: string;
  timestamp: number;
  transactionData: {
    orderId: number;
    totalCredits: number;
    totalPrice: number;
    paidAt: string;
    buyer?: string;
    seller?: string;
  };
}

interface VerificationResult {
  success: boolean;
  orderId: number;
  verification: {
    isValid: boolean;
    storedHash?: string;
    computedHash: string;
    key: string;
  };
  orderData: Record<string, unknown>;
  hashComputation: {
    formula: string;
    dataString: string;
    paidAtTimestamp: number;
  };
}

const formatTimestamp = (timestamp: number) => new Date(timestamp).toLocaleString();

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export default function OrderAuditPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [audits, setAudits] = useState<OrderAudit[]>([]);
  const [verifyOrderId, setVerifyOrderId] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<OrderAudit | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { toast } = useToast();

  const loadAudits = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/orders/audit');
      if (response.status === 403) {
        setLoadError('Admin access required to view all audit records.');
        return;
      }
      const data = await response.json();

      if (data.success) {
        setAudits(data.audits);
      } else {
        setLoadError(data.message || 'Failed to load audits');
      }
    } catch (error) {
      setLoadError(`Failed to load audits: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyOrder = async () => {
    const id = parseInt(verifyOrderId);
    if (!verifyOrderId.trim() || isNaN(id)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid order ID',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/orders/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationResult(data);
        toast({
          title: data.verification.isValid ? 'Verification Passed' : 'Verification Failed',
          description: data.verification.isValid
            ? 'Order integrity verified — no tampering detected.'
            : 'Order data may have been modified or audit record not found.',
          variant: data.verification.isValid ? 'default' : 'destructive',
        });
      } else {
        toast({
          title: 'Verification Error',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Verification Error',
        description: `Failed to verify order: ${error}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAudits();
  }, [loadAudits]);

  const totalCredits = audits.reduce((sum, a) => sum + a.transactionData.totalCredits, 0);
  const totalValue = audits.reduce((sum, a) => sum + a.transactionData.totalPrice, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Order Audit Trail</h1>
          <p className="text-sm text-gray-500 mt-1">Immutable audit records stored in ImmuDB</p>
        </div>
        <div className="flex space-x-2">
          <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">
            ImmuDB
          </Badge>
          <Button onClick={loadAudits} disabled={isLoading} variant="outline" size="sm">
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {loadError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-sm text-red-700">{loadError}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audits">
            Audit Records{audits.length > 0 && ` (${audits.length})`}
          </TabsTrigger>
          <TabsTrigger value="verify">Verify Order</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">
                  Total Audited Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">{audits.length}</div>
                <p className="text-xs text-blue-700">Stored in ImmuDB</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-900">
                  Total Credits Audited
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900">{totalCredits}</div>
                <p className="text-xs text-green-700">Carbon credits</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-900">
                  Total Value Audited
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">
                  {formatCurrency(totalValue)}
                </div>
                <p className="text-xs text-purple-700">Transaction value</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Hash Algorithm</CardTitle>
              <CardDescription>How order integrity is ensured</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Formula</Label>
                <div className="font-mono text-sm bg-gray-100 p-3 rounded mt-1">
                  SHA256(orderId | buyer | seller | totalCredits | totalPrice | paidAtTimestamp)
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">How it works</Label>
                <p className="text-sm text-gray-600 mt-1">
                  Each completed order generates a unique SHA-256 hash from its core fields (order
                  ID, buyer, seller, credits, price, payment timestamp). This hash is stored
                  immutably in ImmuDB. To verify integrity, the hash is recomputed from current
                  database values and compared against the stored hash — any difference indicates
                  tampering.
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Key Pattern</Label>
                <div className="font-mono text-sm bg-gray-100 p-3 rounded mt-1">
                  tx_order_{'<orderId>'} → {'{'} hash, timestamp, metadata {'}'}
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
              {audits.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg
                    className="h-12 w-12 mx-auto mb-3 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <p className="font-medium">No audit records yet</p>
                  <p className="text-sm mt-1">
                    Complete an order to generate an immutable audit trail.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[32rem] overflow-y-auto">
                  {audits.map((audit) => (
                    <div
                      key={audit.orderId}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedAudit(audit)}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider">
                            Order
                          </div>
                          <div className="text-lg font-bold">#{audit.orderId}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider">
                            Credits / Value
                          </div>
                          <div className="text-sm font-medium">
                            {audit.transactionData.totalCredits} credits
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatCurrency(audit.transactionData.totalPrice)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider">
                            Paid At
                          </div>
                          <div className="text-sm">
                            {formatTimestamp(new Date(audit.transactionData.paidAt).getTime())}
                          </div>
                        </div>
                        <div className="flex items-center justify-end">
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {audit.hash.slice(0, 12)}...
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verify" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verify Order Integrity</CardTitle>
              <CardDescription>
                Recompute the hash from current database values and compare against the immutable
                record in ImmuDB
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  value={verifyOrderId}
                  onChange={(e) => setVerifyOrderId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyOrder()}
                  placeholder="Enter order ID..."
                  type="number"
                  className="flex-1"
                />
                <Button onClick={verifyOrder} disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Verify'}
                </Button>
              </div>

              {verificationResult && (
                <div className="space-y-4 mt-4">
                  <div
                    className={`p-4 rounded-lg border ${
                      verificationResult.verification.isValid
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge
                        variant={
                          verificationResult.verification.isValid ? 'default' : 'destructive'
                        }
                      >
                        {verificationResult.verification.isValid
                          ? '\u2713 VERIFIED'
                          : '\u2717 TAMPERED'}
                      </Badge>
                      <span className="font-medium">Order #{verificationResult.orderId}</span>
                    </div>
                    <p className="text-sm">
                      {verificationResult.verification.isValid
                        ? 'Order data integrity verified. The current data matches the immutable record.'
                        : 'Order data does not match the immutable record, or no audit record exists.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Stored Hash (ImmuDB)</Label>
                      <div className="font-mono text-xs bg-gray-100 p-2 rounded break-all mt-1">
                        {verificationResult.verification.storedHash || 'Not found'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Computed Hash (Current Data)</Label>
                      <div className="font-mono text-xs bg-gray-100 p-2 rounded break-all mt-1">
                        {verificationResult.verification.computedHash}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500">Hash Computation Details</Label>
                    <div className="text-xs space-y-1 bg-gray-50 p-3 rounded mt-1 font-mono">
                      <div>
                        <span className="text-gray-500">formula:</span>{' '}
                        {verificationResult.hashComputation.formula}
                      </div>
                      <div>
                        <span className="text-gray-500">input:</span>{' '}
                        {verificationResult.hashComputation.dataString}
                      </div>
                      <div>
                        <span className="text-gray-500">paidAt:</span>{' '}
                        {verificationResult.hashComputation.paidAtTimestamp}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500">Current Order Data</Label>
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto mt-1">
                      {JSON.stringify(verificationResult.orderData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Audit Detail Dialog */}
      <Dialog open={!!selectedAudit} onOpenChange={(open) => !open && setSelectedAudit(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedAudit && (
            <>
              <DialogHeader>
                <DialogTitle>Audit Record — Order #{selectedAudit.orderId}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500">SHA-256 Hash</Label>
                  <div className="font-mono text-xs break-all bg-gray-100 p-3 rounded mt-1">
                    {selectedAudit.hash}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <Label className="text-xs text-gray-500">Order ID</Label>
                    <div className="text-sm font-medium mt-1">
                      #{selectedAudit.transactionData.orderId}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <Label className="text-xs text-gray-500">Total Credits</Label>
                    <div className="text-sm font-medium mt-1">
                      {selectedAudit.transactionData.totalCredits}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <Label className="text-xs text-gray-500">Total Price</Label>
                    <div className="text-sm font-medium mt-1">
                      {formatCurrency(selectedAudit.transactionData.totalPrice)}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <Label className="text-xs text-gray-500">Paid At</Label>
                    <div className="text-sm font-medium mt-1">
                      {formatTimestamp(new Date(selectedAudit.transactionData.paidAt).getTime())}
                    </div>
                  </div>
                </div>

                {(selectedAudit.transactionData.buyer || selectedAudit.transactionData.seller) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <Label className="text-xs text-gray-500">Buyer</Label>
                      <div className="text-sm font-medium mt-1">
                        {selectedAudit.transactionData.buyer || '—'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <Label className="text-xs text-gray-500">Seller</Label>
                      <div className="text-sm font-medium mt-1">
                        {selectedAudit.transactionData.seller || '—'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 p-3 rounded">
                  <Label className="text-xs text-gray-500">Audit Timestamp</Label>
                  <div className="text-sm font-medium mt-1">
                    {formatTimestamp(selectedAudit.timestamp)}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <Label className="text-xs text-gray-500">ImmuDB Key</Label>
                  <div className="font-mono text-sm mt-1">tx_order_{selectedAudit.orderId}</div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
