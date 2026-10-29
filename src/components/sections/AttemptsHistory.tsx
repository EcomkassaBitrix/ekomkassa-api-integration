import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { paytiFetch } from './PaytiSettingsDialog';
import AttemptDetailDialog from './AttemptDetailDialog';

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
  ofd_error: 'Ошибка ОФД',
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

const PAGE_SIZE = 50;

const AttemptsHistory = ({ action, refreshKey = 0 }: Props) => {
  const [items, setItems] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');
  const [period, setPeriod] = useState('all');
  const [dealFilter, setDealFilter] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);
  const isPayti = action === 'history';
  const sentinelRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const hasFilters = search !== '' || status !== 'all' || source !== 'all' || period !== 'all' || dealFilter !== '';

  const buildQuery = (offset: number) => {
    const q = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (search.trim()) q.set('q', search.trim());
    if (dealFilter) q.set('deal_id', dealFilter);
    if (status !== 'all') q.set('status', status);
    if (source !== 'all') q.set('source', source);
    const days = { day: 1, week: 7, month: 30 }[period];
    if (days) q.set('days', String(days));
    return q.toString();
  };

  const load = async () => {
    const id = ++reqId.current;
    setLoading(true);
    const d = await paytiFetch(action, { query: buildQuery(0) });
    if (id !== reqId.current) return;
    setItems(d.history || []);
    setHasMore(!!d.has_more);
    setTotal(typeof d.total === 'number' ? d.total : null);
    if (Array.isArray(d.statuses)) setStatuses(d.statuses);
    if (Array.isArray(d.sources)) setSources(d.sources);
    setLoading(false);
  };

  const loadMore = async () => {
    if (loading || loadingMore || !hasMore) return;
    const id = reqId.current;
    setLoadingMore(true);
    const d = await paytiFetch(action, { query: buildQuery(itemsRef.current.length) });
    if (id === reqId.current) {
      const incoming: Attempt[] = d.history || [];
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...incoming.filter((x) => !seen.has(x.id))];
      });
      setHasMore(!!d.has_more);
    }
    setLoadingMore(false);
  };

  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [action, refreshKey, search, status, source, period, dealFilter]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting) loadMoreRef.current();
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, items.length]);

  const reset = () => {
    setSearch('');
    setStatus('all');
    setSource('all');
    setPeriod('all');
    setDealFilter('');
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="font-medium">История попыток</p>
        <Button size="sm" variant="outline" className="gap-2" onClick={load} disabled={loading}>
          <Icon name="RefreshCw" size={14} className={loading ? 'animate-spin' : ''} />
          Обновить
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
        <div className="relative flex-1 min-w-[220px]">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isPayti ? 'Поиск по сделке, логину, ошибке' : 'Поиск по сделке, email, ИНН, ошибке'}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[190px]"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {statuses.map((x) => <SelectItem key={x} value={x}>{STATUS[x] || x}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Источник" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все источники</SelectItem>
            {sources.map((x) => <SelectItem key={x} value={x}>{SOURCE[x] || x}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Период" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">За всё время</SelectItem>
            <SelectItem value="day">За 24 часа</SelectItem>
            <SelectItem value="week">За 7 дней</SelectItem>
            <SelectItem value="month">За 30 дней</SelectItem>
          </SelectContent>
        </Select>
        {dealFilter && (
          <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setDealFilter('')}>
            Сделка {dealFilter}
            <Icon name="X" size={12} />
          </Badge>
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <Icon name="X" size={14} className="mr-1" />
            Сбросить
          </Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">{total !== null ? `Найдено: ${total}` : `Показано: ${items.length}`}</span>
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
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={isPayti ? 8 : 6} className="text-center py-10 text-muted-foreground">
                {loading ? 'Загружаю...' : hasFilters ? 'Ничего не найдено' : 'Попыток пока не было'}
              </td>
            </tr>
          )}
          {items.map((a) => (
            <tr key={a.id} className="border-t border-border align-top cursor-pointer hover:bg-muted/30" onClick={() => setDetailId(a.id)}>
              <td className="px-4 py-2 whitespace-nowrap">{new Date(a.created_at).toLocaleString('ru-RU')}</td>
              <td className="px-4 py-2 font-mono">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  title="Показать все попытки по сделке"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDealFilter(a.deal_id);
                  }}
                >
                  {a.deal_id}
                </button>
              </td>
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
              <td className="px-4 py-2 text-muted-foreground"><Icon name="FileSearch" size={16} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-4">
          {loadingMore ? (
            <Icon name="Loader2" size={20} className="animate-spin text-primary" />
          ) : (
            <Button variant="ghost" size="sm" onClick={loadMore}>Показать ещё</Button>
          )}
        </div>
      )}
      <AttemptDetailDialog kind={isPayti ? 'payti' : 'ofd'} id={detailId} onClose={() => setDetailId(null)} />
    </Card>
  );
};

export default AttemptsHistory;
