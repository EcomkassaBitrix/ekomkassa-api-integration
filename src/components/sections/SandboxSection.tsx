import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import SandboxForm from '@/components/sandbox/SandboxForm';

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
  usesSmsAero: boolean;
  usesTelegramOtp: boolean;
  lastAttemptAt: string | null;
}

interface SandboxSectionProps {
  providers: Provider[];
}

const SandboxSection = ({ providers }: SandboxSectionProps) => {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [pushTitle, setPushTitle] = useState('');
  const [deviceToken, setDeviceToken] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<Record<string, unknown> | null>(null);

  // Telegram OTP — двухшаговый флоу
  const [tgStep, setTgStep] = useState<'phone' | 'code'>('phone');
  const [tgCode, setTgCode] = useState('');
  const [tgCodeSent, setTgCodeSent] = useState(false);

  const activeProviders = providers
    .filter(p => p.status === 'working' || p.status === 'configured')
    .map(p => ({
      ...p,
      usesPostbox: p.code === 'ek_email' ? true : p.usesPostbox
    }));

  const selectedProviderData = activeProviders.find(p => p.code === selectedProvider);
  const isEmailProvider = selectedProviderData?.usesPostbox;
  const isFcmProvider = selectedProviderData?.usesFcm;
  const isApnsProvider = selectedProviderData?.usesApns;
  const isPushProvider = !!(isFcmProvider || isApnsProvider);
  const isTelegramOtp = !!selectedProviderData?.usesTelegramOtp;

  const handleProviderChange = (providerCode: string) => {
    setSelectedProvider(providerCode);
    setTgStep('phone');
    setTgCode('');
    setTgCodeSent(false);
    setResponse(null);

    const provider = activeProviders.find(p => p.code === providerCode);
    if (!provider) return;

    if (provider.usesPostbox) {
      setRecipient('example@domain.com');
      setMessage('Привет! Это тестовое письмо из Integration Hub.');
      setSubject('Тестовое сообщение');
      setPushTitle('');
      setDeviceToken('');
    } else if (provider.usesFcm || provider.usesApns) {
      setRecipient('');
      setDeviceToken('example_device_token_here');
      setPushTitle('Тестовое уведомление');
      setMessage('Это тестовое push-уведомление из Integration Hub.');
      setSubject('');
    } else if (provider.usesWappi || provider.code.includes('max')) {
      setRecipient('+79689363395');
      setMessage('Привет! Это тестовое сообщение.');
      setSubject('');
      setPushTitle('');
      setDeviceToken('');
    } else if (provider.usesTelegramOtp) {
      setRecipient('+79991234567');
      setMessage('');
      setSubject('');
      setPushTitle('');
      setDeviceToken('');
    } else if (provider.usesSmsAero) {
      setRecipient('+79689363395');
      setMessage('Привет! Это тестовое SMS из Integration Hub.');
      setSubject('');
      setPushTitle('');
      setDeviceToken('');
    } else {
      setRecipient('');
      setMessage('');
      setSubject('');
      setPushTitle('');
      setDeviceToken('');
    }
  };

  const loadExample = () => {
    const hasEmailProvider = activeProviders.some(p => p.usesPostbox);
    handleProviderChange(hasEmailProvider ? 'ek_email' : 'max');
  };

  const sendTgCode = async () => {
    if (!selectedProvider || !recipient) return;
    setIsSending(true);
    setResponse(null);
    try {
      const res = await fetch('https://functions.poehali.dev/6ecd446a-71fc-4645-9447-63b3290a4f45', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8' },
        body: JSON.stringify({ provider_code: selectedProvider, phone: recipient })
      });
      const data = await res.json();
      setResponse(data);
      if (data.success) {
        setTgStep('code');
        setTgCodeSent(true);
      }
    } catch {
      setResponse({ success: false, error: 'Ошибка соединения' });
    } finally {
      setIsSending(false);
    }
  };

  const verifyTgCode = async () => {
    if (!selectedProvider || !recipient || !tgCode) return;
    setIsSending(true);
    setResponse(null);
    try {
      const res = await fetch('https://functions.poehali.dev/75679f26-e849-45c2-bfcc-24759c4cae84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8' },
        body: JSON.stringify({ provider_code: selectedProvider, phone: recipient, code: tgCode })
      });
      const data = await res.json();
      setResponse(data);
      if (data.success) {
        setTgStep('phone');
        setTgCode('');
        setTgCodeSent(false);
      }
    } catch {
      setResponse({ success: false, error: 'Ошибка соединения' });
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedProvider || !message) return;
    if (isPushProvider && !deviceToken) return;
    if (!isPushProvider && !recipient) return;

    setIsSending(true);
    setResponse(null);

    try {
      const requestBody: Record<string, unknown> = {
        provider: selectedProvider,
        message: message
      };

      if (isPushProvider) {
        requestBody.device_token = deviceToken;
        if (pushTitle) requestBody.title = pushTitle;
      } else {
        requestBody.recipient = recipient;
      }

      if (isEmailProvider && subject) {
        requestBody.subject = subject;
      }

      const res = await fetch('https://functions.poehali.dev/ace36e55-b169-41f2-9d2b-546f92221bb7', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();
      setResponse(data);

      if (data.success) {
        setTimeout(() => {
          setRecipient('');
          setMessage('');
          setSubject('');
          setPushTitle('');
          setDeviceToken('');
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setResponse({ success: false, error: 'Ошибка отправки запроса' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="Send" size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Тестовая отправка</h3>
              <p className="text-sm text-muted-foreground">
                Отправьте тестовое сообщение через подключенные интеграции
              </p>
            </div>
          </div>
          {activeProviders.length > 0 && (
            <Button variant="outline" size="sm" onClick={loadExample} className="gap-2">
              <Icon name="FileText" size={16} />
              Пример
            </Button>
          )}
        </div>

        {activeProviders.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="AlertCircle" size={48} className="mx-auto mb-3 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Нет активных интеграций</p>
            <p className="text-sm text-muted-foreground">
              Добавьте и настройте интеграцию в разделе "Интеграции"
            </p>
          </div>
        ) : isTelegramOtp ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Интеграция</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={selectedProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                {activeProviders.map(p => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Номер телефона</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm font-mono"
                  placeholder="+79991234567"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  disabled={tgStep === 'code'}
                />
                {tgStep === 'code' && (
                  <Button variant="outline" size="sm" onClick={() => { setTgStep('phone'); setTgCode(''); setResponse(null); }}>
                    <Icon name="RefreshCw" size={16} />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Telegram пришлёт код на этот номер</p>
            </div>

            {tgStep === 'code' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Код из Telegram</label>
                <input
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono tracking-widest text-center text-lg"
                  placeholder="12345"
                  maxLength={6}
                  value={tgCode}
                  onChange={(e) => setTgCode(e.target.value.replace(/\D/g, ''))}
                />
                <p className="text-xs text-muted-foreground">Введите код который Telegram прислал в приложение</p>
              </div>
            )}

            {tgStep === 'phone' ? (
              <Button onClick={sendTgCode} disabled={!recipient || isSending} className="w-full" size="lg">
                {isSending ? (
                  <><Icon name="Loader2" size={20} className="mr-2 animate-spin" />Отправка кода...</>
                ) : (
                  <><Icon name="Send" size={20} className="mr-2" />Отправить код в Telegram</>
                )}
              </Button>
            ) : (
              <Button onClick={verifyTgCode} disabled={!tgCode || tgCode.length < 4 || isSending} className="w-full" size="lg">
                {isSending ? (
                  <><Icon name="Loader2" size={20} className="mr-2 animate-spin" />Проверка...</>
                ) : (
                  <><Icon name="CheckCircle" size={20} className="mr-2" />Проверить код</>
                )}
              </Button>
            )}

            {response && (
              <div className={`p-4 rounded-lg border ${response.success ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
                {response.success ? (
                  <p className="text-sm text-green-500 flex items-center gap-2">
                    <Icon name="CheckCircle" size={16} />
                    {tgCodeSent && tgStep === 'code' ? 'Код отправлен! Проверьте Telegram.' : 'Код верный — верификация прошла успешно!'}
                  </p>
                ) : (
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <Icon name="AlertCircle" size={16} />
                    {response.error as string}
                  </p>
                )}
              </div>
            )}

            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <Icon name="Info" size={20} className="text-primary mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Как это работает:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Введите номер телефона и нажмите "Отправить код"</li>
                    <li>Telegram пришлёт код прямо в приложение</li>
                    <li>Введите код и нажмите "Проверить"</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <SandboxForm
            activeProviders={activeProviders}
            selectedProvider={selectedProvider}
            recipient={recipient}
            message={message}
            subject={subject}
            pushTitle={pushTitle}
            deviceToken={deviceToken}
            isSending={isSending}
            response={response}
            isEmailProvider={isEmailProvider}
            isFcmProvider={isFcmProvider}
            isApnsProvider={isApnsProvider}
            isPushProvider={isPushProvider}
            onProviderChange={handleProviderChange}
            setRecipient={setRecipient}
            setMessage={setMessage}
            setSubject={setSubject}
            setPushTitle={setPushTitle}
            setDeviceToken={setDeviceToken}
            onSend={sendMessage}
          />
        )}
      </Card>
    </div>
  );
};

export default SandboxSection;