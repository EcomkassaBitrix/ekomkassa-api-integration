import DashboardStats from '@/components/dashboard/DashboardStats';
import DashboardActivity from '@/components/dashboard/DashboardActivity';
import ApiDocsSection from '@/components/dashboard/ApiDocsSection';

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

interface DashboardSectionProps {
  activeSection: string;
  providers: Provider[];
  logs: LogMessage[];
}

const DashboardSection = ({ activeSection, providers, logs }: DashboardSectionProps) => {
  const totalRequests = logs.length;
  const activeProviders = providers.filter(p => p.status === 'working' || p.status === 'configured').length;
  const totalProviders = providers.length;

  const deliveredCount = logs.filter(l => l.status === 'delivered').length;
  const deliveryRate = totalRequests > 0 ? ((deliveredCount / totalRequests) * 100).toFixed(1) : '0.0';

  const responseTimes = logs
    .filter(l => l.response_time && typeof l.response_time === 'number')
    .map(l => l.response_time as number);
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;

  const stats = [
    {
      label: 'Всего запросов',
      value: totalRequests.toLocaleString('ru-RU'),
      change: totalRequests > 0 ? `${totalRequests} сообщений` : 'Нет данных',
      icon: 'TrendingUp',
      color: 'text-primary'
    },
    {
      label: 'Активных провайдеров',
      value: `${activeProviders}/${totalProviders}`,
      change: totalProviders > 0 ? `${Math.round((activeProviders / totalProviders) * 100)}%` : '0%',
      icon: 'Activity',
      color: 'text-secondary'
    },
    {
      label: 'Успешных доставок',
      value: `${deliveryRate}%`,
      change: `${deliveredCount} из ${totalRequests}`,
      icon: 'CheckCircle',
      color: 'text-green-400'
    },
    {
      label: 'Средняя скорость',
      value: avgResponseTime > 0 ? `${avgResponseTime}ms` : 'N/A',
      change: responseTimes.length > 0 ? `${responseTimes.length} измерений` : 'Нет данных',
      icon: 'Zap',
      color: 'text-yellow-400'
    },
  ];

  if (activeSection === 'dashboard') {
    return (
      <div className="space-y-6">
        <DashboardStats stats={stats} />
        <DashboardActivity providers={providers} logs={logs} />
      </div>
    );
  }

  if (activeSection === 'docs') {
    return <ApiDocsSection />;
  }

  return null;
};

export default DashboardSection;
