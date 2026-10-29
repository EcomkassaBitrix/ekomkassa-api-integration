import { useCallback, useEffect, useState } from 'react';

const STATS_URL = 'https://functions.poehali.dev/3f1bb824-7d73-4f4b-aa7a-dcbb53e38309?stats=1';

export interface StatsTotals {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  today: number;
  today_delivered: number;
  today_failed: number;
}

export interface ProviderStat {
  provider: string;
  total: number;
  delivered: number;
  failed: number;
  today: number;
  last_at: string | null;
}

export interface DailyStat {
  label: string;
  total: number;
  delivered: number;
  failed: number;
}

export interface DashboardStatsData {
  totals: StatsTotals;
  providers: ProviderStat[];
  avg_ms: number | null;
  speed_samples: number;
  daily: DailyStat[];
}

export const useDashboardStats = (active: boolean) => {
  const [data, setData] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(STATS_URL, { headers: { 'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8' } });
      const d = await res.json();
      if (d.success) {
        setData(d);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [active, load]);

  return { data, loading, error, reload: load };
};
