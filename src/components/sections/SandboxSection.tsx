import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';

interface SandboxSectionProps {
  providers: any[];
}

const SandboxSection = ({ providers }: SandboxSectionProps) => {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const activeProviders = providers
    .filter(p => p.status === 'working' || p.status === 'configured')
    .map(p => ({
      ...p,
      usesPostbox: p.code === 'ek_email' ? true : p.usesPostbox
    }));

  const selectedProviderData = activeProviders.find(p => p.code === selectedProvider);
  const isEmailProvider = selectedProviderData?.usesPostbox;

  const handleProviderChange = (providerCode: string) => {
    setSelectedProvider(providerCode);
    
    const provider = activeProviders.find(p => p.code === providerCode);
    if (!provider) return;
    
    if (provider.usesPostbox) {
      setRecipient('example@domain.com');
      setMessage('Привет! Это тестовое письмо из Integration Hub.');
      setSubject('Тестовое сообщение');
    } else if (provider.usesWappi || provider.code.includes('max')) {
      setRecipient('+79689363395');
      setMessage('Привет! Это тестовое сообщение.');
      setSubject('');
    } else {
      setRecipient('');
      setMessage('');
      setSubject('');
    }
  };

  const loadExample = () => {
    const hasEmailProvider = activeProviders.some(p => p.usesPostbox);
    
    if (hasEmailProvider) {
      handleProviderChange('ek_email');
    } else {
      handleProviderChange('max');
    }
  };

  const sendMessage = async () => {
    if (!selectedProvider || !recipient || !message) {
      return;
    }

    setIsSending(true);
    setResponse(null);

    try {
      const requestBody: any = {
        provider: selectedProvider,
        recipient: recipient,
        message: message
      };

      if (isEmailProvider && subject) {
        requestBody.subject = subject;
      }

      const response = await fetch('https://functions.poehali.dev/ace36e55-b169-41f2-9d2b-546f92221bb7', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      setResponse(data);

      if (data.success) {
        setTimeout(() => {
          setRecipient('');
          setMessage('');
          setSubject('');
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setResponse({
        success: false,
        error: 'Ошибка отправки запроса'
      });
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
            <Button
              variant="outline"
              size="sm"
              onClick={loadExample}
              className="gap-2"
            >
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
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="provider-select">Интеграция</Label>
              <Select value={selectedProvider} onValueChange={handleProviderChange}>
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
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Провайдер для отправки сообщения
              </p>
            </div>

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

            {isEmailProvider && (
              <div className="space-y-2">
                <Label htmlFor="subject">Тема письма</Label>
                <Input
                  id="subject"
                  placeholder="Тема письма"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Тема email сообщения (опционально)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">Сообщение</Label>
              <Textarea
                id="message"
                placeholder={isEmailProvider ? "Текст email сообщения..." : "Введите текст сообщения..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {isEmailProvider ? "Текст email сообщения" : "Текст сообщения для отправки"}
              </p>
            </div>

            <Button
              onClick={sendMessage}
              disabled={!selectedProvider || !recipient || !message || isSending}
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

            {response && (
              <Card className={`p-4 ${response.success ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
                <div className="flex items-start gap-3">
                  <Icon 
                    name={response.success ? "CheckCircle" : "XCircle"} 
                    size={20} 
                    className={response.success ? "text-green-500 mt-0.5" : "text-destructive mt-0.5"}
                  />
                  <div className="flex-1">
                    <p className={`font-medium mb-2 ${response.success ? 'text-green-500' : 'text-destructive'}`}>
                      {response.success ? 'Сообщение отправлено!' : 'Ошибка отправки'}
                    </p>
                    {response.message_id && (
                      <p className="text-sm text-muted-foreground mb-1">
                        ID сообщения: <code className="font-mono text-xs">{response.message_id}</code>
                      </p>
                    )}
                    {response.error && (
                      <p className="text-sm text-muted-foreground">
                        {response.error}
                      </p>
                    )}
                    {response.status && (
                      <p className="text-sm text-muted-foreground">
                        Статус: {response.status}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

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
        )}
      </Card>
    </div>
  );
};

export default SandboxSection;