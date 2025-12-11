import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const Index = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [wappiToken, setWappiToken] = useState('');
  const [wappiProfileId, setWappiProfileId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [addProviderDialogOpen, setAddProviderDialogOpen] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderCode, setNewProviderCode] = useState('');
  const [newProviderType, setNewProviderType] = useState('');
  const [newProviderWappiToken, setNewProviderWappiToken] = useState('');
  const [newProviderWappiProfileId, setNewProviderWappiProfileId] = useState('');
  
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getProviderIcon = (providerType: string, providerCode: string) => {
    if (providerCode.includes('whatsapp')) return 'Phone';
    if (providerCode.includes('telegram')) return 'Send';
    if (providerCode.includes('sms')) return 'MessageSquare';
    if (providerCode.includes('email')) return 'Mail';
    if (providerCode.includes('push')) return 'Bell';
    if (providerCode.includes('wappi') || providerCode.includes('max')) return 'MessageCircle';
    return 'Plug';
  };

  const apiKeys = [
    { id: 1, name: 'Ekomkassa Production', key: 'ek_live_j8h3k2n4m5p6q7r8', created: '2024-12-10', lastUsed: '1 час назад' },
    { id: 2, name: 'Ekomkassa Staging', key: 'ek_test_a1b2c3d4e5f6g7h8', created: '2024-12-05', lastUsed: '3 дня назад' },
  ];

  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [retryingMessage, setRetryingMessage] = useState<string | null>(null);
  const [providerConfigs, setProviderConfigs] = useState<Record<string, boolean>>({});
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch('https://functions.poehali.dev/60b2409b-4db8-4c49-b6a6-58fab1e62a2f?limit=50', {
        headers: {
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        }
      });
      const data = await response.json();
      if (data.success) {
        setLogs(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const retryMessage = async (messageId: string) => {
    setRetryingMessage(messageId);
    try {
      const response = await fetch('https://functions.poehali.dev/179a2b88-4c3b-4ebd-84f9-612b0c2b6227', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        },
        body: JSON.stringify({ message_id: messageId })
      });
      const data = await response.json();
      if (data.success) {
        await loadLogs();
      }
    } catch (error) {
      console.error('Failed to retry message:', error);
    } finally {
      setRetryingMessage(null);
    }
  };

  const loadProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const response = await fetch('https://functions.poehali.dev/c55cf921-d1ec-4fc7-a6e2-59c730988a1e', {
        headers: {
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        }
      });
      const data = await response.json();
      if (data.success && data.providers) {
        const configs: Record<string, boolean> = {};
        const providersData = data.providers.map((p: any, index: number) => {
          const hasConfig = p.config && Object.keys(p.config).length > 0;
          if (hasConfig) {
            configs[p.provider_code] = true;
          }
          return {
            id: index + 1,
            name: p.provider_name,
            icon: getProviderIcon(p.provider_type, p.provider_code),
            status: p.is_active ? 'active' : 'inactive',
            requests: 0,
            code: p.provider_code,
            usesWappi: p.provider_type === 'wappi'
          };
        });
        setProviders(providersData);
        setProviderConfigs(configs);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'logs') {
      loadLogs();
    }
    if (activeSection === 'integrations') {
      loadProviders();
    }
  }, [activeSection]);

  useEffect(() => {
    loadProviders();
  }, []);

  const deleteProvider = async () => {
    if (!providerToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`https://functions.poehali.dev/c55cf921-d1ec-4fc7-a6e2-59c730988a1e?provider_code=${providerToDelete.code}`, {
        method: 'DELETE',
        headers: {
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDeleteDialogOpen(false);
        setProviderToDelete(null);
        await loadProviders();
      }
    } catch (error) {
      console.error('Failed to delete provider:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const openProviderConfig = (provider: any) => {
    setSelectedProvider(provider);
    setWappiToken('');
    setWappiProfileId('');
    setConfigDialogOpen(true);
  };

  const saveProviderConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('https://functions.poehali.dev/c55cf921-d1ec-4fc7-a6e2-59c730988a1e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        },
        body: JSON.stringify({
          provider_code: selectedProvider.code,
          wappi_token: wappiToken,
          wappi_profile_id: wappiProfileId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConfigDialogOpen(false);
        setWappiToken('');
        setWappiProfileId('');
        await loadProviders();
      } else {
        console.error('Failed to save config:', data.error);
      }
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setIsSaving(false);
    }
  };

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
              { id: 'integrations', label: 'Интеграции', icon: 'Plug' },
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
                  {activeSection === 'integrations' && 'Интеграции'}
                  {activeSection === 'keys' && 'API Ключи'}
                  {activeSection === 'logs' && 'Логи запросов'}
                  {activeSection === 'settings' && 'Настройки'}
                  {activeSection === 'docs' && 'Документация API'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeSection === 'dashboard' && 'Общая статистика и мониторинг системы'}
                  {activeSection === 'integrations' && 'Подключения к каналам коммуникации'}
                  {activeSection === 'keys' && 'Управление доступом к API'}
                  {activeSection === 'logs' && 'История запросов и событий'}
                  {activeSection === 'settings' && 'Конфигурация системы'}
                  {activeSection === 'docs' && 'API справка и примеры интеграции'}
                </p>
              </div>
              <Button size="sm" className="gap-2" onClick={() => setAddProviderDialogOpen(true)}>
                <Icon name="Plus" size={16} />
                Добавить подключение
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

              {activeSection === 'integrations' && (
                <>
                  {isLoadingProviders ? (
                    <div className="flex items-center justify-center py-12">
                      <Icon name="Loader2" size={32} className="animate-spin text-primary" />
                    </div>
                  ) : providers.length === 0 ? (
                    <div className="text-center py-12">
                      <Icon name="Inbox" size={48} className="mx-auto mb-3 opacity-50 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">Подключения не найдены</p>
                      <Button onClick={() => setAddProviderDialogOpen(true)}>
                        <Icon name="Plus" size={16} className="mr-2" />
                        Добавить первое подключение
                      </Button>
                    </div>
                  ) : (
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
                      {provider.usesWappi && (
                        <div className="mb-3 px-3 py-2 bg-primary/10 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Icon name="Zap" size={14} className="text-primary" />
                            <span className="text-xs font-medium text-primary">Работает через Wappi</span>
                          </div>
                        </div>
                      )}
                      {providerConfigs[provider.code] && (
                        <div className="mb-3 flex items-center gap-2">
                          <div className="flex-1 px-3 py-2 bg-green-500/10 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Icon name="CheckCircle" size={14} className="text-green-500" />
                              <span className="text-xs font-medium text-green-500">Настроено</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => openProviderConfig(provider)}
                        >
                          <Icon name="Settings" size={16} className="mr-2" />
                          Настроить
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Icon name="MoreVertical" size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openProviderConfig(provider)}>
                              <Icon name="Settings" size={14} className="mr-2" />
                              Настроить
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                // TODO: Implement view logs
                              }}
                            >
                              <Icon name="FileText" size={14} className="mr-2" />
                              Логи
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setProviderToDelete(provider);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Icon name="Trash2" size={14} className="mr-2" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                      ))}
                    </div>
                  )}
                </>
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
                      <Button variant="outline" size="sm" onClick={loadLogs} disabled={isLoadingLogs}>
                        <Icon name={isLoadingLogs ? "Loader2" : "RefreshCw"} size={16} className={isLoadingLogs ? "animate-spin mr-2" : "mr-2"} />
                        Обновить
                      </Button>
                    </div>
                  </div>
                  {isLoadingLogs ? (
                    <div className="flex items-center justify-center py-12">
                      <Icon name="Loader2" size={32} className="animate-spin text-primary" />
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Icon name="Inbox" size={48} className="mx-auto mb-3 opacity-50" />
                      <p>Логов пока нет</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-border">
                          <tr className="text-left text-sm text-muted-foreground">
                            <th className="pb-3 font-medium">ID Сообщения</th>
                            <th className="pb-3 font-medium">Получатель</th>
                            <th className="pb-3 font-medium">Провайдер</th>
                            <th className="pb-3 font-medium">Статус</th>
                            <th className="pb-3 font-medium">Попытки</th>
                            <th className="pb-3 font-medium">Создано</th>
                            <th className="pb-3 font-medium">Действия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map((log) => (
                            <tr key={log.message_id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                              <td className="py-3 text-xs font-mono">{log.message_id}</td>
                              <td className="py-3 text-sm">{log.recipient}</td>
                              <td className="py-3 text-sm">{log.provider}</td>
                              <td className="py-3">
                                <Badge variant={log.status === 'delivered' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
                                  {log.status}
                                </Badge>
                              </td>
                              <td className="py-3 text-sm">{log.attempts} / {log.max_attempts}</td>
                              <td className="py-3 text-sm text-muted-foreground">
                                {new Date(log.created_at).toLocaleString('ru-RU')}
                              </td>
                              <td className="py-3">
                                {log.status === 'failed' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => retryMessage(log.message_id)}
                                    disabled={retryingMessage === log.message_id}
                                  >
                                    {retryingMessage === log.message_id ? (
                                      <Icon name="Loader2" size={14} className="animate-spin" />
                                    ) : (
                                      <>
                                        <Icon name="RotateCw" size={14} className="mr-1" />
                                        Переотправить
                                      </>
                                    )}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedProvider && (
                <>
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon name={selectedProvider.icon} size={20} className="text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Настройка {selectedProvider.name}</span>
                    {providerConfigs[selectedProvider.code] && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        <Icon name="CheckCircle" size={12} className="mr-1" />
                        Настроено
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedProvider?.usesWappi ? (
                <>
                  {providerConfigs[selectedProvider.code] 
                    ? `Обновите настройки интеграции ${selectedProvider.name} с Wappi.`
                    : `Для работы ${selectedProvider.name} требуется настроить интеграцию с Wappi.`
                  }
                  <br />
                  <a 
                    href="https://wappi.pro" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 mt-2"
                  >
                    Получить ключи в личном кабинете Wappi
                    <Icon name="ExternalLink" size={14} />
                  </a>
                </>
              ) : (
                `Настройте параметры подключения для ${selectedProvider?.name}`
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedProvider?.usesWappi ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="wappi-token">API Token</Label>
                <Input
                  id="wappi-token"
                  placeholder="Введите токен Wappi"
                  value={wappiToken}
                  onChange={(e) => setWappiToken(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Токен авторизации из личного кабинета wappi.pro
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wappi-profile">Profile ID</Label>
                <Input
                  id="wappi-profile"
                  placeholder="Введите ID профиля"
                  value={wappiProfileId}
                  onChange={(e) => setWappiProfileId(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Идентификатор профиля для работы с API
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <Icon name="Info" size={20} className="text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Как получить данные:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Зайдите на wappi.pro</li>
                      <li>Откройте раздел "Настройки API"</li>
                      <li>Скопируйте Token и Profile ID</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Настройки для этого провайдера будут доступны позже.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfigDialogOpen(false)}
              disabled={isSaving}
            >
              Отмена
            </Button>
            {selectedProvider?.usesWappi && (
              <Button 
                onClick={saveProviderConfig}
                disabled={!wappiToken || !wappiProfileId || isSaving}
              >
                {isSaving ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Icon name="Check" size={16} className="mr-2" />
                    Сохранить
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addProviderDialogOpen} onOpenChange={setAddProviderDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="Plus" size={20} className="text-primary" />
              </div>
              <span>Добавить подключение</span>
            </DialogTitle>
            <DialogDescription>
              Выберите провайдера и настройте подключение к каналу связи
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="provider-name">Название подключения</Label>
              <Input
                id="provider-name"
                placeholder="WhatsApp Business"
                value={newProviderName}
                onChange={(e) => setNewProviderName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Отображаемое имя подключения в интерфейсе
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider-code">Код для API</Label>
              <Input
                id="provider-code"
                placeholder="whatsapp_business"
                value={newProviderCode}
                onChange={(e) => setNewProviderCode(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Уникальный идентификатор для использования в API запросах
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider-type">Провайдер</Label>
              <Select value={newProviderType} onValueChange={setNewProviderType}>
                <SelectTrigger id="provider-type">
                  <SelectValue placeholder="Выберите провайдера" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wappi">Wappi (WhatsApp, Telegram, MAX)</SelectItem>
                  <SelectItem value="sms">SMS Gateway</SelectItem>
                  <SelectItem value="email">Email SMTP</SelectItem>
                  <SelectItem value="push">Push Notifications</SelectItem>
                  <SelectItem value="custom">Другой / Custom</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Провайдер для отправки сообщений
              </p>
            </div>

            {newProviderType === 'wappi' && (
              <>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-start gap-3">
                    <Icon name="Info" size={20} className="text-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">Настройки Wappi:</p>
                      <p className="text-muted-foreground mb-2">
                        Для работы через Wappi необходимо указать API токен и Profile ID
                      </p>
                      <a 
                        href="https://wappi.pro" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Получить ключи в личном кабинете
                        <Icon name="ExternalLink" size={12} />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-wappi-token">API Token</Label>
                  <Input
                    id="new-wappi-token"
                    placeholder="Введите токен Wappi"
                    value={newProviderWappiToken}
                    onChange={(e) => setNewProviderWappiToken(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-wappi-profile">Profile ID</Label>
                  <Input
                    id="new-wappi-profile"
                    placeholder="Введите ID профиля"
                    value={newProviderWappiProfileId}
                    onChange={(e) => setNewProviderWappiProfileId(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </>
            )}

            {newProviderType && newProviderType !== 'wappi' && (
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <Icon name="AlertCircle" size={20} className="text-yellow-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Дополнительная интеграция:</p>
                    <p className="text-muted-foreground">
                      Для работы с этим провайдером потребуется дополнительная настройка в коде бэкенда
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setAddProviderDialogOpen(false);
                setNewProviderName('');
                setNewProviderCode('');
                setNewProviderType('');
                setNewProviderWappiToken('');
                setNewProviderWappiProfileId('');
              }}
              disabled={isSaving}
            >
              Отмена
            </Button>
            <Button 
              onClick={async () => {
                if (!newProviderName || !newProviderCode || !newProviderType) {
                  return;
                }
                
                if (newProviderType === 'wappi' && (!newProviderWappiToken || !newProviderWappiProfileId)) {
                  return;
                }

                setIsSaving(true);
                try {
                  const config: any = {};
                  
                  if (newProviderType === 'wappi') {
                    config.wappi_token = newProviderWappiToken;
                    config.wappi_profile_id = newProviderWappiProfileId;
                  }

                  const response = await fetch('https://functions.poehali.dev/c55cf921-d1ec-4fc7-a6e2-59c730988a1e', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
                    },
                    body: JSON.stringify({
                      provider_code: newProviderCode,
                      provider_name: newProviderName,
                      provider_type: newProviderType,
                      ...config
                    })
                  });
                  
                  const data = await response.json();
                  
                  if (data.success) {
                    setAddProviderDialogOpen(false);
                    setNewProviderName('');
                    setNewProviderCode('');
                    setNewProviderType('');
                    setNewProviderWappiToken('');
                    setNewProviderWappiProfileId('');
                    await loadProviders();
                  }
                } catch (error) {
                  console.error('Failed to add provider:', error);
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={
                !newProviderName || 
                !newProviderCode || 
                !newProviderType || 
                (newProviderType === 'wappi' && (!newProviderWappiToken || !newProviderWappiProfileId)) ||
                isSaving
              }
            >
              {isSaving ? (
                <>
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  Добавление...
                </>
              ) : (
                <>
                  <Icon name="Check" size={16} className="mr-2" />
                  Добавить подключение
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                <Icon name="AlertTriangle" size={20} className="text-destructive" />
              </div>
              <span>Удалить подключение?</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              {providerToDelete && (
                <>
                  Вы действительно хотите удалить подключение <strong>{providerToDelete.name}</strong>?
                  <br />
                  <br />
                  Это действие нельзя отменить. Все настройки и история отправок будут утеряны.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteProvider();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                <>
                  <Icon name="Trash2" size={16} className="mr-2" />
                  Удалить
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;