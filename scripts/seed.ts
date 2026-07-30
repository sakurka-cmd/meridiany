// Seed script: populates DB with both sea and land routes.
// Run with: bun run /home/z/my-project/scripts/seed.ts

import { db } from '../src/lib/db';
import { SEA_EXPLORERS } from './seed-sea';
import { LAND_EXPLORERS } from './seed-land';
import type { SeedExplorer } from './seed-types';

const ALL_EXPLORERS: SeedExplorer[] = [...SEA_EXPLORERS, ...LAND_EXPLORERS];

async function seed() {
  console.log('🧹 Очистка базы данных...');
  await db.routePoint.deleteMany();
  await db.voyage.deleteMany();
  await db.explorer.deleteMany();

  console.log(`🌍 Загрузка ${ALL_EXPLORERS.length} путешественников...`);

  for (const explorerData of ALL_EXPLORERS) {
    const { voyages, ...explorerInfo } = explorerData;
    const explorer = await db.explorer.create({
      data: {
        name: explorerInfo.name,
        who: explorerInfo.who ?? null,
        birthYear: explorerInfo.birthYear ?? null,
        deathYear: explorerInfo.deathYear ?? null,
        nationality: explorerInfo.nationality ?? null,
        bio: explorerInfo.bio ?? null,
        voyages: {
          create: voyages.map((v) => ({
            title: v.title,
            description: v.description,
            startYear: v.startYear ?? null,
            endYear: v.endYear ?? null,
            era: v.era,
            type: v.type,
            category: v.category,
            color: v.color,
            routePoints: {
              create: v.points.map((p, i) => ({
                order: i,
                name: p.name,
                description: p.description ?? null,
                latitude: p.lat,
                longitude: p.lng,
                arrivalDate: p.arrivalDate ?? null,
              })),
            },
          })),
        },
      },
    });
    console.log(`  ✓ ${explorer.name} (${voyages.length} плаваний)`);
  }

  const count = await db.explorer.count();
  const voyageCount = await db.voyage.count();
  const pointCount = await db.routePoint.count();
  console.log(
    `\n✅ Готово: ${count} путешественников, ${voyageCount} плаваний, ${pointCount} точек маршрутов`
  );
}

seed()
  .catch((e) => {
    console.error('Ошибка при загрузке данных:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
