import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface StatItem {
  label: string;
  value: string;
  change: string;
  icon: string;
  color: string;
}

interface DashboardStatsProps {
  stats: StatItem[];
}

const DashboardStats = ({ stats }: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="p-6 bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className={`text-xs mt-2 ${stat.color}`}>{stat.change}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center ${stat.color}`}>
              <Icon name={stat.icon} size={24} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
