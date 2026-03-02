import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface Provider {
  id: number;
  name: string;
  icon: string;
  status: string;
  requests: number;
  code: string;
  usesWappi: boolean;
  usesPostbox: boolean;
  usesFcm: boolean;
  usesApns: boolean;
  lastAttemptAt: string | null;
}

interface LogMessage {
  message_id: string;
  recipient: string;
  provider: string;
  status: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  message?: string;
  last_error?: string;
  details?: LogMessage;
  [key: string]: unknown;
}

interface DashboardActivityProps {
  providers: Provider[];
  logs: LogMessage[];
}

const DashboardActivity = ({ providers, logs }: DashboardActivityProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 p-6 bg-card/50 backdrop-blur-sm border-border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon name="Activity" size={20} className="text-primary" />
          Активность провайдеров
        </h3>
        <div className="space-y-4">
          {providers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Нет провайдеров</p>
            </div>
          ) : (
            providers.map((provider) => {
              const providerLogs = logs.filter(l => l.provider === provider.code);
              const isActive = provider.status === 'working' || provider.status === 'configured';

              return (
                <div key={provider.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon name={provider.icon} size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{provider.name}</p>
                      <p className="text-sm text-muted-foreground">{providerLogs.length} запросов</p>
                    </div>
                  </div>
                  <Badge variant={isActive ? 'default' : 'secondary'}>
                    {isActive ? 'Активен' : 'Не настроен'}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon name="FileText" size={20} className="text-secondary" />
          Последние логи
        </h3>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">Логов пока нет</p>
            </div>
          ) : (
            logs.slice(0, 5).map((log, index) => (
              <div key={log.message_id || `log-${index}`} className="p-3 bg-background/50 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <Badge variant={log.status === 'delivered' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                    {log.status}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{log.provider}</p>
                <p className="text-xs text-muted-foreground truncate">{log.recipient}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default DashboardActivity;
