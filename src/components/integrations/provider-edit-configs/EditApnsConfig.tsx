import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useState } from 'react';

interface EditApnsConfigProps {
  editProviderCode: string;
  setEditProviderCode: (code: string) => void;
  apnsTeamId: string;
  setApnsTeamId: (id: string) => void;
  apnsKeyId: string;
  setApnsKeyId: (id: string) => void;
  apnsPrivateKey: string;
  setApnsPrivateKey: (key: string) => void;
  apnsBundleId: string;
  setApnsBundleId: (id: string) => void;
  handleApnsKeyUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const EditApnsConfig = ({
  editProviderCode,
  setEditProviderCode,
  apnsTeamId,
  setApnsTeamId,
  apnsKeyId,
  setApnsKeyId,
  apnsPrivateKey,
  setApnsPrivateKey,
  apnsBundleId,
  setApnsBundleId,
  handleApnsKeyUpload,
}: EditApnsConfigProps) => {
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

      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <Icon name="Info" size={20} className="text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Настройки Apple Push Notification service (APNs):</p>
            <p className="text-muted-foreground mb-2">
              Загрузите .p8 ключ или заполните поля вручную для отправки push-уведомлений на iOS
            </p>
            <a 
              href="https://developer.apple.com/account/resources/authkeys/list" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Получить APNs ключ в Apple Developer
              <Icon name="ExternalLink" size={12} />
            </a>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="apns-upload-edit">Загрузить .p8 ключ (опционально)</Label>
        <div className="flex gap-2">
          <Input
            id="apns-upload-edit"
            type="file"
            accept=".p8"
            onChange={handleApnsKeyUpload}
            className="cursor-pointer"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const input = document.getElementById('apns-upload-edit') as HTMLInputElement;
              if (input) input.value = '';
              setApnsPrivateKey('');
            }}
          >
            <Icon name="X" size={16} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Загрузите .p8 файл из Apple Developer для автозаполнения приватного ключа
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="apns-team-id">Team ID</Label>
        <Input
          id="apns-team-id"
          placeholder="ABC1234DEF"
          value={apnsTeamId}
          onChange={(e) => setApnsTeamId(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          10-символьный Team ID из Apple Developer Account
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="apns-key-id">Key ID</Label>
        <Input
          id="apns-key-id"
          placeholder="AB12CD34EF"
          value={apnsKeyId}
          onChange={(e) => setApnsKeyId(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          10-символьный Key ID из APNs ключа
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="apns-bundle-id">Bundle ID</Label>
        <Input
          id="apns-bundle-id"
          placeholder="com.example.app"
          value={apnsBundleId}
          onChange={(e) => setApnsBundleId(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Bundle ID вашего iOS приложения (например: com.mycompany.myapp)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="apns-private-key">Private Key (.p8)</Label>
        <textarea
          id="apns-private-key"
          placeholder="-----BEGIN PRIVATE KEY-----&#10;MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...&#10;-----END PRIVATE KEY-----"
          value={apnsPrivateKey}
          onChange={(e) => setApnsPrivateKey(e.target.value)}
          className="w-full min-h-[120px] px-3 py-2 text-sm font-mono bg-background border border-input rounded-md resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Приватный ключ из .p8 файла (включая BEGIN/END теги)
        </p>
      </div>
    </div>
  );
};

export default EditApnsConfig;
