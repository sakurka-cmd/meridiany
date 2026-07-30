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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

const EXAMPLE_PROMPTS = [
  'Путешествие Марко Поло из Венеции в Китай',
  'Плавание капитана Блайта на «Баунти» и мятеж 1789 г.',
  'Экспедиция Амундсена к Южному полюсу 1911 г.',
  'Плавание Эрика Рыжего в Гренландию ~980 г.',
  'Путешествие Ибн Баттуты из Марокко в Индию и Китай',
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
        <Button size="sm" className="gap-1.5">
          <Wand2 className="h-4 w-4" />
          <span className="hidden sm:inline">ИИ-агент</span>
          <span className="sm:hidden">ИИ</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            ИИ-генерация маршрута
          </DialogTitle>
          <DialogDescription>
            Опишите путешествие, которое хотите добавить на карту. ИИ-агент
            подберёт исторические данные и координаты точек маршрута.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Например: Первое кругосветное плавание Магеллана 1519-1522"
            rows={4}
            disabled={loading}
            aria-label="Описание маршрута"
          />

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Примеры запросов:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  disabled={loading}
                  onClick={() => setPrompt(ex)}
                  className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Сгенерировать
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
