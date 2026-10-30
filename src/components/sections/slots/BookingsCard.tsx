import { Fragment, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { paytiFetch } from '../PaytiSettingsDialog';

interface Booking {
  id: number;
  deal_id: string;
  deal_title: string;
  status: string;
  employee_name: string | null;
  start_at: string | null;
  task_id: string | null;
  event_id: string | null;
  reschedule_count: number;
  service_name: string | null;
  link: string;
  created_at: string;
}
interface Ev {
  step: string;
  ok: boolean;
  info: string;
}

const STATUS: Record<string, { text: string; tone: 'default' | 'secondary' | 'destructive' }> = {
  invited: { text: 'Ждём выбора времени', tone: 'secondary' },
  booked: { text: 'Записан', tone: 'default' },
  cancelled: { text: 'Отменена', tone: 'destructive' },
};

const when = (s: string | null, tz: string) =>
  s ? new Date(s.replace(' ', 'T') + 'Z').toLocaleString('ru-RU', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const BookingsCard = ({ refreshKey }: { refreshKey: number }) => {
  const [items, setItems] = useState<Booking[]>([]);
  const [events, setEvents] = useState<Record<number, Ev[]>>({});
  const [tz, setTz] = useState('Europe/Moscow');
  const [open, setOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [deal, setDeal] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState('');

  const load = async () => {
    setLoading(true);
    const d = await paytiFetch('slots-bookings');
    setItems(d.bookings || []);
    setEvents(d.events || {});
    if (d.timezone) setTz(d.timezone);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const invite = async () => {
    setMsg('');
    const d = await paytiFetch('slots-invite', { method: 'POST', body: { dealId: deal } });
    setMsg(d.ok ? `Ссылка готова: ${d.link}` : d.error || 'Ошибка');
    if (d.ok) {
      navigator.clipboard.writeText(d.link);
      load();
    }
  };

  const resend = async (id: number, kind: 'task' | 'event') => {
    const key = `${id}-${kind}`;
    setSending(key);
    const d = await paytiFetch('slots-resend', { method: 'POST', body: { id, kind } });
    setSending('');
    setMsg(d.ok ? '' : d.error || 'Ошибка');
    load();
  };

  const cancel = async (id: number) => {
    await paytiFetch('slots-cancel', { method: 'POST', body: { id } });
    load();
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-3 flex-wrap">
        <p className="font-medium">Записи клиентов</p>
        <div className="flex gap-2 items-center">
          <Input className="w-40" value={deal} onChange={(e) => setDeal(e.target.value)} placeholder="Номер сделки" />
          <Button size="sm" variant="outline" onClick={invite} disabled={!deal.trim()}>Создать ссылку</Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={load} disabled={loading}>
            <Icon name="RefreshCw" size={14} className={loading ? 'animate-spin' : ''} />
            Обновить
          </Button>
        </div>
      </div>
      {msg && <p className="px-4 py-2 text-sm bg-muted/40 break-all">{msg}</p>}
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Сделка</th>
            <th className="text-left px-4 py-2 font-medium">Услуга</th>
            <th className="text-left px-4 py-2 font-medium">Время</th>
            <th className="text-left px-4 py-2 font-medium">Статус</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">{loading ? 'Загружаю...' : 'Записей пока нет'}</td></tr>
          )}
          {items.map((b) => {
            const st = STATUS[b.status] || { text: b.status, tone: 'secondary' as const };
            return (
              <Fragment key={b.id}>
                <tr className="border-t border-border align-top cursor-pointer hover:bg-muted/30" onClick={() => setOpen(open === b.id ? null : b.id)}>
                  <td className="px-4 py-2"><span className="font-mono">{b.deal_id}</span><p className="text-xs text-muted-foreground">{b.deal_title}</p></td>
                  <td className="px-4 py-2">{b.service_name || '—'}</td>
                  <td className="px-4 py-2">
                    {when(b.start_at, tz)}
                    {b.employee_name && <p className="text-xs text-muted-foreground">{b.employee_name}{b.reschedule_count ? ` · переносов: ${b.reschedule_count}` : ''}</p>}
                  </td>
                  <td className="px-4 py-2"><Badge variant={st.tone}>{st.text}</Badge></td>
                  <td className="px-4 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button className="text-muted-foreground hover:text-foreground mr-3" title="Копировать ссылку" onClick={() => navigator.clipboard.writeText(b.link)}><Icon name="Link" size={16} /></button>
                    {b.status !== 'cancelled' && <button className="text-muted-foreground hover:text-destructive" title="Отменить" onClick={() => cancel(b.id)}><Icon name="Ban" size={16} /></button>}
                  </td>
                </tr>
                {open === b.id && (
                  <tr className="bg-muted/20">
                    <td colSpan={5} className="px-6 py-3">
                      {b.status === 'booked' && [
                        { step: 'Задача создана', id: b.task_id, kind: 'task' as const },
                        { step: 'Запись в календаре', id: b.event_id, kind: 'event' as const },
                      ].map((c) => (
                        <div key={c.step} className="flex gap-3 text-xs py-0.5">
                          <Icon name={c.id ? 'Check' : 'X'} size={14} className={c.id ? 'text-primary' : 'text-destructive'} />
                          <span className="w-52 shrink-0">{c.step}</span>
                          <span className="text-muted-foreground">{c.id ? `№${c.id}` : 'не создана'}</span>
                          {!c.id && (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs" disabled={sending === `${b.id}-${c.kind}`} onClick={() => resend(b.id, c.kind)}>
                              {sending === `${b.id}-${c.kind}` ? 'Отправляю...' : 'Дослать'}
                            </Button>
                          )}
                        </div>
                      ))}
                      {(events[b.id] || []).length === 0 && <p className="text-xs text-muted-foreground">Событий нет</p>}
                      {(events[b.id] || []).map((e, i) => (
                        <div key={i} className="flex gap-3 text-xs py-0.5">
                          <Icon name={e.ok ? 'Check' : 'X'} size={14} className={e.ok ? 'text-primary' : 'text-destructive'} />
                          <span className="w-52 shrink-0">{e.step}</span>
                          <span className="text-muted-foreground break-all">{e.info}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

export default BookingsCard;
