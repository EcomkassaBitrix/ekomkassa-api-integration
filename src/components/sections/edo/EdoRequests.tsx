import { Fragment, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { paytiFetch } from '../PaytiSettingsDialog';

interface Req { id: number; deal_id: string; deal_title: string | null; provider: string | null; status: string; error: string | null; created_at: string }
interface Doc { id: number; request_id: number; title: string; number: string; file_name: string; file_url: string; file_size: number; status: string; error: string | null }
interface Ev { request_id: number; step: string; ok: boolean; info: string; created_at: string }

const PROVIDERS: Record<string, string> = { diadoc: 'Диадок', potok: 'ЭДО Поток' };
const STATUSES: Record<string, string> = { processing: 'В работе', ready: 'Файлы готовы', sent: 'Отправлено', error: 'Ошибка', new: 'Новая' };
const DOC_STATUSES: Record<string, string> = { found: 'Найден', ready: 'Скачан', sent: 'Отправлен', error: 'Ошибка' };

const fmt = (iso: string) => new Date(iso + 'Z').toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const EdoRequests = ({ refreshKey }: { refreshKey: number }) => {
  const [items, setItems] = useState<Req[]>([]);
  const [docs, setDocs] = useState<Record<number, Doc[]>>({});
  const [events, setEvents] = useState<Record<number, Ev[]>>({});
  const [open, setOpen] = useState<number | null>(null);
  const [deal, setDeal] = useState('');
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const d = await paytiFetch('edo-requests');
    setItems(d.requests || []);
    setDocs(d.documents || {});
    setEvents(d.events || {});
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const run = async () => {
    if (!deal.trim()) return;
    setRunning(true);
    setMsg('');
    const d = await paytiFetch('edo-run', { query: `dealId=${encodeURIComponent(deal.trim())}` });
    setRunning(false);
    setMsg(d.ok ? 'Документы собраны' : d.error || 'Не удалось обработать сделку');
    load();
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        <Input className="w-48" placeholder="Номер сделки" value={deal} onChange={(e) => setDeal(e.target.value)} />
        <Button size="sm" onClick={run} disabled={running}>{running ? 'Собираю...' : 'Собрать документы'}</Button>
        <Button size="sm" variant="ghost" onClick={load}><Icon name="RefreshCw" size={14} /></Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Запросов пока нет</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map((r) => (
            <Fragment key={r.id}>
              <button className="w-full flex items-center gap-3 py-3 text-left text-sm" onClick={() => setOpen(open === r.id ? null : r.id)}>
                <Icon name={open === r.id ? 'ChevronDown' : 'ChevronRight'} size={16} />
                <span className="font-medium">Сделка {r.deal_id}</span>
                <span className="text-muted-foreground truncate">{r.deal_title}</span>
                <span className="ml-auto text-muted-foreground">{r.provider ? PROVIDERS[r.provider] : ''}</span>
                <span className={r.status === 'error' ? 'text-destructive' : 'text-foreground'}>{STATUSES[r.status] || r.status}</span>
                <span className="text-xs text-muted-foreground">{fmt(r.created_at)}</span>
              </button>
              {open === r.id && (
                <div className="pb-4 pl-7 space-y-3">
                  {r.error && <p className="text-sm text-destructive">{r.error}</p>}
                  {(docs[r.id] || []).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Чек-лист документов</p>
                      {docs[r.id].map((d) => (
                        <div key={d.id} className="flex items-center gap-2 text-sm">
                          <Icon name={d.status === 'sent' ? 'CircleCheck' : d.status === 'error' ? 'CircleX' : 'Circle'} size={14} className={d.status === 'error' ? 'text-destructive' : 'text-muted-foreground'} />
                          {d.file_url ? <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{d.title} ({d.file_name?.split('.').pop()})</a> : <span>{d.title}</span>}
                          <span className="text-xs text-muted-foreground">{DOC_STATUSES[d.status] || d.status}{d.error ? `: ${d.error}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Шаги</p>
                    {(events[r.id] || []).map((e, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <Icon name={e.ok ? 'Check' : 'X'} size={12} className={e.ok ? 'text-primary mt-0.5' : 'text-destructive mt-0.5'} />
                        <span>{e.step}</span>
                        <span className="text-muted-foreground">{e.info}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      )}
    </Card>
  );
};

export default EdoRequests;
