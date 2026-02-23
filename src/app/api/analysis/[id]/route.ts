import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const ANALYSES_DIR = path.join(process.cwd(), 'data', 'analyses');
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!SAFE_ID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'Invalid analysis ID' }, { status: 400 });
    }

    const filePath = path.join(ANALYSES_DIR, `${id}.json`);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(ANALYSES_DIR))) {
      return NextResponse.json({ error: 'Invalid analysis ID' }, { status: 400 });
    }

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
