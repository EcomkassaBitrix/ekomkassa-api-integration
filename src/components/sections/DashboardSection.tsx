import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DashboardSectionProps {
  activeSection: string;
  providers: any[];
  logs: any[];
}

const DashboardSection = ({
  activeSection,
  providers,
  logs
}: DashboardSectionProps) => {
  const totalRequests = logs.length;
  const activeProviders = providers.filter(p => p.status === 'working' || p.status === 'configured').length;
  const totalProviders = providers.length;
  
  const deliveredCount = logs.filter(l => l.status === 'delivered').length;
  const deliveryRate = totalRequests > 0 ? ((deliveredCount / totalRequests) * 100).toFixed(1) : '0.0';
  
  const responseTimes = logs
    .filter(l => l.response_time && typeof l.response_time === 'number')
    .map(l => l.response_time);
  const avgResponseTime = responseTimes.length > 0 
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;
  
  const stats = [
    { 
      label: 'Всего запросов', 
      value: totalRequests.toLocaleString('ru-RU'), 
      change: totalRequests > 0 ? `${totalRequests} сообщений` : 'Нет данных', 
      icon: 'TrendingUp', 
      color: 'text-primary' 
    },
    { 
      label: 'Активных провайдеров', 
      value: `${activeProviders}/${totalProviders}`, 
      change: totalProviders > 0 ? `${Math.round((activeProviders/totalProviders)*100)}%` : '0%', 
      icon: 'Activity', 
      color: 'text-secondary' 
    },
    { 
      label: 'Успешных доставок', 
      value: `${deliveryRate}%`, 
      change: `${deliveredCount} из ${totalRequests}`, 
      icon: 'CheckCircle', 
      color: 'text-green-400' 
    },
    { 
      label: 'Средняя скорость', 
      value: avgResponseTime > 0 ? `${avgResponseTime}ms` : 'N/A', 
      change: responseTimes.length > 0 ? `${responseTimes.length} измерений` : 'Нет данных', 
      icon: 'Zap', 
      color: 'text-yellow-400' 
    },
  ];

  if (activeSection === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6 bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className={`text-xs mt-2 ${stat.color}`}>{stat.change}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center ${stat.color}`}>
                  <Icon name={stat.icon} size={24} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 bg-card/50 backdrop-blur-sm border-border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="Activity" size={20} className="text-primary" />
              Активность провайдеров
            </h3>
            <div className="space-y-4">
              {providers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Нет провайдеров</p>
                </div>
              ) : (
                providers.map((provider) => {
                  const providerLogs = logs.filter(l => l.provider === provider.code);
                  const isActive = provider.status === 'working' || provider.status === 'configured';
                  
                  return (
                    <div key={provider.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Icon name={provider.icon} size={20} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-sm text-muted-foreground">{providerLogs.length} запросов</p>
                        </div>
                      </div>
                      <Badge variant={isActive ? 'default' : 'secondary'}>
                        {isActive ? 'Активен' : 'Не настроен'}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon name="FileText" size={20} className="text-secondary" />
              Последние логи
            </h3>
            <div className="space-y-3">
              {logs.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Логов пока нет</p>
                </div>
              ) : (
                logs.slice(0, 5).map((log, index) => (
                  <div key={log.message_id || `log-${index}`} className="p-3 bg-background/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('ru-RU', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      <Badge variant={log.status === 'delivered' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                        {log.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{log.provider}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.recipient}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (activeSection === 'docs') {
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
  "message_id": "msg_abc123def456",
  "status": "delivered",
  "provider": "ek_max"
}`}
                </code>
              </div>
              
              <div className="bg-background/50 p-4 rounded-lg border border-border">
                <h4 className="font-semibold mb-2">Ошибка (400/401/500)</h4>
                <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`{
  "success": false,
  "error": "Invalid API key"
}`}
                </code>
                <p className="text-sm text-muted-foreground mt-3">
                  401: Неверный API ключ<br/>
                  400: Неверные параметры или провайдер неактивен<br/>
                  500: Внутренняя ошибка сервера
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    );
  }

  return null;
};

export default DashboardSection;