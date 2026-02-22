import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'saved_analyses.json');

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const analyses: Record<string, unknown>[] = JSON.parse(data);
    const analysis = analyses.find((a) => a.id === id);

    if (!analysis) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { biomassData, ...rest } = analysis;
    return NextResponse.json(rest);
  } catch {
    return NextResponse.json({ error: 'Failed to load analysis' }, { status: 500 });
  }
}
