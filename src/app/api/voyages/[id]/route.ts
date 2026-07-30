import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { VoyageDTO } from '@/lib/types';

export const dynamic = 'force-dynamic';

// GET /api/voyages/[id] — single voyage with all route points
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const voyage = await db.voyage.findUnique({
      where: { id },
      include: {
        explorer: { select: { id: true, name: true, who: true } },
        routePoints: { orderBy: { order: 'asc' } },
      },
    });

    if (!voyage) {
      return NextResponse.json(
        { error: 'Плавание не найдено' },
        { status: 404 }
      );
    }

    const result: VoyageDTO = {
      id: voyage.id,
      title: voyage.title,
      description: voyage.description,
      startYear: voyage.startYear,
      endYear: voyage.endYear,
      era: voyage.era,
      type: voyage.type,
      category: voyage.category,
      color: voyage.color,
      explorerId: voyage.explorer.id,
      explorerName: voyage.explorer.name,
      explorerWho: voyage.explorer.who,
      routePoints: voyage.routePoints.map((p) => ({
        id: p.id,
        order: p.order,
        name: p.name,
        description: p.description,
        latitude: p.latitude,
        longitude: p.longitude,
        arrivalDate: p.arrivalDate,
      })),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('Failed to fetch voyage:', err);
    return NextResponse.json(
      { error: 'Не удалось загрузить плавание' },
      { status: 500 }
    );
  }
}
