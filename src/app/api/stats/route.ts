import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function getSupabaseAuthUserCount(): Promise<number | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const perPage = 1000;
  let page = 1;
  let total = 0;

  // Supabase Admin API is paginated; aggregate to avoid truncating user counts.
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    total += users.length;

    if (users.length < perPage) {
      break;
    }
    page += 1;
  }

  return total;
}

export async function GET() {
  try {
    const [forests, creditAggregates, userCount, completedOrderAgg] = await Promise.all([
      prisma.forest.findMany({
        where: { deletedAt: null },
        select: { id: true, area: true, status: true },
      }),
      prisma.carbonCredit.findMany({
        where: { deletedAt: null },
        select: {
          totalCredits: true,
          availableCredits: true,
          pricePerCredit: true,
          retiredCredits: true,
        },
      }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.order.aggregate({
        where: {
          status: { in: ['PAID', 'COMPLETED', 'PROCESSING'] },
          deletedAt: null,
        },
        _sum: { totalCredits: true, totalUsd: true },
        _count: true,
      }),
    ]);

    const activeForests = forests.filter((f) => f.status === 'ACTIVE').length;
    const totalAreaHa = forests.reduce((sum, f) => sum + (f.area || 0), 0);
    const totalAreaKm2 = totalAreaHa / 100;

    const totalCredits = creditAggregates.reduce((sum, c) => sum + c.totalCredits, 0);
    const availableCredits = creditAggregates.reduce((sum, c) => sum + c.availableCredits, 0);
    const retiredCredits = creditAggregates.reduce((sum, c) => sum + c.retiredCredits, 0);
    const totalValue = creditAggregates.reduce(
      (sum, c) => sum + c.totalCredits * c.pricePerCredit,
      0,
    );

    let totalUsers = userCount;
    try {
      const authUserCount = await getSupabaseAuthUserCount();
      if (authUserCount !== null) {
        totalUsers = authUserCount;
      }
    } catch (error) {
      console.error('Failed to fetch Supabase auth user count, using app user count fallback:', error);
    }

    return NextResponse.json({
      totalCredits,
      availableCredits,
      retiredCredits,
      totalValue,
      totalAreaKm2,
      totalForests: forests.length,
      activeForests,
      totalUsers,
      completedOrders: completedOrderAgg._count,
      totalRevenue: completedOrderAgg._sum.totalUsd || 0,
      creditsSold: completedOrderAgg._sum.totalCredits || 0,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
