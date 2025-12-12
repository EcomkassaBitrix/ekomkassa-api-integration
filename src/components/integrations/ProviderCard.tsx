import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useState } from 'react';

interface ProviderCardProps {
  provider: any;
  openProviderConfig: (provider: any) => void;
  setProviderToDelete: (provider: any) => void;
  setDeleteDialogOpen: (open: boolean) => void;
}

const ProviderCard = ({
  provider,
  openProviderConfig,
  setProviderToDelete,
  setDeleteDialogOpen
}: ProviderCardProps) => {
  const [copied, setCopied] = useState(false);

  const copyProviderCode = () => {
    navigator.clipboard.writeText(provider.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border hover:shadow-lg hover:shadow-primary/20 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
          <Icon name={provider.icon} size={28} className="text-primary" />
        </div>
        <Badge 
          variant={
            provider.status === 'working' ? 'default' : 
            provider.status === 'configured' ? 'secondary' : 
            provider.status === 'error' ? 'destructive' : 
            'outline'
          }
          className={
            provider.status === 'configured' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''
          }
        >
          {provider.status === 'working' && (
            <>
              <Icon name="CheckCircle" size={12} className="mr-1" />
              Работает
            </>
          )}
          {provider.status === 'configured' && (
            <>
              <Icon name="Settings" size={12} className="mr-1" />
              Настроен
            </>
          )}
          {provider.status === 'error' && (
            <>
              <Icon name="AlertCircle" size={12} className="mr-1" />
              Ошибка
            </>
          )}
          {provider.status === 'not_configured' && (
            <>
              <Icon name="AlertTriangle" size={12} className="mr-1" />
              Не настроен
            </>
          )}
        </Badge>
      </div>
      <h3 className="text-xl font-bold mb-2">{provider.name}</h3>
      <div className="mb-3 px-3 py-2 bg-muted/30 rounded border border-border">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Код провайдера:</p>
            <code className="text-sm font-mono font-semibold text-foreground">{provider.code}</code>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 ml-2 flex-shrink-0"
            onClick={copyProviderCode}
          >
            <Icon name={copied ? "Check" : "Copy"} size={14} className={copied ? "text-green-500" : ""} />
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {provider.requests.toLocaleString()} запросов за сегодня
      </p>
      {provider.usesWappi && (
        <div className="mb-3 px-3 py-2 bg-primary/10 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon name="Zap" size={14} className="text-primary" />
            <span className="text-xs font-medium text-primary">Работает через Wappi</span>
          </div>
        </div>
      )}
      {provider.usesPostbox && (
        <div className="mb-3 px-3 py-2 bg-blue-500/10 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon name="Mail" size={14} className="text-blue-500" />
            <span className="text-xs font-medium text-blue-500">Яндекс Postbox API</span>
          </div>
        </div>
      )}
      {provider.usesFcm && (
        <div className="mb-3 px-3 py-2 bg-orange-500/10 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon name="Bell" size={14} className="text-orange-500" />
            <span className="text-xs font-medium text-orange-500">Firebase Cloud Messaging</span>
          </div>
        </div>
      )}
      {provider.usesApns && (
        <div className="mb-3 px-3 py-2 bg-purple-500/10 rounded-lg">
          <div className="flex items-center gap-2">
            <Icon name="Apple" size={14} className="text-purple-500" />
            <span className="text-xs font-medium text-purple-500">Apple Push Notification</span>
          </div>
        </div>
      )}
      {provider.lastAttemptAt && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground">
            Последний запрос: {new Date(provider.lastAttemptAt).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      )}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => openProviderConfig(provider)}
        >
          <Icon name="Settings" size={16} className="mr-2" />
          Настроить
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Icon name="MoreVertical" size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openProviderConfig(provider)}>
              <Icon name="Settings" size={14} className="mr-2" />
              Настроить
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                // TODO: Implement view logs
              }}
            >
              <Icon name="FileText" size={14} className="mr-2" />
              Логи
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => {
                setProviderToDelete(provider);
                setDeleteDialogOpen(true);
              }}
            >
              <Icon name="Trash2" size={14} className="mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};

export default ProviderCard;