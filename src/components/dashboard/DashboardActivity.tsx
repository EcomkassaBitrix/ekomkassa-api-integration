import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import type { DailyStat, ProviderStat } from '@/hooks/useDashboardStats';

interface ProviderInfo {
  name: string;
  icon: string;
  status: string;
  code: string;
}

interface LogMessage {
  message_id: string;
  recipient: string;
  provider: string;
  status: string;
  created_at: string;
}

interface Props {
  providers: ProviderInfo[];
  providerStats: ProviderStat[];
  daily: DailyStat[];
  logs: LogMessage[];
}

const rate = (d: number, t: number) => (t > 0 ? Math.round((d / t) * 1000) / 10 : 0);

const DashboardActivity = ({ providers, providerStats, daily, logs }: Props) => {
  const maxDay = Math.max(1, ...daily.map((d) => d.total));
  const rows = providers
    .map((p) => ({ info: p, stat: providerStats.find((s) => s.provider === p.code) }))
    .sort((a, b) => (b.stat?.total || 0) - (a.stat?.total || 0));

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon name="BarChart3" size={20} className="text-primary" />
          Отправки за 7 дней
        </h3>
        <div className="flex items-end gap-3 h-40">
          {daily.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <span className="text-xs text-muted-foreground">{d.total}</span>
              <div className="w-full flex flex-col justify-end rounded-t overflow-hidden bg-muted/30" style={{ height: `${(d.total / maxDay) * 100}%`, minHeight: d.total ? 4 : 2 }}>
                <div className="bg-destructive" style={{ height: `${d.total ? (d.failed / d.total) * 100 : 0}%` }} />
                <div className="bg-primary flex-1" />
              </div>
              <span className="text-xs text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary" />Доставлено и в работе</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-destructive" />Ошибки</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 bg-card/50 backdrop-blur-sm border-border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Icon name="Activity" size={20} className="text-primary" />
            Провайдеры
          </h3>
          <div className="space-y-3">
            {rows.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Нет провайдеров</p>}
            {rows.map(({ info, stat }) => {
              const isActive = info.status === 'working' || info.status === 'configured';
              const total = stat?.total || 0;
              return (
                <div key={info.code} className="flex items-center justify-between gap-4 p-4 bg-background/50 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <Icon name={info.icon} size={20} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{info.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {total.toLocaleString('ru-RU')} всего · {stat?.today || 0} сегодня
                        {total > 0 && ` · доставлено ${rate(stat?.delivered || 0, total)}%`}
                        {(stat?.failed || 0) > 0 && ` · ошибок ${stat?.failed}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Активен' : 'Не настроен'}</Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Icon name="FileText" size={20} className="text-secondary" />
            Последние логи
          </h3>
          <div className="space-y-3">
            {logs.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Логов пока нет</p>}
            {logs.slice(0, 5).map((log, index) => (
              <div key={log.message_id || `log-${index}`} className="p-3 bg-background/50 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Badge variant={log.status === 'delivered' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                    {log.status}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{log.provider}</p>
                <p className="text-xs text-muted-foreground truncate">{log.recipient}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardActivity;
