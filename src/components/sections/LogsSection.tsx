import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';

interface DeliveryAttempt {
  id: number;
  status: string;
  response_code: number | null;
  response_body: string | null;
  error_message: string | null;
  attempted_at: string | null;
}

interface LogMessage {
  message_id: string;
  recipient: string;
  provider: string;
  status: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  message_text?: string;
  message?: string;
  last_error?: string;
  delivery_attempts?: DeliveryAttempt[];
  details?: LogMessage;
}

const LogDetailsDialog = ({
  open,
  onOpenChange,
  log,
  loading
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: LogMessage | null;
  loading: boolean;
}) => {
  const detail = log?.details || log;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Детали сообщения</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="Loader2" size={32} className="animate-spin text-primary" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">ID сообщения</p>
                <p className="font-mono">{detail.message_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Статус</p>
                <Badge variant={detail.status === 'delivered' ? 'default' : detail.status === 'failed' ? 'destructive' : 'secondary'}>
                  {detail.status}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Получатель</p>
                <p>{detail.recipient}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Провайдер</p>
                <p>{detail.provider}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Попытки</p>
                <p>{detail.attempts} / {detail.max_attempts}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Создано</p>
                <p>{new Date(detail.created_at).toLocaleString('ru-RU')}</p>
              </div>
            </div>

            {detail.message_text && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Текст сообщения</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg border border-border whitespace-pre-wrap">
                  {detail.message_text}
                </p>
              </div>
            )}

            {detail.last_error && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Ошибка</p>
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  {detail.last_error}
                </p>
              </div>
            )}

            {detail.delivery_attempts && detail.delivery_attempts.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">История попыток доставки</p>
                <div className="space-y-2">
                  {detail.delivery_attempts.map((att) => (
                    <div key={att.id} className="p-3 rounded-lg border border-border bg-background/50 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant={att.status === 'success' ? 'default' : 'destructive'}>
                          {att.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {att.attempted_at ? new Date(att.attempted_at).toLocaleString('ru-RU') : ''}
                        </span>
                      </div>
                      {att.response_code !== null && (
                        <p className="text-xs text-muted-foreground">Код ответа: {att.response_code}</p>
                      )}
                      {att.error_message && (
                        <p className="text-xs text-destructive mt-1">{att.error_message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Icon name="Inbox" size={48} className="mx-auto mb-3 opacity-50" />
            <p>Нет данных</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface LogsSectionProps {
  logs: LogMessage[];
  isLoadingLogs: boolean;
  retryingMessage: string | null;
  selectedLog: LogMessage | null;
  logDetailsDialogOpen: boolean;
  loadingDetails: boolean;
  loadLogs: () => void;
  retryMessage: (messageId: string) => void;
  openLogDetails: (log: LogMessage) => void;
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
    </>
  );
};

export default LogsSection;