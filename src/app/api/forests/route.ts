import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError, handleRouteError } from '@/lib/auth';
import { isBlockchainReady, mintForestTokens } from '@/services/blockchainService';
import { DEFAULT_PRICE_PER_CREDIT } from '@/lib/constants';
import {
  forestCreateSchema,
  forestUpdateSchema,
  validateBody,
  isValidationError,
} from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = url.searchParams.get('page');
    const limit = Number(url.searchParams.get('limit')) || 20;

    const cacheHeaders = {
      'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
    };

    if (!page) {
      const forests = await prisma.forest.findMany({
        include: { credits: true },
        orderBy: { id: 'asc' },
      });
      return NextResponse.json(forests, { headers: cacheHeaders });
    }

    const pageNum = Math.max(1, Number(page));
    const [forests, total] = await Promise.all([
      prisma.forest.findMany({
        include: { credits: true },
        orderBy: { id: 'asc' },
        skip: (pageNum - 1) * limit,
        take: limit,
      }),
      prisma.forest.count(),
    ]);

    return NextResponse.json(
      {
        data: forests,
        pagination: {
          page: pageNum,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: cacheHeaders },
    );
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch forests');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const validated = validateBody(forestCreateSchema, body);
    if (isValidationError(validated)) return validated;

    const forest = await prisma.forest.create({
      data: {
        name: validated.name,
        location: validated.location,
        type: validated.type,
        area: validated.area,
        description: validated.description,
        status: validated.status.toUpperCase() as 'ACTIVE' | 'MONITORING' | 'INACTIVE',
        lastUpdated: new Date(validated.lastUpdated as string),
      },
    });

    const normalizedStatus = validated.status.toUpperCase();
    const requestedMintAmount = validated.initialCreditsToMint;

    if (
      normalizedStatus === 'ACTIVE' &&
      (!Number.isInteger(requestedMintAmount) || (requestedMintAmount as number) <= 0)
    ) {
      await prisma.forest.delete({ where: { id: forest.id } });
      return NextResponse.json(
        {
          error:
            'initialCreditsToMint is required for ACTIVE forests so they can be listed as purchasable in the marketplace.',
        },
        { status: 400 },
      );
    }

    const shouldCreateMarketplaceCredit =
      normalizedStatus === 'ACTIVE' &&
      Number.isInteger(requestedMintAmount) &&
      (requestedMintAmount as number) > 0;

    if (shouldCreateMarketplaceCredit) {
      await prisma.carbonCredit.create({
        data: {
          forestId: forest.id,
          vintage: new Date().getFullYear(),
          certification: 'Forest Registry',
          totalCredits: requestedMintAmount as number,
          availableCredits: requestedMintAmount as number,
          pricePerCredit: DEFAULT_PRICE_PER_CREDIT,
          symbol: 'tCO₂',
          retiredCredits: 0,
        },
      });
    }

    const shouldMintOnCreate =
      normalizedStatus === 'ACTIVE' &&
      Number.isInteger(requestedMintAmount) &&
      (requestedMintAmount as number) > 0;

    if (!shouldMintOnCreate) {
      return NextResponse.json(forest);
    }

    if (!isBlockchainReady()) {
      console.warn(
        `[forests/POST] Blockchain is not configured — forest ${forest.id} created in DB only (no on-chain mint). ` +
          'Set BASE_RPC_URL, ADMIN_WALLET_PRIVATE_KEY, and FOREST_1155_CONTRACT_ADDRESS to enable on-chain minting.',
      );
      return NextResponse.json(forest);
    }

    try {
      const mintResult = await mintForestTokens({
        forestId: forest.id,
        amount: requestedMintAmount as number,
      });

      const chainLinkageData = {
        contractAddress: mintResult.contractAddress,
        onChainTokenId: forest.id,
        mintTxHash: mintResult.txHash,
        mintBlockNumber: mintResult.blockNumber,
        mintChainId: mintResult.chainId,
        mintedAt: new Date(),
      };

      const linkedForest = await prisma.forest.update({
        where: { id: forest.id },
        data: chainLinkageData as never,
      });

      await prisma.carbonCredit.updateMany({
        where: { forestId: forest.id, onChainId: null },
        data: { onChainId: String(forest.id) },
      });

      return NextResponse.json(linkedForest);
    } catch (mintError) {
      await prisma.forest.delete({ where: { id: forest.id } });
      const message = mintError instanceof Error ? mintError.message : 'Unknown minting error';
      return NextResponse.json(
        {
          error: `Forest creation failed during blockchain mint: ${message}`,
        },
        { status: 502 },
      );
    }
  } catch (error) {
    return handleRouteError(error, 'Failed to create forest');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const validated = validateBody(forestUpdateSchema, body);
    if (isValidationError(validated)) return validated;

    const { id, ...data } = validated;
    const existingForest = await prisma.forest.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existingForest) {
      return NextResponse.json({ error: 'Forest not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.area !== undefined) updateData.area = data.area;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status.toUpperCase();
    if (data.lastUpdated !== undefined)
      updateData.lastUpdated = new Date(data.lastUpdated as string);

    const forest = await prisma.forest.update({
      where: { id },
      data: updateData,
    });

    const nextStatus =
      typeof updateData.status === 'string' ? updateData.status : existingForest.status;
    const shouldMintOnApproval = existingForest.status !== 'ACTIVE' && nextStatus === 'ACTIVE';

    if (shouldMintOnApproval) {
      const credits = await prisma.carbonCredit.findMany({
        where: { forestId: id },
        select: { totalCredits: true, onChainId: true },
      });

      const alreadyMinted = credits.some((credit) => credit.onChainId === String(id));
      const totalCreditsToMint = credits.reduce((sum, credit) => sum + credit.totalCredits, 0);

      if (!alreadyMinted && totalCreditsToMint > 0) {
        if (!isBlockchainReady()) {
          console.warn(
            `Forest ${id} approved but blockchain is not configured. Skipping on-chain mint.`,
          );
        } else {
          try {
            const mintResult = await mintForestTokens({
              forestId: id,
              amount: totalCreditsToMint,
            });

            const chainLinkageData = {
              contractAddress: mintResult.contractAddress,
              onChainTokenId: id,
              mintTxHash: mintResult.txHash,
              mintBlockNumber: mintResult.blockNumber,
              mintChainId: mintResult.chainId,
              mintedAt: new Date(),
            };

            await prisma.forest.update({
              where: { id },
              data: chainLinkageData as never,
            });

            await prisma.carbonCredit.updateMany({
              where: { forestId: id, onChainId: null },
              data: { onChainId: String(id) },
            });

            console.log(
              `Minted ${totalCreditsToMint} forest credits for forest ${id}. Tx: ${mintResult.txHash}`,
            );
          } catch (mintError) {
            console.error(`Failed to mint forest credits for forest ${id}:`, mintError);
          }
        }
      }
    }

    return NextResponse.json(forest);
  } catch (error) {
    return handleRouteError(error, 'Failed to update forest');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) return auth;

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.forest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Failed to delete forest');
  }
}
