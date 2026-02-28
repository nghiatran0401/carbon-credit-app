'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CertificateDisplay } from '@/components/certificate-display';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Certificate } from '@/types';

export default function CertificateViewPage() {
  const params = useParams();
  const certificateId = params.id as string;
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!certificateId) return;

    const fetchCertificate = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/certificates?id=${certificateId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch certificate');
        }

        setCertificate(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch certificate');
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [certificateId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading certificate...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-red-600">{error}</p>
            <Link href="/">
              <Button variant="outline">Return to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Certificate not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/90 via-white to-white p-5 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Certificate of Carbon Credit Purchase</h1>
        <p className="mt-1 text-sm text-gray-600">
          Verified purchase record and project details for this order.
        </p>
      </div>
      <div className="mb-8">
        <CertificateDisplay certificate={certificate} />
      </div>
      <div className="text-center flex items-center justify-center gap-2">
        <Link href="/history">
          <Button variant="outline">Back to History</Button>
        </Link>
        <Link href="/">
          <Button variant="ghost">Return to EcoCredit</Button>
        </Link>
      </div>
    </div>
  );
}
