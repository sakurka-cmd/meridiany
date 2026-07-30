import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ExplorerDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/explorers — list all explorers with voyage counts
export async function GET() {
  try {
    const explorers = await db.explorer.findMany({
      orderBy: [{ birthYear: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { voyages: true } },
      },
    });

    const result: ExplorerDTO[] = explorers.map((e) => ({
      id: e.id,
      name: e.name,
      birthYear: e.birthYear,
      deathYear: e.deathYear,
      nationality: e.nationality,
      bio: e.bio,
      voyageCount: e._count.voyages,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('Failed to fetch explorers:', err);
    return NextResponse.json(
      { error: 'Не удалось загрузить путешественников' },
      { status: 500 }
    );
  }
}
