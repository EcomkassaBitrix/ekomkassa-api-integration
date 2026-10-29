import DashboardStats from '@/components/dashboard/DashboardStats';
import DashboardActivity from '@/components/dashboard/DashboardActivity';
import { useDashboardStats } from '@/hooks/useDashboardStats';
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
  const { data } = useDashboardStats(activeSection === 'dashboard');
  const t = data?.totals;
  const activeProviders = providers.filter(p => p.status === 'working' || p.status === 'configured').length;
  const totalProviders = providers.length;
  const total = t?.total || 0;
  const decided = (t?.delivered || 0) + (t?.failed || 0);
  const deliveryRate = decided > 0 ? (((t?.delivered || 0) / decided) * 100).toFixed(1) : '0.0';
  const dash = (v: string) => (data ? v : '…');

  const stats = [
    {
      label: 'Всего запросов',
      value: dash(total.toLocaleString('ru-RU')),
      change: data ? `сегодня ${(t?.today || 0).toLocaleString('ru-RU')}` : 'Загружаю',
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
      value: dash(`${deliveryRate}%`),
      change: data ? `${(t?.delivered || 0).toLocaleString('ru-RU')} доставлено, ${(t?.failed || 0).toLocaleString('ru-RU')} с ошибкой` : 'Загружаю',
      icon: 'CheckCircle',
      color: 'text-green-400'
    },
    {
      label: 'Средняя скорость',
      value: data ? (data.avg_ms ? `${data.avg_ms} мс` : 'Нет данных') : '…',
      change: data ? (data.speed_samples ? `за 24 часа, ${data.speed_samples.toLocaleString('ru-RU')} попыток` : 'За 24 часа попыток нет') : 'Загружаю',
      icon: 'Zap',
      color: 'text-yellow-400'
    },
  ];

  if (activeSection === 'dashboard') {
    return (
      <div className="space-y-6">
        <DashboardStats stats={stats} />
        <DashboardActivity providers={providers} providerStats={data?.providers || []} daily={data?.daily || []} logs={logs} />
      </div>
    );
  }

  if (activeSection === 'docs') {
    return <ApiDocsSection />;
  }

  return null;
};

export default DashboardSection;
