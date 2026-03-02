import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useState } from 'react';

interface EditSmsAeroConfigProps {
  editProviderCode: string;
  smsAeroEmail: string;
  setSmsAeroEmail: (val: string) => void;
  smsAeroApiKey: string;
  setSmsAeroApiKey: (val: string) => void;
  smsAeroSign: string;
  setSmsAeroSign: (val: string) => void;
}

const EditSmsAeroConfig = ({
  editProviderCode,
  smsAeroEmail,
  setSmsAeroEmail,
  smsAeroApiKey,
  setSmsAeroApiKey,
  smsAeroSign,
  setSmsAeroSign,
}: EditSmsAeroConfigProps) => {
  const [copied, setCopied] = useState(false);

  const copyProviderCode = () => {
    navigator.clipboard.writeText(editProviderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="edit-smsaero-code">Код провайдера (provider_code)</Label>
        <div className="flex gap-2">
          <Input
            id="edit-smsaero-code"
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
        <Label htmlFor="edit-smsaero-email">Логин (email)</Label>
        <Input
          id="edit-smsaero-email"
          type="email"
          placeholder="email@example.com"
          value={smsAeroEmail}
          onChange={(e) => setSmsAeroEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Email вашего аккаунта на smsaero.ru
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-smsaero-apikey">API ключ</Label>
        <Input
          id="edit-smsaero-apikey"
          type="password"
          placeholder="EpNGKz4-6qMiI5DOBbFoNZbPLRATDCY-"
          value={smsAeroApiKey}
          onChange={(e) => setSmsAeroApiKey(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Настройки → API → API ключ на smsaero.ru
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-smsaero-sign">Имя отправителя</Label>
        <Input
          id="edit-smsaero-sign"
          placeholder="MyBrand"
          value={smsAeroSign}
          onChange={(e) => setSmsAeroSign(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Зарегистрированная подпись отправителя в SMS Aero
        </p>
      </div>
    </div>
  );
};

export default EditSmsAeroConfig;
