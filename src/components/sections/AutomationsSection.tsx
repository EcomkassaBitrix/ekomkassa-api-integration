import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

const AUTOMATIONS_URL = '';
const API_KEY = 'ek_live_j8h3k2n4m5p6q7r8';

interface Job {
  id: number;
  kind: string;
  deal_id: string;
  status: string;
  account_login: string | null;
  last_error: string | null;
  attempts: number;
  raw_payload: string | null;
  created_at: string;
}

const statusLabel: Record<string, string> = {
  received: 'Получен',
  created: 'Создан',
  error: 'Ошибка',
};

const tabs = [
  { id: 'lk', label: 'ЛК Екомкасса', icon: 'UserCog' },
  { id: 'ofd', label: 'ОФД', icon: 'Receipt' },
];

const AutomationsSection = () => {
  const [kind, setKind] = useState('lk');
  const [view, setView] = useState<'accounts' | 'hooks'>('accounts');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    if (!AUTOMATIONS_URL) {
      setError('Функция автоматизаций ещё не подключена');
      return;
    }
    setLoading(true);
    setError('');
    const res = await fetch(`${AUTOMATIONS_URL}?kind=${kind}`, { headers: { 'X-Api-Key': API_KEY } });
    const data = await res.json();
    setJobs(data.jobs || []);
    setLoading(false);
  };

  const retry = async (id: number) => {
    setRetrying(id);
    await fetch(AUTOMATIONS_URL, {
      method: 'POST',
      headers: { 'X-Api-Key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retry', id }),
    });
    setRetrying(null);
    load();
  };

  useEffect(() => {
    load();
  }, [kind]);

  const visible = view === 'accounts' ? jobs.filter((j) => j.status !== 'received') : jobs;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setKind(t.id)}
            className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 transition-all ${
              kind === t.id
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name={t.icon} size={18} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button size="sm" variant={view === 'accounts' ? 'default' : 'outline'} onClick={() => setView('accounts')}>
            Созданные кабинеты
          </Button>
          <Button size="sm" variant={view === 'hooks' ? 'default' : 'outline'} onClick={() => setView('hooks')}>
            Журнал хуков
          </Button>
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={load} disabled={loading}>
          <Icon name="RefreshCw" size={16} className={loading ? 'animate-spin' : ''} />
          Обновить
        </Button>
      </div>

      {error && (
        <Card className="p-4 text-sm text-destructive border-destructive/30 bg-destructive/10">{error}</Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Сделка CRM</th>
              <th className="text-left px-4 py-3 font-medium">Статус</th>
              <th className="text-left px-4 py-3 font-medium">{view === 'accounts' ? 'Логин кабинета' : 'Данные хука'}</th>
              <th className="text-left px-4 py-3 font-medium">Попытки</th>
              <th className="text-left px-4 py-3 font-medium">Дата</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  Пока ничего нет
                </td>
              </tr>
            )}
            {visible.map((j) => (
              <tr key={j.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono">{j.deal_id}</td>
                <td className="px-4 py-3">
                  <Badge variant={j.status === 'created' ? 'default' : j.status === 'error' ? 'destructive' : 'secondary'}>
                    {statusLabel[j.status] || j.status}
                  </Badge>
                  {j.last_error && j.status === 'error' && (
                    <p className="text-xs text-destructive mt-1">{j.last_error}</p>
                  )}
                </td>
                <td className="px-4 py-3 max-w-xs truncate font-mono text-xs">
                  {view === 'accounts' ? j.account_login || '—' : j.raw_payload}
                </td>
                <td className="px-4 py-3">{j.attempts}</td>
                <td className="px-4 py-3">{new Date(j.created_at).toLocaleString('ru-RU')}</td>
                <td className="px-4 py-3 text-right">
                  {j.status === 'error' && (
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => retry(j.id)} disabled={retrying === j.id}>
                      <Icon name="RotateCw" size={14} className={retrying === j.id ? 'animate-spin' : ''} />
                      Повторить
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default AutomationsSection;
