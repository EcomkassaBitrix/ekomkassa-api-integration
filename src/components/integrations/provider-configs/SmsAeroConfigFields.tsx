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
        <Label htmlFor="smsaero-email">Email аккаунта SMS Aero</Label>
        <Input
          id="smsaero-email"
          type="email"
          placeholder="you@example.com"
          value={smsAeroEmail}
          onChange={(e) => setSmsAeroEmail(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="smsaero-apikey">API ключ</Label>
        <Input
          id="smsaero-apikey"
          type="password"
          placeholder="Ваш API ключ из личного кабинета SMS Aero"
          value={smsAeroApiKey}
          onChange={(e) => setSmsAeroApiKey(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Настройки → API → API ключ на smsaero.ru
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="smsaero-sign">Подпись отправителя (Sign)</Label>
        <Input
          id="smsaero-sign"
          placeholder="SMS Aero"
          value={smsAeroSign}
          onChange={(e) => setSmsAeroSign(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Имя отправителя в SMS (например: MyBrand). Должна быть зарегистрирована в SMS Aero.
        </p>
      </div>
    </>
  );
};

export default SmsAeroConfigFields;
