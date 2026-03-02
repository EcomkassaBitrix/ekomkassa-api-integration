import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import SandboxResponse from './SandboxResponse';

interface Provider {
  id: number;
  name: string;
  icon: string;
  status: string;
  requests: number;
  code: string;
  usesWappi: boolean;
  usesPostbox: boolean;
  usesFcm: boolean;
  usesApns: boolean;
  usesSmsAero?: boolean;
  usesTelegramOtp?: boolean;
  lastAttemptAt: string | null;
}

interface SandboxFormProps {
  activeProviders: Provider[];
  selectedProvider: string;
  recipient: string;
  message: string;
  subject: string;
  pushTitle: string;
  deviceToken: string;
  isSending: boolean;
  response: Record<string, unknown> | null;
  isEmailProvider: boolean | undefined;
  isFcmProvider: boolean | undefined;
  isApnsProvider: boolean | undefined;
  isPushProvider: boolean;
  onProviderChange: (code: string) => void;
  setRecipient: (v: string) => void;
  setMessage: (v: string) => void;
  setSubject: (v: string) => void;
  setPushTitle: (v: string) => void;
  setDeviceToken: (v: string) => void;
  onSend: () => void;
}

const SandboxForm = ({
  activeProviders,
  selectedProvider,
  recipient,
  message,
  subject,
  pushTitle,
  deviceToken,
  isSending,
  response,
  isEmailProvider,
  isFcmProvider,
  isPushProvider,
  onProviderChange,
  setRecipient,
  setMessage,
  setSubject,
  setPushTitle,
  setDeviceToken,
  onSend,
}: SandboxFormProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="provider-select">Интеграция</Label>
        <Select value={selectedProvider} onValueChange={onProviderChange}>
          <SelectTrigger id="provider-select">
            <SelectValue placeholder="Выберите интеграцию" />
          </SelectTrigger>
          <SelectContent>
            {activeProviders.map((provider) => (
              <SelectItem key={provider.code} value={provider.code}>
                <div className="flex items-center gap-2">
                  <Icon name={provider.icon} size={16} />
                  <span>{provider.name}</span>
                  {provider.usesWappi && (
                    <Badge variant="outline" className="ml-2 text-xs">Wappi</Badge>
                  )}
                  {provider.usesPostbox && (
                    <Badge variant="outline" className="ml-2 text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">Postbox</Badge>
                  )}
                  {provider.usesFcm && (
                    <Badge variant="outline" className="ml-2 text-xs bg-orange-500/10 text-orange-500 border-orange-500/20">FCM</Badge>
                  )}
                  {provider.usesApns && (
                    <Badge variant="outline" className="ml-2 text-xs bg-purple-500/10 text-purple-500 border-purple-500/20">APNs</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Провайдер для отправки сообщения</p>
      </div>

      {isPushProvider ? (
        <div className="space-y-2">
          <Label htmlFor="device-token">Device Token</Label>
          <Input
            id="device-token"
            placeholder="Device token для push-уведомления"
            value={deviceToken}
            onChange={(e) => setDeviceToken(e.target.value)}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            {isFcmProvider ? "FCM токен устройства Android" : "APNs токен устройства iOS"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="recipient">Получатель</Label>
          <Input
            id="recipient"
            placeholder={isEmailProvider ? "email@example.com" : "+79991234567"}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            {isEmailProvider ? "Email адрес получателя" : "Номер телефона или идентификатор получателя"}
          </p>
        </div>
      )}

      {isEmailProvider && (
        <div className="space-y-2">
          <Label htmlFor="subject">Тема письма</Label>
          <Input
            id="subject"
            placeholder="Тема письма"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Тема email сообщения (опционально)</p>
        </div>
      )}

      {isPushProvider && (
        <div className="space-y-2">
          <Label htmlFor="push-title">Заголовок уведомления</Label>
          <Input
            id="push-title"
            placeholder="Заголовок push-уведомления"
            value={pushTitle}
            onChange={(e) => setPushTitle(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Заголовок push-уведомления (опционально)</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="message">{isPushProvider ? "Текст уведомления" : "Сообщение"}</Label>
        <Textarea
          id="message"
          placeholder={
            isPushProvider
              ? "Текст push-уведомления..."
              : isEmailProvider
                ? "Текст email сообщения..."
                : "Введите текст сообщения..."
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {isPushProvider
            ? "Текст (body) push-уведомления"
            : isEmailProvider
              ? "Текст email сообщения"
              : "Текст сообщения для отправки"
          }
        </p>
      </div>

      <Button
        onClick={onSend}
        disabled={
          !selectedProvider ||
          !message ||
          (isPushProvider && !deviceToken) ||
          (!isPushProvider && !recipient) ||
          isSending
        }
        className="w-full"
        size="lg"
      >
        {isSending ? (
          <>
            <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
            Отправка...
          </>
        ) : (
          <>
            <Icon name="Send" size={20} className="mr-2" />
            Отправить сообщение
          </>
        )}
      </Button>

      {response && <SandboxResponse response={response} />}

      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-start gap-3">
          <Icon name="Info" size={20} className="text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Информация:</p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>Сообщения отправляются в реальном времени</li>
              {isEmailProvider ? (
                <>
                  <li>Для Email укажите корректный email адрес</li>
                  <li>Тема письма опциональна (по умолчанию: "Уведомление")</li>
                  <li>Провайдер ek_email использует Yandex Postbox API</li>
                </>
              ) : (
                <>
                  <li>Для WhatsApp используйте формат: +79991234567</li>
                  <li>Система автоматически повторяет неудачные попытки</li>
                </>
              )}
              <li>Результаты отправки можно посмотреть в разделе "Логи"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SandboxForm;