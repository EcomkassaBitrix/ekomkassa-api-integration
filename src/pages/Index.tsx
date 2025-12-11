import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

  const providers = [
    { id: 1, name: 'SMS Gateway', icon: 'MessageSquare', status: 'active', requests: 1247 },
    { id: 2, name: 'WhatsApp Business', icon: 'Phone', status: 'active', requests: 892 },
    { id: 3, name: 'Telegram Bot', icon: 'Send', status: 'active', requests: 2156 },
    { id: 4, name: 'Push Notifications', icon: 'Bell', status: 'inactive', requests: 0 },
    { id: 5, name: 'Email Service', icon: 'Mail', status: 'active', requests: 634 },
  ];

  const apiKeys = [
    { id: 1, name: 'Ekomkassa Production', key: 'ek_live_j8h3k2n4m5p6q7r8', created: '2024-12-10', lastUsed: '1 час назад' },
    { id: 2, name: 'Ekomkassa Staging', key: 'ek_test_a1b2c3d4e5f6g7h8', created: '2024-12-05', lastUsed: '3 дня назад' },
  ];

  const logs = [
    { id: 1, method: 'POST', endpoint: '/api/sms/send', status: 200, provider: 'SMS Gateway', time: '14:32:18', duration: '120ms' },
    { id: 2, method: 'POST', endpoint: '/api/whatsapp/send', status: 200, provider: 'WhatsApp', time: '14:31:45', duration: '340ms' },
    { id: 3, method: 'POST', endpoint: '/api/telegram/send', status: 200, provider: 'Telegram', time: '14:30:22', duration: '180ms' },
    { id: 4, method: 'POST', endpoint: '/api/email/send', status: 500, provider: 'Email', time: '14:29:10', duration: '1200ms' },
    { id: 5, method: 'POST', endpoint: '/api/sms/send', status: 200, provider: 'SMS Gateway', time: '14:28:05', duration: '95ms' },
  ];

  const stats = [
    { label: 'Всего запросов', value: '4,929', change: '+12.5%', icon: 'TrendingUp', color: 'text-primary' },
    { label: 'Активных провайдеров', value: '4/5', change: '80%', icon: 'Activity', color: 'text-secondary' },
    { label: 'Успешных доставок', value: '98.2%', change: '+2.1%', icon: 'CheckCircle', color: 'text-green-400' },
    { label: 'Средняя скорость', value: '245ms', change: '-15ms', icon: 'Zap', color: 'text-yellow-400' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="w-64 border-r border-border bg-card h-screen sticky top-0">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="Zap" size={24} className="text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Ekomkassa</h1>
                <p className="text-xs text-muted-foreground">Integration Hub</p>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {[
              { id: 'dashboard', label: 'Дашборд', icon: 'LayoutDashboard' },
              { id: 'providers', label: 'Провайдеры', icon: 'Plug' },
              { id: 'keys', label: 'API Ключи', icon: 'Key' },
              { id: 'logs', label: 'Логи', icon: 'FileText' },
              { id: 'settings', label: 'Настройки', icon: 'Settings' },
              { id: 'docs', label: 'Документация', icon: 'BookOpen' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                  activeSection === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon name={item.icon} size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="px-8 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {activeSection === 'dashboard' && 'Дашборд'}
                  {activeSection === 'providers' && 'Провайдеры'}
                  {activeSection === 'keys' && 'API Ключи'}
                  {activeSection === 'logs' && 'Логи запросов'}
                  {activeSection === 'settings' && 'Настройки'}
                  {activeSection === 'docs' && 'Документация API'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeSection === 'dashboard' && 'Общая статистика и мониторинг системы'}
                  {activeSection === 'providers' && 'Управление интеграциями с каналами связи'}
                  {activeSection === 'keys' && 'Управление доступом к API'}
                  {activeSection === 'logs' && 'История запросов и событий'}
                  {activeSection === 'settings' && 'Конфигурация системы'}
                  {activeSection === 'docs' && 'API справка и примеры интеграции'}
                </p>
              </div>
              <Button size="sm" className="gap-2">
                <Icon name="Plus" size={16} />
                Добавить провайдер
              </Button>
            </div>
          </header>

          <div className="h-[calc(100vh-80px)] overflow-y-auto">
            <div className="p-8">
              {activeSection === 'dashboard' && (
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
                        {providers.map((provider) => (
                          <div key={provider.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Icon name={provider.icon} size={20} className="text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{provider.name}</p>
                                <p className="text-sm text-muted-foreground">{provider.requests.toLocaleString()} запросов</p>
                              </div>
                            </div>
                            <Badge variant={provider.status === 'active' ? 'default' : 'secondary'}>
                              {provider.status === 'active' ? 'Активен' : 'Не активен'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Icon name="FileText" size={20} className="text-secondary" />
                        Последние логи
                      </h3>
                      <div className="space-y-3">
                        {logs.slice(0, 5).map((log) => (
                          <div key={log.id} className="p-3 bg-background/50 rounded-lg border border-border">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-mono text-muted-foreground">{log.time}</span>
                              <Badge variant={log.status === 200 ? 'default' : 'destructive'} className="text-xs">
                                {log.status}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium">{log.provider}</p>
                            <p className="text-xs text-muted-foreground">{log.duration}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {activeSection === 'providers' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {providers.map((provider) => (
                    <Card key={provider.id} className="p-6 bg-card/50 backdrop-blur-sm border-border hover:shadow-lg hover:shadow-primary/20 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                          <Icon name={provider.icon} size={28} className="text-primary" />
                        </div>
                        <Badge variant={provider.status === 'active' ? 'default' : 'secondary'}>
                          {provider.status === 'active' ? 'Активен' : 'Не активен'}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{provider.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {provider.requests.toLocaleString()} запросов за сегодня
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Icon name="Settings" size={16} className="mr-2" />
                          Настроить
                        </Button>
                        <Button variant="outline" size="sm">
                          <Icon name="MoreVertical" size={16} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {activeSection === 'keys' && (
                <div className="space-y-6">
                  <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
                    <h3 className="text-lg font-semibold mb-4">Активные API ключи</h3>
                    <div className="space-y-4">
                      {apiKeys.map((key) => (
                        <div key={key.id} className="p-4 bg-background/50 rounded-lg border border-border">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold">{key.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">Создан: {key.created}</p>
                            </div>
                            <Badge variant="outline">Активен</Badge>
                          </div>
                          <div className="flex items-center gap-2 bg-background p-3 rounded-lg border border-border">
                            <code className="text-sm font-mono flex-1">{key.key}</code>
                            <Button size="sm" variant="ghost">
                              <Icon name="Copy" size={16} />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Последнее использование: {key.lastUsed}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {activeSection === 'logs' && (
                <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">История запросов</h3>
                    <div className="flex gap-2">
                      <Input placeholder="Поиск..." className="w-64" />
                      <Button variant="outline" size="sm">
                        <Icon name="Filter" size={16} />
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-border">
                        <tr className="text-left text-sm text-muted-foreground">
                          <th className="pb-3 font-medium">Время</th>
                          <th className="pb-3 font-medium">Метод</th>
                          <th className="pb-3 font-medium">Endpoint</th>
                          <th className="pb-3 font-medium">Провайдер</th>
                          <th className="pb-3 font-medium">Статус</th>
                          <th className="pb-3 font-medium">Время отклика</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                            <td className="py-3 text-sm">{log.time}</td>
                            <td className="py-3">
                              <Badge variant="outline" className="text-xs">{log.method}</Badge>
                            </td>
                            <td className="py-3 text-sm font-mono">{log.endpoint}</td>
                            <td className="py-3 text-sm">{log.provider}</td>
                            <td className="py-3">
                              <Badge variant={log.status === 200 ? 'default' : 'destructive'}>
                                {log.status}
                              </Badge>
                            </td>
                            <td className="py-3 text-sm text-muted-foreground">{log.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {activeSection === 'settings' && (
                <div className="max-w-2xl">
                  <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
                    <h3 className="text-lg font-semibold mb-6">Общие настройки</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Название проекта</label>
                        <Input defaultValue="Ekomkassa Integration Hub" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Webhook URL</label>
                        <Input defaultValue="https://api.ekomkassa.com/webhooks" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Timeout (мс)</label>
                        <Input type="number" defaultValue="5000" />
                      </div>
                      <div className="pt-4">
                        <Button>Сохранить изменения</Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {activeSection === 'docs' && (
                <div className="max-w-4xl">
                  <Card className="p-6 bg-card/50 backdrop-blur-sm border-border mb-6">
                    <h3 className="text-2xl font-bold mb-4">API Документация</h3>
                    <p className="text-muted-foreground mb-6">
                      Integration Hub API позволяет отправлять уведомления через различные каналы связи с единым интерфейсом.
                    </p>
                    
                    <Tabs defaultValue="auth" className="w-full">
                      <TabsList className="mb-4">
                        <TabsTrigger value="auth">Аутентификация</TabsTrigger>
                        <TabsTrigger value="sms">SMS</TabsTrigger>
                        <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                        <TabsTrigger value="telegram">Telegram</TabsTrigger>
                      </TabsList>

                      <TabsContent value="auth" className="space-y-4">
                        <div className="bg-background/50 p-4 rounded-lg border border-border">
                          <h4 className="font-semibold mb-2">API Key Authentication</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Все запросы должны содержать API ключ в заголовке:
                          </p>
                          <code className="block bg-background p-3 rounded text-sm font-mono border border-border">
                            Authorization: Bearer ek_live_your_api_key_here
                          </code>
                        </div>
                      </TabsContent>

                      <TabsContent value="sms" className="space-y-4">
                        <div className="bg-background/50 p-4 rounded-lg border border-border">
                          <h4 className="font-semibold mb-2">Отправка SMS</h4>
                          <p className="text-sm text-muted-foreground mb-3">POST /api/sms/send</p>
                          <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`{
  "phone": "+79991234567",
  "message": "Ваш код: 1234"
}`}
                          </code>
                        </div>
                      </TabsContent>

                      <TabsContent value="whatsapp" className="space-y-4">
                        <div className="bg-background/50 p-4 rounded-lg border border-border">
                          <h4 className="font-semibold mb-2">Отправка WhatsApp сообщения</h4>
                          <p className="text-sm text-muted-foreground mb-3">POST /api/whatsapp/send</p>
                          <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`{
  "phone": "+79991234567",
  "message": "Заказ #1234 готов"
}`}
                          </code>
                        </div>
                      </TabsContent>

                      <TabsContent value="telegram" className="space-y-4">
                        <div className="bg-background/50 p-4 rounded-lg border border-border">
                          <h4 className="font-semibold mb-2">Отправка Telegram сообщения</h4>
                          <p className="text-sm text-muted-foreground mb-3">POST /api/telegram/send</p>
                          <code className="block bg-background p-3 rounded text-sm font-mono border border-border whitespace-pre">
{`{
  "chat_id": "123456789",
  "message": "Новое уведомление"
}`}
                          </code>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;