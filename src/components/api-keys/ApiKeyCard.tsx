import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export interface ApiKey {
  key_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  [key: string]: unknown;
}

interface ApiKeyCardProps {
  apiKey: ApiKey;
  onRegenerate: (key: ApiKey) => void;
  onDelete: (key: ApiKey) => void;
}

const ApiKeyCard = ({ apiKey: key, onRegenerate, onDelete }: ApiKeyCardProps) => {
  return (
    <div key={key.key_id} className="p-4 bg-background/50 rounded-lg border border-border">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold">{key.key_name as string}</h4>
            <Badge variant="outline">{key.is_active ? 'Активен' : 'Неактивен'}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Создан: {new Date(key.created_at).toLocaleDateString('ru-RU')}
          </p>
          {key.last_used_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Последнее использование: {new Date(key.last_used_at as string).toLocaleString('ru-RU')}
            </p>
          )}
          {key.expiry_date && (
            <p className="text-xs text-yellow-500 mt-1">
              Истекает: {new Date(key.expiry_date as string).toLocaleDateString('ru-RU')}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Icon name="MoreVertical" size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              navigator.clipboard.writeText(key.api_key as string);
            }}>
              <Icon name="Copy" size={14} className="mr-2" />
              Копировать ключ
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRegenerate(key)}>
              <Icon name="RefreshCw" size={14} className="mr-2" />
              Перевыпустить
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(key)}
            >
              <Icon name="Trash2" size={14} className="mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2 bg-background p-3 rounded-lg border border-border">
        <code className="text-sm font-mono flex-1 select-all">{key.api_key as string}</code>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(key.api_key as string);
          }}
        >
          <Icon name="Copy" size={16} />
        </Button>
      </div>
    </div>
  );
};

export default ApiKeyCard;
