import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import LogDetailsDialog from '@/components/logs/LogDetailsDialog';

interface LogsSectionProps {
  logs: any[];
  isLoadingLogs: boolean;
  retryingMessage: string | null;
  selectedLog: any;
  logDetailsDialogOpen: boolean;
  loadingDetails: boolean;
  loadLogs: () => void;
  retryMessage: (messageId: string) => void;
  openLogDetails: (log: any) => void;
  setLogDetailsDialogOpen: (open: boolean) => void;
}

const LogsSection = ({
  logs,
  isLoadingLogs,
  retryingMessage,
  selectedLog,
  logDetailsDialogOpen,
  loadingDetails,
  loadLogs,
  retryMessage,
  openLogDetails,
  setLogDetailsDialogOpen
}: LogsSectionProps) => {
  return (
    <>
      <LogDetailsDialog 
        open={logDetailsDialogOpen}
        onOpenChange={setLogDetailsDialogOpen}
        log={selectedLog}
        loading={loadingDetails}
      />
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">История запросов</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={isLoadingLogs}>
            <Icon name={isLoadingLogs ? "Loader2" : "RefreshCw"} size={16} className={isLoadingLogs ? "animate-spin mr-2" : "mr-2"} />
            Обновить
          </Button>
        </div>
      </div>
      {isLoadingLogs ? (
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Inbox" size={48} className="mx-auto mb-3 opacity-50" />
          <p>Логов пока нет</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="pb-3 font-medium">ID Сообщения</th>
                <th className="pb-3 font-medium">Получатель</th>
                <th className="pb-3 font-medium">Провайдер</th>
                <th className="pb-3 font-medium">Статус</th>
                <th className="pb-3 font-medium">Попытки</th>
                <th className="pb-3 font-medium">Создано</th>
                <th className="pb-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr 
                  key={log.message_id} 
                  className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => openLogDetails(log)}
                >
                  <td className="py-3 text-xs font-mono">{log.message_id}</td>
                  <td className="py-3 text-sm">{log.recipient}</td>
                  <td className="py-3 text-sm">{log.provider}</td>
                  <td className="py-3">
                    <Badge variant={log.status === 'delivered' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
                      {log.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-sm">{log.attempts} / {log.max_attempts}</td>
                  <td className="py-3 text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('ru-RU')}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLogDetails(log);
                        }}
                      >
                        <Icon name="Eye" size={14} className="mr-1" />
                        Детали
                      </Button>
                      {log.status === 'failed' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            retryMessage(log.message_id);
                          }}
                          disabled={retryingMessage === log.message_id}
                        >
                          {retryingMessage === log.message_id ? (
                            <Icon name="Loader2" size={14} className="animate-spin" />
                          ) : (
                            <>
                              <Icon name="RotateCw" size={14} className="mr-1" />
                              Переотправить
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default LogsSection;