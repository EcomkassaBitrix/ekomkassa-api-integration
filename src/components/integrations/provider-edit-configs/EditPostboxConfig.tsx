import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useState } from 'react';

interface EditPostboxConfigProps {
  editProviderCode: string;
  setEditProviderCode: (code: string) => void;
  postboxAccessKey: string;
  setPostboxAccessKey: (key: string) => void;
  postboxSecretKey: string;
  setPostboxSecretKey: (key: string) => void;
  postboxFromEmail: string;
  setPostboxFromEmail: (email: string) => void;
}

const EditPostboxConfig = ({
  editProviderCode,
  setEditProviderCode,
  postboxAccessKey,
  setPostboxAccessKey,
  postboxSecretKey,
  setPostboxSecretKey,
  postboxFromEmail,
  setPostboxFromEmail,
}: EditPostboxConfigProps) => {
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
        <Label htmlFor="postbox-access-key">Access Key ID</Label>
        <Input
          id="postbox-access-key"
          placeholder="Введите Access Key ID"
          value={postboxAccessKey}
          onChange={(e) => setPostboxAccessKey(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Ключ доступа из Yandex Cloud Console
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="postbox-secret-key">Secret Access Key</Label>
        <Input
          id="postbox-secret-key"
          type="password"
          placeholder="Введите Secret Access Key"
          value={postboxSecretKey}
          onChange={(e) => setPostboxSecretKey(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Секретный ключ доступа (скрыт в целях безопасности)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="postbox-from-email">Адрес отправителя (From)</Label>
        <Input
          id="postbox-from-email"
          type="email"
          placeholder="noreply@example.com"
          value={postboxFromEmail}
          onChange={(e) => setPostboxFromEmail(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Email адрес, который будет указан как отправитель
        </p>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <Icon name="Info" size={20} className="text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Настройка Яндекс Postbox:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Откройте Yandex Cloud Console</li>
              <li>Создайте сервисный аккаунт</li>
              <li>Получите Access Key и Secret Key</li>
              <li>Настройте верификацию домена отправителя</li>
            </ol>
            <a 
              href="https://console.cloud.yandex.ru/folders" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1 mt-2"
            >
              Открыть Yandex Cloud Console
              <Icon name="ExternalLink" size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPostboxConfig;
