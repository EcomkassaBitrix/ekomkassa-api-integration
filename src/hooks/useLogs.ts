import { useState } from 'react';

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

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch(`${LOGS_URL}?limit=${PAGE_SIZE}`, {
        headers: {
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        }
      });
      const data = await response.json();
      if (data.success) {
        setLogs(data.messages || []);
        setHasMore(!!data.has_more);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadMoreLogs = async () => {
    if (isLoadingMore || isLoadingLogs || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const response = await fetch(`${LOGS_URL}?limit=${PAGE_SIZE}&offset=${logs.length}`, {
        headers: { 'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8' }
      });
      const data = await response.json();
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
    retryMessage,
    openLogDetails,
    setLogDetailsDialogOpen,
  };
};