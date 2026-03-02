import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useState } from 'react';

interface EditTelegramOtpConfigProps {
  editProviderCode: string;
  tgApiId: string;
  setTgApiId: (val: string) => void;
  tgApiHash: string;
  setTgApiHash: (val: string) => void;
}

const EditTelegramOtpConfig = ({
  editProviderCode,
  tgApiId,
  setTgApiId,
  tgApiHash,
  setTgApiHash,
}: EditTelegramOtpConfigProps) => {
  const [copied, setCopied] = useState(false);

  const copyProviderCode = () => {
    navigator.clipboard.writeText(editProviderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="edit-tg-code">Код провайдера (provider_code)</Label>
        <div className="flex gap-2">
          <Input
            id="edit-tg-code"
            value={editProviderCode}
            className="font-mono text-sm flex-1"
            disabled
          />
          <Button variant="outline" size="sm" onClick={copyProviderCode} className="px-3">
            <Icon name={copied ? 'Check' : 'Copy'} size={16} className={copied ? 'text-green-500' : ''} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Используйте этот код в поле "provider" при отправке сообщений через API
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-tg-api-id">API ID</Label>
        <Input
          id="edit-tg-api-id"
          placeholder="Оставьте пустым, чтобы не менять"
          value={tgApiId}
          onChange={(e) => setTgApiId(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Числовой идентификатор приложения из my.telegram.org
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-tg-api-hash">API Hash</Label>
        <Input
          id="edit-tg-api-hash"
          type="password"
          placeholder="Оставьте пустым, чтобы не менять"
          value={tgApiHash}
          onChange={(e) => setTgApiHash(e.target.value)}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Хеш приложения из my.telegram.org
        </p>
      </div>
    </div>
  );
};

export default EditTelegramOtpConfig;
