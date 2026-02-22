import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'saved_analyses.json');

async function getAnalyses() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
    return [];
  }
}

async function saveAnalyses(analyses: Record<string, unknown>[]) {
  await fs.writeFile(DATA_FILE, JSON.stringify(analyses, null, 2));
}

export async function GET() {
  const analyses = await getAnalyses();
  return NextResponse.json(analyses);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const analyses = await getAnalyses();

    const newAnalysis = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...body,
    };

    analyses.push(newAnalysis);
    await saveAnalyses(analyses);

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

    let analyses = await getAnalyses();
    analyses = analyses.filter((a: Record<string, unknown>) => a.id !== id);
    await saveAnalyses(analyses);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    return NextResponse.json({ error: 'Failed to delete analysis' }, { status: 500 });
  }
}
