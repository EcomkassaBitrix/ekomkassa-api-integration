import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';

interface ProviderBaseFieldsProps {
  providerName: string;
  setProviderName: (name: string) => void;
  providerCode: string;
  setProviderCode: (code: string) => void;
  providerType: string;
  setProviderType: (type: string) => void;
}

const ProviderBaseFields = ({
  providerName,
  setProviderName,
  providerCode,
  setProviderCode,
  providerType,
  setProviderType,
}: ProviderBaseFieldsProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="provider-name">Название подключения</Label>
        <Input
          id="provider-name"
          placeholder="WhatsApp Business"
          value={providerName}
          onChange={(e) => setProviderName(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Отображаемое имя подключения в интерфейсе
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider-code">Код провайдера (provider_code)</Label>
        <Input
          id="provider-code"
          placeholder="ek_wa"
          value={providerCode}
          onChange={(e) => setProviderCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Уникальный идентификатор для использования в API (только латиница, цифры и _)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider-type">Провайдер</Label>
        <Select value={providerType} onValueChange={setProviderType}>
          <SelectTrigger id="provider-type">
            <SelectValue placeholder="Выберите провайдера" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="whatsapp_business">
              <div className="flex items-center gap-2">
                <Icon name="Phone" size={16} />
                <span>WhatsApp (Wappi)</span>
              </div>
            </SelectItem>
            <SelectItem value="telegram_bot">
              <div className="flex items-center gap-2">
                <Icon name="Send" size={16} />
                <span>Telegram (Wappi)</span>
              </div>
            </SelectItem>
            <SelectItem value="max">
              <div className="flex items-center gap-2">
                <Icon name="MessageCircle" size={16} />
                <span>MAX (Wappi)</span>
              </div>
            </SelectItem>
            <SelectItem value="yandex_postbox">
              <div className="flex items-center gap-2">
                <Icon name="Mail" size={16} />
                <span>Яндекс Postbox API</span>
              </div>
            </SelectItem>
            <SelectItem value="fcm">
              <div className="flex items-center gap-2">
                <Icon name="Bell" size={16} />
                <span>Firebase Cloud Messaging (Android Push)</span>
              </div>
            </SelectItem>
            <SelectItem value="apns">
              <div className="flex items-center gap-2">
                <Icon name="Apple" size={16} />
                <span>Apple Push Notification (iOS Push)</span>
              </div>
            </SelectItem>
            <SelectItem value="sms_aero">
              <div className="flex items-center gap-2">
                <Icon name="MessageSquare" size={16} />
                <span>SMS Aero</span>
              </div>
            </SelectItem>
            <SelectItem value="telegram_otp">
              <div className="flex items-center gap-2">
                <Icon name="Send" size={16} />
                <span>Telegram OTP</span>
              </div>
            </SelectItem>
            <SelectItem value="email">Email SMTP</SelectItem>
            <SelectItem value="custom">Другой / Custom</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Провайдер для отправки сообщений
        </p>
      </div>
    </>
  );
};

export default ProviderBaseFields;