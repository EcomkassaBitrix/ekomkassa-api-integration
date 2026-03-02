import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SmsAeroConfigFieldsProps {
  smsAeroEmail: string;
  setSmsAeroEmail: (val: string) => void;
  smsAeroApiKey: string;
  setSmsAeroApiKey: (val: string) => void;
  smsAeroSign: string;
  setSmsAeroSign: (val: string) => void;
}

const SmsAeroConfigFields = ({
  smsAeroEmail,
  setSmsAeroEmail,
  smsAeroApiKey,
  setSmsAeroApiKey,
  smsAeroSign,
  setSmsAeroSign,
}: SmsAeroConfigFieldsProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="smsaero-email">Логин (email)</Label>
        <Input
          id="smsaero-email"
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
        <Label htmlFor="smsaero-apikey">API ключ</Label>
        <Input
          id="smsaero-apikey"
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
        <Label htmlFor="smsaero-sign">Имя отправителя</Label>
        <Input
          id="smsaero-sign"
          placeholder="MyBrand"
          value={smsAeroSign}
          onChange={(e) => setSmsAeroSign(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Зарегистрированная подпись отправителя в SMS Aero
        </p>
      </div>
    </>
  );
};

export default SmsAeroConfigFields;
