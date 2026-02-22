'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, CheckCircle, Leaf, Shield, Users, MapPin } from 'lucide-react';
import type { Certificate, CertificateMetadata } from '@/types';
import { pdfCertificateGenerator } from '@/lib/pdf-certificate-generator';

interface CertificateDisplayProps {
  certificate: Certificate;
  onDownload?: () => void;
}

export function CertificateDisplay({ certificate, onDownload }: CertificateDisplayProps) {
  const metadata = certificate.metadata as CertificateMetadata | undefined;

  if (!metadata) {
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
        alert('Failed to generate PDF certificate. Please try again.');
      }
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Leaf className="h-8 w-8 text-green-600" />
          <CardTitle className="text-2xl font-bold text-green-800">
            Carbon Credit Certificate
          </CardTitle>
        </div>
        <div className="flex items-center justify-center space-x-4 text-sm">
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            {certificate.status === 'active' ? 'Valid' : certificate.status}
          </Badge>
          <span className="text-gray-600">ID: {certificate.id}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Certificate Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Certificate Holder</h3>
              <p className="text-lg font-medium">{metadata.userName}</p>
              <p className="text-sm text-gray-600">{metadata.userEmail}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Forest Project</h3>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="font-medium">{metadata.forestName}</span>
              </div>
              <p className="text-sm text-gray-600">{metadata.forestType}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Purchase Details</h3>
              <p className="text-lg font-bold text-green-700">
                ${(metadata.totalValue ?? 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">{metadata.totalCredits} credits purchased</p>
              <p className="text-xs text-gray-500">
                Issued: {new Date(certificate.issuedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Credit Items */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Carbon Credits</h3>
          <div className="space-y-2">
            {metadata.items?.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-white rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{item.certification}</p>
                    <p className="text-sm text-gray-600">Vintage {item.vintage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{item.quantity} credits</p>
                  <p className="text-sm text-gray-600">${item.subtotal.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 pt-4">
          <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            Download Certificate
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-4 border-t">
          <p>This certificate represents verified carbon credits from {metadata.forestName}</p>
          <p>Supporting forest conservation and climate action</p>
        </div>
      </CardContent>
    </Card>
  );
}
