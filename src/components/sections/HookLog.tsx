import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { paytiFetch } from './PaytiSettingsDialog';

interface HookItem {
  id: number;
  deal_id: string;
  key_given: boolean;
  result_status: number | null;
  result_text: string;
  source_ip: string;
  user_agent: string;
  created_at: string;
}

interface Props {
  kind: 'payti' | 'ofd' | 'fns';
  refreshKey?: number;
}

const verdict = (h: HookItem): { text: string; tone: 'default' | 'secondary' | 'destructive' } => {
  if (h.result_status === 401) return { text: h.key_given ? 'Неверный ключ' : 'Нет ключа', tone: 'destructive' };
  if (h.result_status && h.result_status >= 500) return { text: 'Ошибка сервера', tone: 'destructive' };
  if (h.result_status && h.result_status >= 400) return { text: 'Отклонён', tone: 'destructive' };
  return { text: 'Принят', tone: 'default' };
};

const HookLog = ({ kind, refreshKey }: Props) => {
  const [items, setItems] = useState<HookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);

  const load = async () => {
    setLoading(true);
    const d = await paytiFetch('hook-log', { query: `kind=${kind}&limit=30` });
    setItems(d.items || []);
    setLoading(false);
  };

  useEffect(() => {
    if (shown) load();
  }, [shown, refreshKey]);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <p className="font-medium">Входящие вебхуки из CRM</p>
          <p className="text-xs text-muted-foreground">Каждый запрос от CRM, даже если он отклонён</p>
        </div>
        {shown ? (
          <Button size="sm" variant="outline" className="gap-2" onClick={load} disabled={loading}>
            <Icon name="RefreshCw" size={14} className={loading ? 'animate-spin' : ''} />
            Обновить
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShown(true)}>Показать</Button>
        )}
      </div>
      {shown && (
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Время</th>
              <th className="text-left px-4 py-2 font-medium">Сделка</th>
              <th className="text-left px-4 py-2 font-medium">Результат</th>
              <th className="text-left px-4 py-2 font-medium">Откуда</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-muted-foreground">{loading ? 'Загружаю...' : 'Запросов от CRM пока не было'}</td>
              </tr>
            )}
            {items.map((h) => {
              const v = verdict(h);
              return (
                <tr key={h.id} className="border-t border-border align-top">
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(h.created_at.replace(' ', 'T') + 'Z').toLocaleString('ru-RU')}</td>
                  <td className="px-4 py-2 font-mono">{h.deal_id || '—'}</td>
                  <td className="px-4 py-2">
                    <Badge variant={v.tone}>{v.text}</Badge>
                    {h.result_text && h.result_text !== 'ok' && <p className="text-xs text-muted-foreground mt-1 max-w-xs break-words">{h.result_text}</p>}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    <span className="font-mono">{h.source_ip || '—'}</span>
                    <p className="max-w-[220px] truncate">{h.user_agent}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
};

export default HookLog;
