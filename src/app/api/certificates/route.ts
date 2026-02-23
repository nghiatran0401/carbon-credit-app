import { NextRequest, NextResponse } from 'next/server';
import { certificateService } from '@/lib/certificate-service';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, handleRouteError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const isAdmin = auth.role?.toLowerCase() === 'admin';
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');

    if (id) {
      const certificate = await certificateService.getCertificateById(id);
      if (!certificate) {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
      }
      const certOrder = certificate as unknown as { order?: { userId?: number } };
      if (!isAdmin && certOrder.order?.userId !== auth.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.json(certificate);
    }

    if (orderId) {
      const parsedOrderId = parseInt(orderId);
      if (isNaN(parsedOrderId)) {
        return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
      }
      if (!isAdmin) {
        const order = await prisma.order.findUnique({
          where: { id: parsedOrderId },
          select: { userId: true },
        });
        if (!order || order.userId !== auth.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
      const certificate = await certificateService.getCertificateByOrderId(parsedOrderId);
      if (!certificate) {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
      }
      return NextResponse.json(certificate);
    }

    if (userId) {
      const parsedUserId = parseInt(userId);
      if (isNaN(parsedUserId)) {
        return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
      }
      if (!isAdmin && parsedUserId !== auth.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const certificates = await certificateService.getUserCertificates(parsedUserId);
      return NextResponse.json(certificates);
    }

    return NextResponse.json(
      { error: 'Missing id, orderId, or userId parameter' },
      { status: 400 },
    );
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch certificates');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const { orderId } = body;

    if (!orderId || typeof orderId !== 'number') {
      return NextResponse.json({ error: 'Missing or invalid orderId' }, { status: 400 });
    }

    const isAdmin = auth.role?.toLowerCase() === 'admin';
    if (!isAdmin) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true },
      });
      if (!order || order.userId !== auth.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const certificate = await certificateService.generateCertificate(orderId);
    return NextResponse.json(certificate);
  } catch (error) {
    return handleRouteError(error, 'Failed to generate certificate');
  }
}
