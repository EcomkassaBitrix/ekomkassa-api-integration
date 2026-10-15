import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { paytiFetch } from './PaytiSettingsDialog';

interface Attempt {
  id: number;
  deal_id: string;
  status: string;
  environment?: string;
  registration_mode?: string;
  login?: string;
  email?: string;
  inn?: string;
  firm_id?: string;
  store_id?: string;
  agreement_id?: string;
  error_message?: string;
  source?: string;
  created_at: string;
}

interface Props {
  action: 'history' | 'ofd-history';
  refreshKey?: number;
}

const STATUS: Record<string, string> = {
  success: 'Успешно',
  already_registered: 'Уже зарегистрирован',
  already_exists: 'Уже существует',
  validation_failed: 'Не хватает данных',
  validation_error: 'Не хватает данных',
  payti_validation_error: 'Payti отклонил данные',
  ofd_validation_error: 'ОФД отклонил данные',
  duplicate: 'Дубль',
  temporary_error: 'Временная ошибка',
};

const SOURCE: Record<string, string> = {
  console: 'Консоль',
  hook: 'Хук из CRM',
  import: 'Старая база',
};

const AttemptsHistory = ({ action, refreshKey = 0 }: Props) => {
  const [items, setItems] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(false);
  const isPayti = action === 'history';

  const load = async () => {
    setLoading(true);
    const d = await paytiFetch(action);
    setItems(d.history || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [action, refreshKey]);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="font-medium">История попыток</p>
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
            {isPayti && <th className="text-left px-4 py-2 font-medium">Контур</th>}
            {isPayti && <th className="text-left px-4 py-2 font-medium">Режим</th>}
            <th className="text-left px-4 py-2 font-medium">{isPayti ? 'Логин' : 'Email'}</th>
            <th className="text-left px-4 py-2 font-medium">Статус</th>
            <th className="text-left px-4 py-2 font-medium">Источник</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={isPayti ? 7 : 5} className="text-center py-10 text-muted-foreground">
                {loading ? 'Загружаю...' : 'Попыток пока не было'}
              </td>
            </tr>
          )}
          {items.map((a) => (
            <tr key={a.id} className="border-t border-border align-top">
              <td className="px-4 py-2 whitespace-nowrap">{new Date(a.created_at).toLocaleString('ru-RU')}</td>
              <td className="px-4 py-2 font-mono">{a.deal_id}</td>
              {isPayti && <td className="px-4 py-2 uppercase">{a.environment}</td>}
              {isPayti && <td className="px-4 py-2">{a.registration_mode}</td>}
              <td className="px-4 py-2">{(isPayti ? a.login : a.email) || '—'}</td>
              <td className="px-4 py-2">
                <Badge variant={a.status === 'success' ? 'default' : 'destructive'}>{STATUS[a.status] || a.status}</Badge>
                {a.error_message && a.status !== 'success' && (
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs break-words">{a.error_message}</p>
                )}
              </td>
              <td className="px-4 py-2 text-muted-foreground">{SOURCE[a.source || ''] || a.source || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

export default AttemptsHistory;
