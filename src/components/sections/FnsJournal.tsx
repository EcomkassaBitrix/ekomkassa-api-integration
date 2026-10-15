import { Fragment, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { paytiFetch } from './PaytiSettingsDialog';

interface App {
  id: number;
  deal_id: string;
  status: string;
  inn?: string;
  company_name?: string;
  serial_number?: string;
  rnm?: string;
  error_message?: string;
  source?: string;
  public_token?: string;
  created_at: string;
  expired?: boolean;
}
interface Ev {
  step: string;
  ok: boolean;
  info: string;
  created_at: string;
}

const STATUS: Record<string, { text: string; tone: 'default' | 'secondary' | 'destructive' }> = {
  created: { text: 'Ждёт подписи клиента', tone: 'secondary' },
  awaiting_signature: { text: 'Клиент открыл, ждём подпись', tone: 'secondary' },
  signing: { text: 'Подпись отправляется', tone: 'secondary' },
  sign_uncertain: { text: 'Подпись: нет ответа ОФД', tone: 'destructive' },
  sent_to_fns: { text: 'Отправлена в ФНС', tone: 'default' },
  approved: { text: 'Зарегистрирована, РНМ получен', tone: 'default' },
  rejected: { text: 'ФНС отклонила', tone: 'destructive' },
  test_created: { text: 'Тест: ждёт подписи', tone: 'secondary' },
  test_awaiting_signature: { text: 'Тест: ждёт подпись', tone: 'secondary' },
  test_signed: { text: 'Тест: подписана', tone: 'default' },
  validation_failed: { text: 'Не хватает данных', tone: 'destructive' },
  ofd_validation_error: { text: 'ОФД отклонил данные', tone: 'destructive' },
  ofd_error: { text: 'Ошибка ОФД', tone: 'destructive' },
  temporary_error: { text: 'Временная ошибка', tone: 'destructive' },
};
const SOURCE: Record<string, string> = { console: 'Консоль', hook: 'Хук из CRM' };

interface Props {
  refreshKey: number;
  baseUrl: string;
}

const FnsJournal = ({ refreshKey, baseUrl }: Props) => {
  const [items, setItems] = useState<App[]>([]);
  const [base, setBase] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const d = await paytiFetch('fns-history');
    setItems(d.history || []);
    setBase(d.baseUrl || '');
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const toggle = async (id: number) => {
    if (open === id) {
      setOpen(null);
      return;
    }
    setOpen(id);
    setEvents([]);
    const d = await paytiFetch('fns-events', { query: `id=${id}` });
    setEvents(d.events || []);
  };

  const refresh = async (id: number) => {
    setBusy(id);
    await paytiFetch('fns-refresh', { method: 'POST', body: { id } });
    setBusy(null);
    load();
    if (open === id) toggle(id).then(() => toggle(id));
  };

  const linkOf = (a: App) => `${(base || baseUrl).replace(/\/$/, '')}/sign/${a.public_token}`;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="font-medium">Журнал заявок</p>
        <Button size="sm" variant="outline" className="gap-2" onClick={load} disabled={loading}>
          <Icon name="RefreshCw" size={14} className={loading ? 'animate-spin' : ''} />
          Обновить
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Дата</th>
            <th className="text-left px-4 py-2 font-medium">Сделка</th>
            <th className="text-left px-4 py-2 font-medium">Организация</th>
            <th className="text-left px-4 py-2 font-medium">Касса</th>
            <th className="text-left px-4 py-2 font-medium">Статус</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-10 text-muted-foreground">{loading ? 'Загружаю...' : 'Заявок пока не было'}</td>
            </tr>
          )}
          {items.map((a) => {
            const st = STATUS[a.status] || { text: a.status, tone: 'secondary' as const };
            return (
              <Fragment key={a.id}>
                <tr className="border-t border-border align-top cursor-pointer hover:bg-muted/30" onClick={() => toggle(a.id)}>
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(a.created_at.replace(' ', 'T') + 'Z').toLocaleString('ru-RU')}</td>
                  <td className="px-4 py-2 font-mono">{a.deal_id}</td>
                  <td className="px-4 py-2">
                    {a.company_name || '—'}
                    <p className="text-xs text-muted-foreground">{a.inn} · {SOURCE[a.source || ''] || a.source}</p>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{a.serial_number || '—'}</td>
                  <td className="px-4 py-2">
                    <Badge variant={st.tone}>{st.text}</Badge>
                    {a.rnm && <p className="text-xs mt-1">РНМ: <span className="font-mono">{a.rnm}</span></p>}
                    {a.error_message && <p className="text-xs text-muted-foreground mt-1 max-w-xs break-words">{a.error_message}</p>}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {a.public_token && (
                      <button className="text-muted-foreground hover:text-foreground mr-3" title="Копировать ссылку для подписи" onClick={() => navigator.clipboard.writeText(linkOf(a))}>
                        <Icon name="Link" size={16} />
                      </button>
                    )}
                    {['sent_to_fns', 'created', 'awaiting_signature', 'sign_uncertain'].includes(a.status) && (
                      <button className="text-muted-foreground hover:text-foreground" title="Обновить статус в ОФД" onClick={() => refresh(a.id)} disabled={busy === a.id}>
                        <Icon name="RefreshCw" size={16} className={busy === a.id ? 'animate-spin' : ''} />
                      </button>
                    )}
                  </td>
                </tr>
                {open === a.id && (
                  <tr className="bg-muted/20">
                    <td colSpan={6} className="px-6 py-3">
                      {events.length === 0 && <p className="text-muted-foreground text-xs">Загрузка...</p>}
                      {events.map((e, i) => (
                        <div key={i} className="flex gap-3 text-xs py-0.5">
                          <Icon name={e.ok ? 'Check' : 'X'} size={14} className={e.ok ? 'text-primary' : 'text-destructive'} />
                          <span className="w-44 shrink-0">{e.step}</span>
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

export default FnsJournal;
