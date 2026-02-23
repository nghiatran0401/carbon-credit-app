import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { BIOMASS_TO_CO2_FACTOR, DEFAULT_PRICE_PER_CREDIT } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const ANALYSES_DIR = path.join(process.cwd(), 'data', 'analyses');
const INDEX_FILE = path.join(ANALYSES_DIR, 'index.json');

interface AnalysisEntry {
  id: string;
  name?: string;
  description?: string;
  bounds?: { north: number; south: number; east: number; west: number };
  stats?: {
    forestBiomassMg?: number;
    forestAreaKm2?: number;
    forestCoveragePct?: number;
    meanBiomassDensity?: number;
    totalAreaKm2?: number;
    totalBiomassMg?: number;
  };
  prismaForestId?: number;
  createdAt?: string;
  [key: string]: unknown;
}

async function readIndex(): Promise<AnalysisEntry[]> {
  try {
    const raw = await fs.readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeIndex(entries: AnalysisEntry[]) {
  await fs.mkdir(ANALYSES_DIR, { recursive: true });
  await fs.writeFile(INDEX_FILE, JSON.stringify(entries, null, 2));
}

function formatLocation(bounds?: AnalysisEntry['bounds']): string {
  if (!bounds) return 'Analysis Region';
  const lat = ((bounds.north + bounds.south) / 2).toFixed(4);
  const lng = ((bounds.east + bounds.west) / 2).toFixed(4);
  return `${lat}°N, ${lng}°E`;
}

/**
 * Returns carbon credits derived from saved forest analyses.
 * Lazily creates Prisma Forest + CarbonCredit records for analyses
 * that haven't been synced yet, ensuring the cart/order purchase
 * flow works with real database IDs.
 */
export async function GET() {
  try {
    const analyses = await readIndex();

    const valid = analyses.filter((a) => a.stats?.forestBiomassMg && a.stats.forestBiomassMg > 0);

    if (valid.length === 0) {
      return NextResponse.json([]);
    }

    let indexUpdated = false;

    for (const analysis of valid) {
      if (analysis.prismaForestId) {
        const exists = await prisma.forest.findUnique({
          where: { id: analysis.prismaForestId },
        });
        if (exists) continue;
      }

      const forestName = analysis.name || 'Forest Analysis';
      const totalCredits = Math.floor(analysis.stats!.forestBiomassMg! / BIOMASS_TO_CO2_FACTOR);
      const areaHa = (analysis.stats?.forestAreaKm2 ?? 0) * 100;
      const location = formatLocation(analysis.bounds);

      try {
        const forest = await prisma.forest.create({
          data: {
            name: forestName,
            location,
            type: 'Analyzed',
            area: areaHa,
            description: analysis.description || 'Carbon credit from biomass analysis',
            status: 'ACTIVE',
            lastUpdated: new Date(),
          },
        });

        const existingCredit = await prisma.carbonCredit.findFirst({
          where: { forestId: forest.id },
        });

        if (!existingCredit) {
          await prisma.carbonCredit.create({
            data: {
              forestId: forest.id,
              vintage: new Date().getFullYear(),
              certification: 'Biomass Analysis',
              totalCredits,
              availableCredits: totalCredits,
              pricePerCredit: DEFAULT_PRICE_PER_CREDIT,
              symbol: 'tCO₂',
              retiredCredits: 0,
            },
          });
        }

        analysis.prismaForestId = forest.id;
        indexUpdated = true;
      } catch (createError) {
        console.warn(`Skipping forest sync for analysis "${analysis.id}":`, createError);
        continue;
      }
    }

    if (indexUpdated) {
      await writeIndex(analyses);
    }

    const forestIds = valid
      .map((a) => a.prismaForestId)
      .filter((id): id is number => typeof id === 'number');

    const credits = await prisma.carbonCredit.findMany({
      where: { forestId: { in: forestIds } },
      include: { forest: true },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json(credits);
  } catch (error) {
    console.error('Failed to fetch marketplace credits:', error);
    return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
  }
}
