import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface TelegramOtpConfigFieldsProps {
  tgApiId: string;
  setTgApiId: (val: string) => void;
  tgApiHash: string;
  setTgApiHash: (val: string) => void;
}

const TelegramOtpConfigFields = ({
  tgApiId,
  setTgApiId,
  tgApiHash,
  setTgApiHash,
}: TelegramOtpConfigFieldsProps) => {
  return (
    <>
      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <Icon name="Info" size={20} className="text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Как получить API ID и Hash:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Перейдите на my.telegram.org</li>
              <li>Войдите в аккаунт Telegram</li>
              <li>Откройте "API development tools"</li>
              <li>Создайте приложение и скопируйте App api_id и App api_hash</li>
            </ol>
            <a
              href="https://my.telegram.org/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1 mt-2"
            >
              Открыть my.telegram.org
              <Icon name="ExternalLink" size={12} />
            </a>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tg-api-id">API ID</Label>
        <Input
          id="tg-api-id"
          placeholder="12345678"
          value={tgApiId}
          onChange={(e) => setTgApiId(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Числовой идентификатор приложения из my.telegram.org
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tg-api-hash">API Hash</Label>
        <Input
          id="tg-api-hash"
          type="password"
          placeholder="0123456789abcdef0123456789abcdef"
          value={tgApiHash}
          onChange={(e) => setTgApiHash(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Хеш приложения из my.telegram.org
        </p>
      </div>
    </>
  );
};

export default TelegramOtpConfigFields;
