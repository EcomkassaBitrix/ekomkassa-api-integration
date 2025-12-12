import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface FcmConfigFieldsProps {
  fcmProjectId: string;
  setFcmProjectId: (id: string) => void;
  fcmClientEmail: string;
  setFcmClientEmail: (email: string) => void;
  fcmPrivateKey: string;
  setFcmPrivateKey: (key: string) => void;
  uploadInputId?: string;
}

const FcmConfigFields = ({
  fcmProjectId,
  setFcmProjectId,
  fcmClientEmail,
  setFcmClientEmail,
  fcmPrivateKey,
  setFcmPrivateKey,
  uploadInputId = 'fcm-upload',
}: FcmConfigFieldsProps) => {
  const handleFcmConfigUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.project_id) setFcmProjectId(json.project_id);
        if (json.private_key) setFcmPrivateKey(json.private_key);
        if (json.client_email) setFcmClientEmail(json.client_email);
      } catch (error) {
        console.error('Ошибка парсинга JSON:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
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
        <Label htmlFor={uploadInputId}>Загрузить конфиг из файла (опционально)</Label>
        <div className="flex gap-2">
          <Input
            id={uploadInputId}
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
              const input = document.getElementById(uploadInputId) as HTMLInputElement;
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
        <Label htmlFor="new-fcm-project-id">Project ID</Label>
        <Input
          id="new-fcm-project-id"
          placeholder="my-firebase-project"
          value={fcmProjectId}
          onChange={(e) => setFcmProjectId(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Идентификатор проекта Firebase (например: my-app-12345)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-fcm-client-email">Client Email</Label>
        <Input
          id="new-fcm-client-email"
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
        <Label htmlFor="new-fcm-private-key">Private Key</Label>
        <textarea
          id="new-fcm-private-key"
          placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvQIBADANBg...&#10;-----END PRIVATE KEY-----"
          value={fcmPrivateKey}
          onChange={(e) => setFcmPrivateKey(e.target.value)}
          className="w-full min-h-[120px] px-3 py-2 text-sm font-mono bg-background border border-input rounded-md resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Приватный ключ из JSON файла (включая BEGIN/END теги)
        </p>
      </div>
    </>
  );
};

export default FcmConfigFields;
