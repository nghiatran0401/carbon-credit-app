import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const ANALYSES_DIR = path.join(process.cwd(), 'data', 'analyses');

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const filePath = path.join(ANALYSES_DIR, `${id}.json`);

    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const analysis: Record<string, unknown> = JSON.parse(raw);
    const { biomassData, ...rest } = analysis;
    return NextResponse.json(rest);
  } catch {
    return NextResponse.json({ error: 'Failed to load analysis' }, { status: 500 });
  }
}
