import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ApiDocsSection = () => {
  return (
    <div className="max-w-4xl">
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border mb-6">
        <h3 className="text-2xl font-bold mb-4">API Документация</h3>
        <p className="text-muted-foreground mb-6">
          Integration Hub API позволяет отправлять уведомления через различные каналы связи с единым интерфейсом.
        </p>

        <Tabs defaultValue="auth" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="auth">Аутентификация</TabsTrigger>
            <TabsTrigger value="send">Мессенджеры</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="push">Push</TabsTrigger>
            <TabsTrigger value="response">Ответы</TabsTrigger>
          </TabsList>

          <TabsContent value="auth" className="space-y-4">
            <div className="bg-background/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold mb-2">API Key Authentication</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Все запросы должны содержать API ключ в заголовке X-Api-Key:
              </p>
              <code className="block bg-background p-3 rounded text-sm font-mono border border-border">
                X-Api-Key: ek_live_your_api_key_here
              </code>
              <p className="text-sm text-muted-foreground mt-3">
                API ключи создаются в разделе "API Ключи"
              </p>
            </div>
          </TabsContent>

          <TabsContent value="send" className="space-y-4">
            <div className="bg-background/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold mb-2">Отправка сообщения</h4>
              <p className="text-sm text-muted-foreground mb-3">POST https://functions.poehali.dev/ace36e55-b169-41f2-9d2b-546f92221bb7</p>
              <div className="mb-3">
                <p className="text-sm font-medium mb-2">Headers:</p>
                <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`Content-Type: application/json
X-Api-Key: ek_live_your_api_key_here`}
                </code>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Body (для мессенджеров):</p>
                <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`{
  "provider": "ek_max",
  "recipient": "+79991234567",
  "message": "Ваш заказ готов!"
}`}
                </code>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                provider: код провайдера (ek_max, ek_wa, ek_tg)<br/>
                recipient: номер телефона или chat_id<br/>
                message: текст сообщения
              </p>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="bg-background/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold mb-2">Отправка Email</h4>
              <p className="text-sm text-muted-foreground mb-3">POST https://functions.poehali.dev/ace36e55-b169-41f2-9d2b-546f92221bb7</p>
              <div className="mb-3">
                <p className="text-sm font-medium mb-2">Headers:</p>
                <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`Content-Type: application/json
X-Api-Key: ek_live_your_api_key_here`}
                </code>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Body:</p>
                <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`{
  "provider": "ek_email",
  "recipient": "user@example.com",
  "message": "Текст письма",
  "subject": "Тема письма"
}`}
                </code>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                provider: "ek_email" для Yandex Postbox<br/>
                recipient: email адрес получателя<br/>
                message: текст письма<br/>
                subject: тема (опционально, по умолчанию "Уведомление")
              </p>
            </div>
          </TabsContent>

          <TabsContent value="push" className="space-y-4">
            <div className="bg-background/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold mb-2">Отправка Push-уведомлений (Android FCM)</h4>
              <p className="text-sm text-muted-foreground mb-3">POST https://functions.poehali.dev/ace36e55-b169-41f2-9d2b-546f92221bb7</p>
              <div className="mb-3">
                <p className="text-sm font-medium mb-2">Headers:</p>
                <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`Content-Type: application/json
X-Api-Key: ek_live_your_api_key_here`}
                </code>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Body:</p>
                <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`{
  "provider": "ek_push_android",
  "recipient": "device_fcm_token_here",
  "message": "Ваш заказ доставлен!",
  "title": "Новое уведомление"
}`}
                </code>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                provider: код вашего FCM провайдера (например: ek_push_android)<br/>
                recipient: FCM Device Token пользователя<br/>
                message: текст уведомления (обязательно)<br/>
                title: заголовок уведомления (опционально)
              </p>
            </div>

            <div className="bg-background/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold mb-2">Отправка Push-уведомлений (iOS APNs)</h4>
              <p className="text-sm text-muted-foreground mb-3">POST https://functions.poehali.dev/ace36e55-b169-41f2-9d2b-546f92221bb7</p>
              <div className="mb-3">
                <p className="text-sm font-medium mb-2">Headers:</p>
                <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`Content-Type: application/json
X-Api-Key: ek_live_your_api_key_here`}
                </code>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Body:</p>
                <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`{
  "provider": "ek_push_ios",
  "recipient": "device_apns_token_here",
  "message": "Ваш заказ доставлен!",
  "title": "Новое уведомление"
}`}
                </code>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                provider: код вашего APNs провайдера (например: ek_push_ios)<br/>
                recipient: APNs Device Token пользователя (hex string)<br/>
                message: текст уведомления (обязательно)<br/>
                title: заголовок уведомления (опционально)
              </p>
            </div>

            <div className="bg-background/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold mb-2">Пример с дополнительными данными</h4>
              <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`{
  "provider": "ek_push_android",
  "recipient": "eXAmPlE_tOkEn_123...",
  "message": "Заказ #12345 доставлен",
  "title": "Статус заказа",
  "data": {
    "order_id": "12345",
    "action": "order_delivered"
  }
}`}
              </code>
              <p className="text-sm text-muted-foreground mt-3">
                data: дополнительные данные для обработки в приложении (опционально)<br/>
                Работает для Android (FCM) и iOS (APNs)
              </p>
            </div>
          </TabsContent>

          <TabsContent value="response" className="space-y-4">
            <div className="bg-background/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold mb-2">Успешный ответ (200 OK)</h4>
              <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`{
  "success": true,
  "message_id": "msg_abc123",
  "status": "queued"
}`}
              </code>
            </div>
            <div className="bg-background/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold mb-2">Ошибка авторизации (401)</h4>
              <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`{
  "success": false,
  "error": "Invalid API key"
}`}
              </code>
            </div>
            <div className="bg-background/50 p-4 rounded-lg border border-border">
              <h4 className="font-semibold mb-2">Ошибка провайдера (400)</h4>
              <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`{
  "success": false,
  "error": "Provider not found or not configured"
}`}
              </code>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default ApiDocsSection;
