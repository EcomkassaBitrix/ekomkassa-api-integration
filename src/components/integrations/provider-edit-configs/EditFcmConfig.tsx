import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useState } from 'react';

interface EditFcmConfigProps {
  editProviderCode: string;
  setEditProviderCode: (code: string) => void;
  fcmProjectId: string;
  setFcmProjectId: (id: string) => void;
  fcmPrivateKey: string;
  setFcmPrivateKey: (key: string) => void;
  fcmClientEmail: string;
  setFcmClientEmail: (email: string) => void;
  handleFcmConfigUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const EditFcmConfig = ({
  editProviderCode,
  setEditProviderCode,
  fcmProjectId,
  setFcmProjectId,
  fcmPrivateKey,
  setFcmPrivateKey,
  fcmClientEmail,
  setFcmClientEmail,
  handleFcmConfigUpload,
}: EditFcmConfigProps) => {
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
            <p className="font-medium mb-1">Настройки Firebase Cloud Messaging (FCM):</p>
            <p className="text-muted-foreground mb-2">
              Загрузите JSON-файл с конфигурацией или заполните поля вручную
            </p>
            <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Открыть Firebase Console
              <Icon name="ExternalLink" size={12} />
            </a>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fcm-upload-edit">Загрузить конфиг из файла (опционально)</Label>
        <div className="flex gap-2">
          <Input
            id="fcm-upload-edit"
            type="file"
            accept=".json"
            onChange={handleFcmConfigUpload}
            className="cursor-pointer"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const input = document.getElementById('fcm-upload-edit') as HTMLInputElement;
              if (input) input.value = '';
              setFcmProjectId('');
              setFcmPrivateKey('');
              setFcmClientEmail('');
            }}
          >
            <Icon name="X" size={16} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Загрузите JSON-файл из Firebase Console для автозаполнения
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fcm-project-id">Project ID</Label>
        <Input
          id="fcm-project-id"
          placeholder="my-firebase-project"
          value={fcmProjectId}
          onChange={(e) => setFcmProjectId(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Идентификатор проекта Firebase
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fcm-client-email">Client Email</Label>
        <Input
          id="fcm-client-email"
          type="email"
          placeholder="firebase-adminsdk-xxxxx@my-project.iam.gserviceaccount.com"
          value={fcmClientEmail}
          onChange={(e) => setFcmClientEmail(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Email сервисного аккаунта из JSON файла
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fcm-private-key">Private Key</Label>
        <textarea
          id="fcm-private-key"
          placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvQIBADANBg...&#10;-----END PRIVATE KEY-----"
          value={fcmPrivateKey}
          onChange={(e) => setFcmPrivateKey(e.target.value)}
          className="w-full min-h-[120px] px-3 py-2 text-sm font-mono bg-background border border-input rounded-md resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Приватный ключ из JSON файла (включая BEGIN/END теги)
        </p>
      </div>
    </div>
  );
};

export default EditFcmConfig;
