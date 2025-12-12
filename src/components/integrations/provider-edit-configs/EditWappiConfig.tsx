import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useState } from 'react';

interface EditWappiConfigProps {
  editProviderCode: string;
  setEditProviderCode: (code: string) => void;
  wappiToken: string;
  setWappiToken: (token: string) => void;
  wappiProfileId: string;
  setWappiProfileId: (id: string) => void;
}

const EditWappiConfig = ({
  editProviderCode,
  setEditProviderCode,
  wappiToken,
  setWappiToken,
  wappiProfileId,
  setWappiProfileId,
}: EditWappiConfigProps) => {
  const [copied, setCopied] = useState(false);

  const copyProviderCode = () => {
    navigator.clipboard.writeText(editProviderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="edit-provider-code">Код провайдера (provider_code)</Label>
        <div className="flex gap-2">
          <Input
            id="edit-provider-code"
            value={editProviderCode}
            onChange={(e) => setEditProviderCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            className="font-mono text-sm flex-1"
            disabled
          />
          <Button
            variant="outline"
            size="sm"
            onClick={copyProviderCode}
            className="px-3"
          >
            <Icon name={copied ? "Check" : "Copy"} size={16} className={copied ? "text-green-500" : ""} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Используйте этот код в поле "provider" при отправке сообщений через API
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wappi-token">API Token</Label>
        <Input
          id="wappi-token"
          placeholder="Введите токен Wappi"
          value={wappiToken}
          onChange={(e) => setWappiToken(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Токен авторизации из личного кабинета wappi.pro
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wappi-profile">Profile ID</Label>
        <Input
          id="wappi-profile"
          placeholder="Введите ID профиля"
          value={wappiProfileId}
          onChange={(e) => setWappiProfileId(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Идентификатор профиля для работы с API
        </p>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <Icon name="Info" size={20} className="text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Как получить данные:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Зайдите на wappi.pro</li>
              <li>Откройте раздел "Настройки API"</li>
              <li>Скопируйте Token и Profile ID</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditWappiConfig;
