'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

const EXAMPLE_PROMPTS = [
  'Кругосветное плавание Фрэнсиса Дрейка 1577–1580',
  'Экспедиция Амундсена к Южному полюсу 1911 г.',
  'Путешествие Ибн Баттуты из Марокко в Индию и Китай XIV в.',
  'Северный морской путь: плавание «Веги» Норденшельда 1878–1879',
  'Воздушный перелёт Чкалова Москва — Ванкувер 1937',
];

interface AIRouteDialogProps {
  onCreated?: (voyageId: string) => void;
}

export default function AIRouteDialog({ onCreated }: AIRouteDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error('Введите описание маршрута');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Не удалось сгенерировать маршрут');
      }
      toast.success(`Маршрут «${data.voyage.title}» успешно добавлен!`);
      setOpen(false);
      setPrompt('');
      onCreated?.(data.voyageId);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md border border-[#D9A441]/40 bg-[#D9A441]/10 px-3 py-2 font-[var(--font-body)] text-[12px] font-semibold text-[#D9A441] transition-all hover:border-[#D9A441] hover:bg-[#D9A441]/20"
        >
          <Wand2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">ИИ</span>
        </button>
      </DialogTrigger>
      <DialogContent className="border-[#D9A441]/30 bg-[#0F1D2E] text-[#EDE6D6] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-[var(--font-display)] text-[#EDE6D6]">
            <Sparkles className="h-5 w-5 text-[#D9A441]" />
            ИИ-генерация маршрута
          </DialogTitle>
          <DialogDescription className="font-[var(--font-body)] text-[12.5px] text-[#8CA0B4]">
            Опишите путешествие, которое хотите добавить на карту. ИИ-агент подберёт исторические данные и координаты точек маршрута.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Например: Первое кругосветное плавание Магеллана 1519–1522"
            rows={4}
            disabled={loading}
            aria-label="Описание маршрута"
            className="w-full resize-none rounded-md border border-white/13 bg-white/[0.05] px-3 py-2 font-[var(--font-body)] text-[13px] text-[#EDE6D6] outline-none transition-colors placeholder:text-[#8CA0B4]/60 focus:border-[#D9A441]"
          />

          <div>
            <p className="mb-1.5 font-[var(--font-body)] text-xs font-medium text-[#8CA0B4]">
              Примеры запросов:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  disabled={loading}
                  onClick={() => setPrompt(ex)}
                  className="rounded-full border border-white/[0.18] px-2.5 py-1 font-[var(--font-body)] text-[11px] text-[#8CA0B4] transition-colors hover:border-[#D9A441] hover:text-[#EDE6D6]"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="rounded-md border border-white/[0.15] px-3 py-1.5 font-[var(--font-body)] text-[12px] text-[#8CA0B4] transition-colors hover:border-white/30 hover:text-[#EDE6D6]"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="flex items-center gap-1.5 rounded-md bg-[#D9A441] px-3 py-1.5 font-[var(--font-body)] text-[12px] font-semibold text-[#141005] transition-all hover:bg-[#E5B45A] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Сгенерировать
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
