import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface PostboxConfigFieldsProps {
  postboxAccessKey: string;
  setPostboxAccessKey: (key: string) => void;
  postboxSecretKey: string;
  setPostboxSecretKey: (key: string) => void;
  postboxFromEmail: string;
  setPostboxFromEmail: (email: string) => void;
}

const PostboxConfigFields = ({
  postboxAccessKey,
  setPostboxAccessKey,
  postboxSecretKey,
  setPostboxSecretKey,
  postboxFromEmail,
  setPostboxFromEmail,
}: PostboxConfigFieldsProps) => {
  return (
    <>
      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <Icon name="Info" size={20} className="text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Настройки Яндекс Postbox:</p>
            <p className="text-muted-foreground mb-2">
              Для отправки email через Postbox необходимы Access Keys из Yandex Cloud
            </p>
            <a 
              href="https://console.cloud.yandex.ru/folders" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Открыть Yandex Cloud Console
              <Icon name="ExternalLink" size={12} />
            </a>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-postbox-access-key">Access Key ID</Label>
        <Input
          id="new-postbox-access-key"
          placeholder="Введите Access Key ID"
          value={postboxAccessKey}
          onChange={(e) => setPostboxAccessKey(e.target.value)}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-postbox-secret-key">Secret Access Key</Label>
        <Input
          id="new-postbox-secret-key"
          type="password"
          placeholder="Введите Secret Access Key"
          value={postboxSecretKey}
          onChange={(e) => setPostboxSecretKey(e.target.value)}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-postbox-from-email">Адрес отправителя (From)</Label>
        <Input
          id="new-postbox-from-email"
          type="email"
          placeholder="noreply@example.com"
          value={postboxFromEmail}
          onChange={(e) => setPostboxFromEmail(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Адрес должен быть верифицирован в Postbox
        </p>
      </div>
    </>
  );
};

export default PostboxConfigFields;
