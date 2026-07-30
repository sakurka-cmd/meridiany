import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { VoyageDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/voyages
// Optional query params: ?era=...&explorerId=...
// Always returns full route points (so the page can render map + list from a single call).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const era = searchParams.get('era');
    const explorerId = searchParams.get('explorerId');

    const voyages = await db.voyage.findMany({
      where: {
        ...(era && era !== 'all' ? { era } : {}),
        ...(explorerId && explorerId !== 'all' ? { explorerId } : {}),
      },
      orderBy: [{ startYear: 'asc' }, { title: 'asc' }],
      include: {
        explorer: { select: { id: true, name: true } },
        routePoints: { orderBy: { order: 'asc' } },
      },
    });

    const result: VoyageDTO[] = voyages.map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      startYear: v.startYear,
      endYear: v.endYear,
      era: v.era,
      type: v.type,
      color: v.color,
      explorerId: v.explorer.id,
      explorerName: v.explorer.name,
      routePoints: v.routePoints.map((p) => ({
        id: p.id,
        order: p.order,
        name: p.name,
        description: p.description,
        latitude: p.latitude,
        longitude: p.longitude,
        arrivalDate: p.arrivalDate,
      })),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('Failed to fetch voyages:', err);
    return NextResponse.json(
      { error: 'Не удалось загрузить плавания' },
      { status: 500 }
    );
  }
}
