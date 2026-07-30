import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

export const dynamic = 'force-dynamic';

interface AIPoint {
  name: string;
  lat: number;
  lng: number;
  description?: string;
  arrivalDate?: string;
}

interface AIGeneratedRoute {
  explorerName: string;
  explorerWho?: string;
  explorerBio?: string;
  birthYear?: number;
  deathYear?: number;
  nationality?: string;
  voyageTitle: string;
  voyageDescription: string;
  startYear?: number;
  endYear?: number;
  era: string;
  type?: string;
  category?: string;
  color?: string;
  points: AIPoint[];
}

const SYSTEM_PROMPT = `Ты — историк-картограф и ИИ-агент, помогающий создавать данные о маршрутах исторических путешествий.

Твоя задача: по описанию путешествия сгенерировать точный структурированный маршрут с реальными географическими координатами.

ТРЕБОВАНИЯ:
1. Возвращай ТОЛЬКО валидный JSON, без пояснений, без markdown-обёрток.
2. Используй реальные географические координаты (широта от -90 до 90, долгота от -180 до 180).
3. Каждое плавание должно содержать минимум 5 точек маршрута — для плавной отрисовки кривой.
4. Точки должны идти в хронологическом порядке путешествия.
5. Поле era должно быть одной из строк: "Древность", "Средние века", "Век паруса", "XIX–XX века", "Современность".
   Правила отнесения к эпохе:
   - "Древность" — от палеолита до ~1000 г. н. э. (включая викингов, полинезийцев, античность)
   - "Средние века" — 1000–1400 гг. (включая Марко Поло, Чжэн Хэ)
   - "Век паруса" — 1400–1850 гг. (Великие географические открытия, кругосветки)
   - "XIX–XX века" — 1850–1950 гг.
   - "Современность" — после 1950 г.
6. Поле type: "sea" (морской), "land" (сухопутный), "mixed" (смешанный), "air" (воздушный).
7. Поле color — HEX-цвет линии в формате "#RRGGBB", выбирай контрастный к существующим.
8. Поле category — короткая категория на русском: "Кругосветное плавание", "Торговая", "Исследовательская", "Дипломатическая", "Колонизационная", "Научная", "Спортивная", "Миграционная".
9. Если данных о каких-то полях нет — пропускай их (они будут null).

ФОРМАТ ОТВЕТА:
{
  "explorerName": "Имя путешественника или группы",
  "explorerWho": "Краткое описание (например: 'португальская корона', 'народы лапита')",
  "explorerBio": "Краткая биография (1-3 предложения)",
  "birthYear": 1480,
  "deathYear": 1521,
  "nationality": "Португалия",
  "voyageTitle": "Название плавания",
  "voyageDescription": "Описание плавания (2-4 предложения)",
  "startYear": 1519,
  "endYear": 1522,
  "era": "Век паруса",
  "type": "sea",
  "category": "Кругосветное плавание",
  "color": "#F26B1D",
  "points": [
    {
      "name": "Санлукар-де-Баррамеда",
      "lat": 36.77,
      "lng": -6.35,
      "description": "Отправление 20 сентября 1519 г.",
      "arrivalDate": "20 сентября 1519 г."
    }
  ]
}`;

const COLORS = ['#dc2626', '#0891b2', '#16a34a', '#b45309', '#7c3aed', '#db2777', '#0d9488', '#c026d3'];

interface RequestBody {
  prompt: string;
}

function extractJSON(text: string): unknown {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }
  // Find first { and last }
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1) {
    throw new Error('В ответе ИИ не найден JSON-объект');
  }
  cleaned = cleaned.slice(first, last + 1);
  return JSON.parse(cleaned);
}

function validateRoute(data: unknown): AIGeneratedRoute {
  if (!data || typeof data !== 'object') {
    throw new Error('ИИ вернул некорректные данные');
  }
  const r = data as Record<string, unknown>;
  if (typeof r.explorerName !== 'string' || !r.explorerName.trim()) {
    throw new Error('Поле explorerName обязательно');
  }
  if (typeof r.voyageTitle !== 'string' || !r.voyageTitle.trim()) {
    throw new Error('Поле voyageTitle обязательно');
  }
  if (typeof r.voyageDescription !== 'string' || !r.voyageDescription.trim()) {
    throw new Error('Поле voyageDescription обязательно');
  }
  if (typeof r.era !== 'string') {
    throw new Error('Поле era обязательно');
  }
  if (!Array.isArray(r.points) || r.points.length < 5) {
    throw new Error('Поле points должно содержать минимум 5 точек');
  }
  const points = (r.points as unknown[]).map((p, i) => {
    const pt = p as Record<string, unknown>;
    if (typeof pt.name !== 'string') {
      throw new Error(`Точка ${i + 1}: поле name обязательно`);
    }
    if (typeof pt.lat !== 'number' || typeof pt.lng !== 'number') {
      throw new Error(`Точка ${i + 1}: lat и lng должны быть числами`);
    }
    if (pt.lat < -90 || pt.lat > 90 || pt.lng < -180 || pt.lng > 180) {
      throw new Error(`Точка ${i + 1}: координаты вне диапазона`);
    }
    return {
      name: pt.name,
      lat: pt.lat,
      lng: pt.lng,
      description: typeof pt.description === 'string' ? pt.description : undefined,
      arrivalDate: typeof pt.arrivalDate === 'string' ? pt.arrivalDate : undefined,
    };
  });
  return {
    explorerName: r.explorerName,
    explorerWho: typeof r.explorerWho === 'string' ? r.explorerWho : undefined,
    explorerBio: typeof r.explorerBio === 'string' ? r.explorerBio : undefined,
    birthYear: typeof r.birthYear === 'number' ? r.birthYear : undefined,
    deathYear: typeof r.deathYear === 'number' ? r.deathYear : undefined,
    nationality: typeof r.nationality === 'string' ? r.nationality : undefined,
    voyageTitle: r.voyageTitle,
    voyageDescription: r.voyageDescription,
    startYear: typeof r.startYear === 'number' ? r.startYear : undefined,
    endYear: typeof r.endYear === 'number' ? r.endYear : undefined,
    era: r.era,
    type: typeof r.type === 'string' ? r.type : 'sea',
    category: typeof r.category === 'string' ? r.category : undefined,
    color: typeof r.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.color) ? r.color : COLORS[Math.floor(Math.random() * COLORS.length)],
    points,
  };
}

// POST /api/ai/generate-route
// Body: { "prompt": "Добавь маршрут путешествия Колумба в Америку" }
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const prompt = body?.prompt?.trim();
    if (!prompt) {
      return NextResponse.json(
        { error: 'Поле prompt обязательно' },
        { status: 400 }
      );
    }

    // 1. Call LLM to generate route structure
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content ?? '';
    if (!content) {
      return NextResponse.json(
        { error: 'ИИ вернул пустой ответ' },
        { status: 502 }
      );
    }

    // 2. Parse + validate the JSON
    let route: AIGeneratedRoute;
    try {
      const parsed = extractJSON(content);
      route = validateRoute(parsed);
    } catch (parseErr) {
      console.error('LLM response could not be parsed:', content, parseErr);
      return NextResponse.json(
        {
          error: 'Не удалось разобрать ответ ИИ. Попробуйте уточнить запрос.',
          raw: content.slice(0, 500),
        },
        { status: 502 }
      );
    }

    // 3. Persist to DB — reuse existing explorer if name matches
    const existing = await db.explorer.findFirst({
      where: { name: { equals: route.explorerName } },
    });

    const explorer = await db.explorer.upsert({
      where: { id: existing?.id ?? '__does_not_exist__' },
      update: {
        who: route.explorerWho ?? existing?.who ?? null,
        bio: route.explorerBio ?? existing?.bio ?? null,
        birthYear: route.birthYear ?? existing?.birthYear ?? null,
        deathYear: route.deathYear ?? existing?.deathYear ?? null,
        nationality: route.nationality ?? existing?.nationality ?? null,
      },
      create: {
        name: route.explorerName,
        who: route.explorerWho ?? null,
        bio: route.explorerBio ?? null,
        birthYear: route.birthYear ?? null,
        deathYear: route.deathYear ?? null,
        nationality: route.nationality ?? null,
      },
    });

    const voyage = await db.voyage.create({
      data: {
        explorerId: explorer.id,
        title: route.voyageTitle,
        description: route.voyageDescription,
        startYear: route.startYear ?? null,
        endYear: route.endYear ?? null,
        era: route.era,
        type: route.type ?? 'sea',
        category: route.category ?? null,
        color: route.color,
        routePoints: {
          create: route.points.map((p, i) => ({
            order: i,
            name: p.name,
            description: p.description ?? null,
            latitude: p.lat,
            longitude: p.lng,
            arrivalDate: p.arrivalDate ?? null,
          })),
        },
      },
      include: {
        explorer: { select: { id: true, name: true, who: true } },
        routePoints: { orderBy: { order: 'asc' } },
      },
    });

    return NextResponse.json({
      success: true,
      explorerId: explorer.id,
      voyageId: voyage.id,
      voyage: {
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
      },
    });
  } catch (err) {
    console.error('AI route generation failed:', err);
    return NextResponse.json(
      { error: 'Не удалось сгенерировать маршрут. Попробуйте ещё раз.' },
      { status: 500 }
    );
  }
}
