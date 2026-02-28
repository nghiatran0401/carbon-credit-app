'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Download,
  FileCheck2,
  Hash,
  Leaf,
  MapPin,
  Receipt,
  Shield,
  User,
} from 'lucide-react';
import type { Certificate, CertificateMetadata } from '@/types';
import { pdfCertificateGenerator } from '@/lib/pdf-certificate-generator';
import { useToast } from '@/hooks/use-toast';

interface CertificateDisplayProps {
  certificate: Certificate;
  onDownload?: () => void;
}

export function CertificateDisplay({ certificate, onDownload }: CertificateDisplayProps) {
  const { toast } = useToast();
  const metadata = certificate.metadata as CertificateMetadata | undefined;
  const order = certificate.order;

  const orderItems = order?.items ?? [];
  const resolvedItems =
    orderItems.length > 0
      ? orderItems.map((item) => ({
          project: item.carbonCredit?.forest?.name || `Credit #${item.carbonCreditId}`,
          certification: item.carbonCredit?.certification ?? 'Unknown',
          vintage: item.carbonCredit?.vintage ?? 0,
          quantity: item.quantity,
          pricePerCredit: item.pricePerCredit,
          subtotal: item.subtotal,
        }))
      : (metadata?.items ?? []).map((item) => ({
          project: metadata?.forestName || 'Forest Project',
          certification: item.certification,
          vintage: item.vintage,
          quantity: item.quantity,
          pricePerCredit: item.pricePerCredit,
          subtotal: item.subtotal,
        }));

  const totalCredits =
    resolvedItems.length > 0
      ? resolvedItems.reduce((sum, item) => sum + item.quantity, 0)
      : (metadata?.totalCredits ?? 0);
  const totalValue =
    typeof order?.totalPrice === 'number'
      ? order.totalPrice
      : resolvedItems.length > 0
        ? resolvedItems.reduce((sum, item) => sum + item.subtotal, 0)
        : (metadata?.totalValue ?? 0);
  const holderName =
    order?.user?.firstName || order?.user?.lastName
      ? `${order?.user?.firstName ?? ''} ${order?.user?.lastName ?? ''}`.trim()
      : (metadata?.userName ?? 'Unknown holder');
  const holderEmail = order?.user?.email ?? metadata?.userEmail ?? 'N/A';
  const purchaseDate = order?.paidAt ?? metadata?.purchaseDate ?? certificate.issuedAt;
  const orderCode = order?.orderCode;
  const projectNames = Array.from(
    new Set(
      resolvedItems
        .map((item) => item.project)
        .filter((name) => typeof name === 'string' && name.trim().length > 0),
    ),
  );
  const statusLabel =
    certificate.status?.toLowerCase() === 'active' ? 'Verified' : certificate.status;
  const statusToneClass =
    certificate.status?.toLowerCase() === 'active'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : 'bg-slate-100 text-slate-700 border-slate-300';

  if (!metadata && !order) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Certificate data not available</p>
        </CardContent>
      </Card>
    );
  }

  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
    } else {
      // Generate and download PDF certificate
      try {
        const pdfBlob = await pdfCertificateGenerator.generatePDFCertificate(certificate);
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `carbon-credit-certificate-${certificate.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast({
          title: 'Download failed',
          description: 'Failed to generate PDF certificate. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border-emerald-200 shadow-sm">
      <CardHeader className="border-b bg-gradient-to-r from-emerald-50/90 via-white to-white pb-5">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Leaf className="h-8 w-8 text-emerald-600" />
          <CardTitle className="text-2xl font-bold text-emerald-900">
            Carbon Credit Certificate
          </CardTitle>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          <Badge variant="outline" className={statusToneClass}>
            <FileCheck2 className="mr-1 h-3.5 w-3.5" />
            {statusLabel}
          </Badge>
          <Badge variant="outline">Certificate ID: {certificate.id}</Badge>
          {orderCode && <Badge variant="outline">Order Code: {orderCode}</Badge>}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-slate-50/70 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Holder
            </p>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <User className="h-4 w-4 text-emerald-600" />
              {holderName}
            </p>
            <p className="mt-1 text-xs text-gray-600">{holderEmail}</p>
          </div>
          <div className="rounded-lg border bg-slate-50/70 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Impact
            </p>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Leaf className="h-4 w-4 text-emerald-600" />
              {totalCredits.toLocaleString()} credits purchased
            </p>
            <p className="mt-1 text-xs text-gray-600">Total value: ${totalValue.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border bg-slate-50/70 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Issued
            </p>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Calendar className="h-4 w-4 text-emerald-600" />
              {new Date(certificate.issuedAt).toLocaleDateString()}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Purchase date: {new Date(purchaseDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Project Scope
          </p>
          {projectNames.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {projectNames.map((name) => (
                <Badge key={name} variant="secondary" className="bg-emerald-50 text-emerald-800">
                  <MapPin className="mr-1 h-3 w-3" />
                  {name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {metadata?.forestName ?? 'Forest project data unavailable'}
            </p>
          )}
        </div>

        <Separator />

        {/* Credit Items */}
        <div>
          <h3 className="mb-3 inline-flex items-center gap-2 font-semibold text-gray-900">
            <Receipt className="h-4 w-4 text-emerald-600" />
            Purchased Carbon Credits
          </h3>
          <div className="space-y-2">
            {resolvedItems.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-white rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{item.project}</p>
                    <p className="text-sm text-gray-600">
                      {item.certification} · Vintage {item.vintage}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{item.quantity} credits</p>
                  <p className="text-xs text-gray-500">${item.pricePerCredit.toFixed(2)} each</p>
                  <p className="text-sm text-gray-700">${item.subtotal.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
          <p className="inline-flex items-center gap-2 text-xs text-gray-700">
            <Hash className="h-3.5 w-3.5 text-emerald-700" />
            Certificate Hash
          </p>
          <p className="mt-1 break-all font-mono text-xs text-gray-700">
            {certificate.certificateHash}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 pt-4">
          <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            Download Certificate
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-4 border-t">
          <p>
            This certificate represents verified carbon credits
            {projectNames.length > 0 ? ` from ${projectNames.join(', ')}` : ''}
          </p>
          <p>Supporting forest conservation and climate action</p>
        </div>
      </CardContent>
    </Card>
  );
}
