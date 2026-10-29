import { useEffect, useRef, useState } from 'react';

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
}

const PAGE_SIZE = 50;

export interface LogFilters {
  search: string;
  status: string;
  provider: string;
  period: string;
}

export const EMPTY_FILTERS: LogFilters = { search: '', status: 'all', provider: 'all', period: 'all' };
const PERIOD_DAYS: Record<string, number> = { day: 1, week: 7, month: 30 };

const filtersQuery = (f: LogFilters) => {
  const q = new URLSearchParams();
  if (f.search.trim()) q.set('q', f.search.trim());
  if (f.status !== 'all') q.set('status', f.status);
  if (f.provider !== 'all') q.set('provider', f.provider);
  if (PERIOD_DAYS[f.period]) q.set('days', String(PERIOD_DAYS[f.period]));
  return q.toString();
};
const LOGS_URL = 'https://functions.poehali.dev/3f1bb824-7d73-4f4b-aa7a-dcbb53e38309';

export const useLogs = () => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [retryingMessage, setRetryingMessage] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogMessage | null>(null);
  const [logDetailsDialogOpen, setLogDetailsDialogOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [providerList, setProviderList] = useState<string[]>([]);
  const [filters, setFilters] = useState<LogFilters>(EMPTY_FILTERS);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const requestId = useRef(0);
  const firstRun = useRef(true);

  const loadLogs = async () => {
    const myId = ++requestId.current;
    setIsLoadingLogs(true);
    try {
      const response = await fetch(`${LOGS_URL}?limit=${PAGE_SIZE}&${filtersQuery(filtersRef.current)}`, {
        headers: {
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        }
      });
      const data = await response.json();
      if (myId !== requestId.current) return;
      if (data.success) {
        setLogs(data.messages || []);
        setHasMore(!!data.has_more);
        setTotal(typeof data.total === 'number' ? data.total : null);
        if (Array.isArray(data.statuses)) setStatuses(data.statuses);
        if (Array.isArray(data.providers)) setProviderList(data.providers);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      if (myId === requestId.current) setIsLoadingLogs(false);
    }
  };

  const loadMoreLogs = async () => {
    if (isLoadingMore || isLoadingLogs || !hasMore) return;
    const myId = requestId.current;
    setIsLoadingMore(true);
    try {
      const response = await fetch(`${LOGS_URL}?limit=${PAGE_SIZE}&offset=${logs.length}&${filtersQuery(filtersRef.current)}`, {
        headers: { 'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8' }
      });
      const data = await response.json();
      if (myId !== requestId.current) return;
      if (data.success) {
        const incoming: LogMessage[] = data.messages || [];
        setLogs((prev) => {
          const seen = new Set(prev.map((l) => l.message_id));
          return [...prev, ...incoming.filter((l) => !seen.has(l.message_id))];
        });
        setHasMore(!!data.has_more);
      }
    } catch (error) {
      console.error('Failed to load more logs:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      loadLogs();
    }, 350);
    return () => clearTimeout(t);
  }, [filters]);

  const retryMessage = async (messageId: string) => {
    setRetryingMessage(messageId);
    try {
      const detailsResponse = await fetch(`https://functions.poehali.dev/3f1bb824-7d73-4f4b-aa7a-dcbb53e38309?message_id=${messageId}`, {
        headers: { 'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8' }
      });
      const detailsData = await detailsResponse.json();
      const original = detailsData.message;
      if (!detailsData.success || !original) {
        return;
      }
      await fetch('https://functions.poehali.dev/ace36e55-b169-41f2-9d2b-546f92221bb7', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        },
        body: JSON.stringify({
          provider: original.provider,
          recipient: original.recipient,
          message: original.message_text
        })
      });
      await loadLogs();
    } catch (error) {
      console.error('Failed to retry message:', error);
    } finally {
      setRetryingMessage(null);
    }
  };

  const openLogDetails = async (log: LogMessage) => {
    setSelectedLog(log);
    setLogDetailsDialogOpen(true);
    setLoadingDetails(true);
    
    try {
      const response = await fetch(`https://functions.poehali.dev/3f1bb824-7d73-4f4b-aa7a-dcbb53e38309?message_id=${log.message_id}`, {
        headers: {
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        }
      });
      const data = await response.json();
      if (data.success && data.message) {
        setSelectedLog({ ...log, details: data.message });
      }
    } catch (error) {
      console.error('Failed to load log details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  return {
    logs,
    isLoadingLogs,
    retryingMessage,
    selectedLog,
    logDetailsDialogOpen,
    loadingDetails,
    loadLogs,
    loadMoreLogs,
    isLoadingMore,
    hasMore,
    total,
    statuses,
    providerList,
    filters,
    setFilters,
    retryMessage,
    openLogDetails,
    setLogDetailsDialogOpen,
  };
};