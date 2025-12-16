import { useState } from 'react';

export const useLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [retryingMessage, setRetryingMessage] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [logDetailsDialogOpen, setLogDetailsDialogOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch('https://functions.poehali.dev/3f1bb824-7d73-4f4b-aa7a-dcbb53e38309?limit=50', {
        headers: {
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        }
      });
      const data = await response.json();
      if (data.success) {
        setLogs(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const retryMessage = async (messageId: string) => {
    setRetryingMessage(messageId);
    try {
      const response = await fetch('https://functions.poehali.dev/179a2b88-4c3b-4ebd-84f9-612b0c2b6227', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        },
        body: JSON.stringify({ message_id: messageId })
      });
      const data = await response.json();
      if (data.success) {
        await loadLogs();
      }
    } catch (error) {
      console.error('Failed to retry message:', error);
    } finally {
      setRetryingMessage(null);
    }
  };

  const openLogDetails = async (log: any) => {
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
    retryMessage,
    openLogDetails,
    setLogDetailsDialogOpen,
  };
};