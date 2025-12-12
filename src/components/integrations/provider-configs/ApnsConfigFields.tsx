import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface ApnsConfigFieldsProps {
  apnsTeamId: string;
  setApnsTeamId: (id: string) => void;
  apnsKeyId: string;
  setApnsKeyId: (id: string) => void;
  apnsPrivateKey: string;
  setApnsPrivateKey: (key: string) => void;
  apnsBundleId: string;
  setApnsBundleId: (id: string) => void;
  uploadInputId?: string;
}

const ApnsConfigFields = ({
  apnsTeamId,
  setApnsTeamId,
  apnsKeyId,
  setApnsKeyId,
  apnsPrivateKey,
  setApnsPrivateKey,
  apnsBundleId,
  setApnsBundleId,
  uploadInputId = 'apns-upload',
}: ApnsConfigFieldsProps) => {
  const handleApnsKeyUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setApnsPrivateKey(content);
      } catch (error) {
        console.error('Ошибка чтения файла:', error);
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
        <Label htmlFor={uploadInputId}>Загрузить .p8 ключ (опционально)</Label>
        <div className="flex gap-2">
          <Input
            id={uploadInputId}
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
              const input = document.getElementById(uploadInputId) as HTMLInputElement;
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
        <Label htmlFor="new-apns-team-id">Team ID</Label>
        <Input
          id="new-apns-team-id"
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
        <Label htmlFor="new-apns-key-id">Key ID</Label>
        <Input
          id="new-apns-key-id"
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
        <Label htmlFor="new-apns-bundle-id">Bundle ID</Label>
        <Input
          id="new-apns-bundle-id"
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
        <Label htmlFor="new-apns-private-key">Private Key (.p8)</Label>
        <textarea
          id="new-apns-private-key"
          placeholder="-----BEGIN PRIVATE KEY-----&#10;MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...&#10;-----END PRIVATE KEY-----"
          value={apnsPrivateKey}
          onChange={(e) => setApnsPrivateKey(e.target.value)}
          className="w-full min-h-[120px] px-3 py-2 text-sm font-mono bg-background border border-input rounded-md resize-y"
        />
        <p className="text-xs text-muted-foreground">
          Приватный ключ из .p8 файла (включая BEGIN/END теги)
        </p>
      </div>
    </>
  );
};

export default ApnsConfigFields;
