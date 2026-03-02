import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SmsAeroConfigFieldsProps {
  smsAeroApiKey: string;
  setSmsAeroApiKey: (val: string) => void;
  smsAeroSign: string;
  setSmsAeroSign: (val: string) => void;
}

const SmsAeroConfigFields = ({
  smsAeroApiKey,
  setSmsAeroApiKey,
  smsAeroSign,
  setSmsAeroSign,
}: SmsAeroConfigFieldsProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="smsaero-apikey">API ключ</Label>
        <Input
          id="smsaero-apikey"
          type="password"
          placeholder="email@example.com:ваш_api_ключ"
          value={smsAeroApiKey}
          onChange={(e) => setSmsAeroApiKey(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Формат: <span className="font-mono">email:api_ключ</span> — из раздела Настройки → API на smsaero.ru
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
