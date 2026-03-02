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

  const handleProviderChange = (providerCode: string) => {
    setSelectedProvider(providerCode);

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
