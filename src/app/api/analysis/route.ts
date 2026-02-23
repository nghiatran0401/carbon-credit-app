import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { biomassToCredits, DEFAULT_PRICE_PER_CREDIT } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const ANALYSES_DIR = path.join(process.cwd(), 'data', 'analyses');
const INDEX_FILE = path.join(ANALYSES_DIR, 'index.json');

async function ensureDir() {
  await fs.mkdir(ANALYSES_DIR, { recursive: true });
}

async function readIndex(): Promise<Record<string, unknown>[]> {
  try {
    const raw = await fs.readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeIndex(entries: Record<string, unknown>[]) {
  await ensureDir();
  await fs.writeFile(INDEX_FILE, JSON.stringify(entries, null, 2));
}

function formatLocation(bounds?: {
  north: number;
  south: number;
  east: number;
  west: number;
}): string {
  if (!bounds) return 'Analysis Region';
  const lat = ((bounds.north + bounds.south) / 2).toFixed(4);
  const lng = ((bounds.east + bounds.west) / 2).toFixed(4);
  return `${lat}°N, ${lng}°E`;
}

export async function GET() {
  const index = await readIndex();
  return NextResponse.json(index);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const newAnalysis: Record<string, unknown> = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...body,
    };

    await ensureDir();

    // Write full analysis (with mask/biomassData) to its own file
    const analysisPath = path.join(ANALYSES_DIR, `${newAnalysis.id}.json`);
    await fs.writeFile(analysisPath, JSON.stringify(newAnalysis));

    // Create Forest + CarbonCredit in Prisma so the marketplace can sell them
    const stats = newAnalysis.stats as
      | { forestBiomassMg?: number; forestAreaKm2?: number }
      | undefined;

    if (stats?.forestBiomassMg && stats.forestBiomassMg > 0) {
      try {
        const totalCredits = Math.floor(biomassToCredits(stats.forestBiomassMg));
        const areaHa = (stats.forestAreaKm2 ?? 0) * 100;
        const bounds = newAnalysis.bounds as
          | { north: number; south: number; east: number; west: number }
          | undefined;

        const forest = await prisma.forest.create({
          data: {
            name: (newAnalysis.name as string) || 'Forest Analysis',
            location: formatLocation(bounds),
            type: 'Analyzed',
            area: areaHa,
            description:
              (newAnalysis.description as string) || 'Carbon credit from biomass analysis',
            status: 'ACTIVE',
            lastUpdated: new Date(),
          },
        });

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

        newAnalysis.prismaForestId = forest.id;
      } catch (err) {
        console.error('Failed to create Prisma records for analysis:', err);
      }
    }

    // Append a lightweight entry (no mask/biomassData) to the index
    const { biomassData, mask, ...lightweight } = newAnalysis;
    const index = await readIndex();
    index.push(lightweight);
    await writeIndex(index);

    return NextResponse.json(newAnalysis);
  } catch (error) {
    console.error('Error saving analysis:', error);
    return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const index = await readIndex();
    const toDelete = index.find((a) => a.id === id);

    // Clean up corresponding Prisma Forest (cascade deletes CarbonCredit)
    if (toDelete?.prismaForestId) {
      try {
        await prisma.forest.delete({
          where: { id: toDelete.prismaForestId as number },
        });
      } catch {
        // Forest might already be deleted
      }
    }

    // Remove from index
    const filtered = index.filter((a) => a.id !== id);
    await writeIndex(filtered);

    // Remove individual file (ignore if missing)
    const filePath = path.join(ANALYSES_DIR, `${id}.json`);
    await fs.unlink(filePath).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    return NextResponse.json({ error: 'Failed to delete analysis' }, { status: 500 });
  }
}
