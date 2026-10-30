import { Fragment, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { paytiFetch } from '../PaytiSettingsDialog';

interface Row {
  id: number;
  direction: 'in' | 'out';
  kind: string;
  deal_id: string;
  ok: boolean;
  status: number | null;
  summary: string;
  request: string;
  response: string;
  source_ip: string;
  duration_ms: number;
  created_at: string;
  calls: Row[];
}

const KINDS: Record<string, string> = {
  'slots-hook': 'Вебхук из CRM',
  'slots-public-slots': 'Клиент: запрос времени',
  'slots-public-book': 'Клиент: запись',
  'slots-invite': 'Админ: создание ссылки',
  'slots-resend': 'Админ: дослать задачу или событие',
  'slots-cancel': 'Админ: отмена записи',
  'slots-retry': 'Автоповтор: задача и событие',
};

const FILTERS: [string, string][] = [
  ['', 'Все'],
  ['slots-hook', 'Вебхуки'],
  ['slots-public-slots', 'Запросы времени'],
  ['slots-public-book', 'Записи'],
];

const fmt = (s: string) => new Date(s.replace(' ', 'T') + 'Z').toLocaleString('ru-RU');

const pretty = (s: string) => {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
};

const Block = ({ title, text }: { title: string; text: string }) =>
  text ? (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <pre className="text-xs bg-muted rounded-md p-2 overflow-x-auto max-h-60 whitespace-pre-wrap break-all">{pretty(text)}</pre>
    </div>
  ) : null;

const ExchangeLog = () => {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [deal, setDeal] = useState('');

  const load = async (dealId = deal) => {
    setLoading(true);
    const d = await paytiFetch('slots-exchange', { query: `limit=100&deal=${encodeURIComponent(dealId.trim())}` });
    setItems(d.items || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const rows = items.filter((i) => !filter || i.kind === filter);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div>
          <p className="font-medium">Журнал обмена</p>
          <p className="text-xs text-muted-foreground">Входящие запросы и все обращения к Битрикс24. Хранится 30 дней</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); load(); }}>
            <Input className="h-8 w-36" value={deal} onChange={(e) => setDeal(e.target.value)} placeholder="Номер сделки" />
            <Button size="sm" type="submit" variant="outline">Найти</Button>
            {deal && <Button size="sm" type="button" variant="ghost" onClick={() => { setDeal(''); load(''); }}>Сбросить</Button>}
          </form>
          {FILTERS.map(([k, t]) => (
            <Button key={k} size="sm" variant={filter === k ? 'default' : 'outline'} onClick={() => setFilter(k)}>{t}</Button>
          ))}
          <Button size="sm" variant="outline" className="gap-2" onClick={() => load()} disabled={loading}>
            <Icon name="RefreshCw" size={14} className={loading ? 'animate-spin' : ''} />
            Обновить
          </Button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Время</th>
            <th className="text-left px-4 py-2 font-medium">Событие</th>
            <th className="text-left px-4 py-2 font-medium">Сделка</th>
            <th className="text-left px-4 py-2 font-medium">Результат</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">{loading ? 'Загружаю...' : 'Записей пока нет'}</td></tr>
          )}
          {rows.map((r) => (
            <Fragment key={r.id}>
              <tr className="border-t border-border align-top cursor-pointer hover:bg-muted/30" onClick={() => setOpen(open === r.id ? null : r.id)}>
                <td className="px-4 py-2 whitespace-nowrap">{fmt(r.created_at)}</td>
                <td className="px-4 py-2">
                  {KINDS[r.kind] || r.kind}
                  {r.calls.length > 0 && <p className="text-xs text-muted-foreground">запросов в Битрикс24: {r.calls.length}</p>}
                </td>
                <td className="px-4 py-2 font-mono">{r.deal_id || '—'}</td>
                <td className="px-4 py-2">
                  <Badge variant={r.ok ? 'default' : 'destructive'}>{r.ok ? 'Успешно' : 'Ошибка'}{r.status ? ` · ${r.status}` : ''}</Badge>
                  {r.summary && <p className="text-xs text-muted-foreground mt-1 max-w-xs break-words">{r.summary}</p>}
                </td>
              </tr>
              {open === r.id && (
                <tr className="bg-muted/20">
                  <td colSpan={4} className="px-6 py-3 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      {r.source_ip && <>Откуда: <span className="font-mono">{r.source_ip}</span> · </>}Время обработки: {r.duration_ms} мс
                    </p>
                    <Block title="Запрос" text={r.request} />
                    <Block title="Ответ" text={r.response} />
                    {r.calls.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Обращения к Битрикс24</p>
                        {r.calls.map((c) => (
                          <details key={c.id} className="border border-border rounded-md px-3 py-2">
                            <summary className="text-xs cursor-pointer flex items-center gap-2">
                              <Icon name={c.ok ? 'Check' : 'X'} size={14} className={c.ok ? 'text-primary' : 'text-destructive'} />
                              <span className="font-mono">{c.kind}</span>
                              <span className="text-muted-foreground">{c.duration_ms} мс</span>
                              {c.summary && <span className="text-destructive break-all">{c.summary}</span>}
                            </summary>
                            <div className="space-y-2 mt-2">
                              <Block title="Отправили" text={c.request} />
                              <Block title="Получили" text={c.response} />
                            </div>
                          </details>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

export default ExchangeLog;
