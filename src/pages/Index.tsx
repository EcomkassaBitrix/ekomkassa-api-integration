import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import IntegrationsSection from '@/components/sections/IntegrationsSection';
import ApiKeysSection from '@/components/sections/ApiKeysSection';
import LogsSection from '@/components/sections/LogsSection';
import DashboardSection from '@/components/sections/DashboardSection';

const Index = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [wappiToken, setWappiToken] = useState('');
  const [wappiProfileId, setWappiProfileId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [addProviderDialogOpen, setAddProviderDialogOpen] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderType, setNewProviderType] = useState('');
  const [newProviderWappiToken, setNewProviderWappiToken] = useState('');
  const [newProviderWappiProfileId, setNewProviderWappiProfileId] = useState('');
  
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('never');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  
  const [deleteKeyDialogOpen, setDeleteKeyDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<any>(null);
  const [isDeletingKey, setIsDeletingKey] = useState(false);

  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [regenerateKeyDialogOpen, setRegenerateKeyDialogOpen] = useState(false);
  const [keyToRegenerate, setKeyToRegenerate] = useState<any>(null);
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);
  const [regeneratedKey, setRegeneratedKey] = useState<string | null>(null);

  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [retryingMessage, setRetryingMessage] = useState<string | null>(null);
  const [providerConfigs, setProviderConfigs] = useState<Record<string, boolean>>({});

  const getProviderIcon = (providerType: string, providerCode: string) => {
    if (providerCode.includes('whatsapp')) return 'Phone';
    if (providerCode.includes('telegram')) return 'Send';
    if (providerCode.includes('sms')) return 'MessageSquare';
    if (providerCode.includes('email')) return 'Mail';
    if (providerCode.includes('push')) return 'Bell';
    if (providerCode.includes('wappi') || providerCode.includes('max')) return 'MessageCircle';
    return 'Plug';
  };

  const loadApiKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const response = await fetch('https://functions.poehali.dev/968d5f56-3d5a-4427-90b9-c040acd085d6', {
        headers: {
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        }
      });
      const data = await response.json();
      if (data.success) {
        setApiKeys(data.keys || []);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setIsLoadingKeys(false);
    }
  };

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
          
          let connectionStatus = 'not_configured';
          if (p.connection_status === 'configured') {
            connectionStatus = 'configured';
          } else if (p.connection_status === 'working') {
            connectionStatus = 'working';
          } else if (p.connection_status === 'error') {
            connectionStatus = 'error';
          }
          
          return {
            id: index + 1,
            name: p.provider_name,
            icon: getProviderIcon(p.provider_type, p.provider_code),
            status: connectionStatus,
            requests: 0,
            code: p.provider_code,
            usesWappi: p.provider_type === 'wappi',
            lastAttemptAt: p.last_attempt_at
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
    if (activeSection === 'keys') {
      loadApiKeys();
    }
  }, [activeSection]);

  useEffect(() => {
    loadProviders();
    loadApiKeys();
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
              {activeSection === 'integrations' && (
                <Button size="sm" className="gap-2" onClick={() => setAddProviderDialogOpen(true)}>
                  <Icon name="Plus" size={16} />
                  Добавить подключение
                </Button>
              )}
              {activeSection === 'keys' && (
                <Button size="sm" className="gap-2" onClick={() => setCreateKeyDialogOpen(true)}>
                  <Icon name="Plus" size={16} />
                  Создать ключ
                </Button>
              )}
            </div>
          </header>

          <div className="h-[calc(100vh-80px)] overflow-y-auto">
            <div className="p-8">
              {(activeSection === 'dashboard' || activeSection === 'settings' || activeSection === 'docs') && (
                <DashboardSection 
                  activeSection={activeSection}
                  providers={providers}
                  logs={logs}
                />
              )}

              {activeSection === 'integrations' && (
                <IntegrationsSection
                  providers={providers}
                  isLoadingProviders={isLoadingProviders}
                  providerConfigs={providerConfigs}
                  configDialogOpen={configDialogOpen}
                  setConfigDialogOpen={setConfigDialogOpen}
                  selectedProvider={selectedProvider}
                  wappiToken={wappiToken}
                  setWappiToken={setWappiToken}
                  wappiProfileId={wappiProfileId}
                  setWappiProfileId={setWappiProfileId}
                  isSaving={isSaving}
                  setIsSaving={setIsSaving}
                  addProviderDialogOpen={addProviderDialogOpen}
                  setAddProviderDialogOpen={setAddProviderDialogOpen}
                  newProviderName={newProviderName}
                  setNewProviderName={setNewProviderName}
                  newProviderType={newProviderType}
                  setNewProviderType={setNewProviderType}
                  newProviderWappiToken={newProviderWappiToken}
                  setNewProviderWappiToken={setNewProviderWappiToken}
                  newProviderWappiProfileId={newProviderWappiProfileId}
                  setNewProviderWappiProfileId={setNewProviderWappiProfileId}
                  deleteDialogOpen={deleteDialogOpen}
                  setDeleteDialogOpen={setDeleteDialogOpen}
                  providerToDelete={providerToDelete}
                  setProviderToDelete={setProviderToDelete}
                  isDeleting={isDeleting}
                  openProviderConfig={openProviderConfig}
                  saveProviderConfig={saveProviderConfig}
                  deleteProvider={deleteProvider}
                  loadProviders={loadProviders}
                />
              )}

              {activeSection === 'keys' && (
                <ApiKeysSection
                  apiKeys={apiKeys}
                  isLoadingKeys={isLoadingKeys}
                  createKeyDialogOpen={createKeyDialogOpen}
                  setCreateKeyDialogOpen={setCreateKeyDialogOpen}
                  newKeyName={newKeyName}
                  setNewKeyName={setNewKeyName}
                  newKeyExpiry={newKeyExpiry}
                  setNewKeyExpiry={setNewKeyExpiry}
                  isCreatingKey={isCreatingKey}
                  setIsCreatingKey={setIsCreatingKey}
                  createdKey={createdKey}
                  setCreatedKey={setCreatedKey}
                  regenerateKeyDialogOpen={regenerateKeyDialogOpen}
                  setRegenerateKeyDialogOpen={setRegenerateKeyDialogOpen}
                  keyToRegenerate={keyToRegenerate}
                  setKeyToRegenerate={setKeyToRegenerate}
                  isRegeneratingKey={isRegeneratingKey}
                  setIsRegeneratingKey={setIsRegeneratingKey}
                  regeneratedKey={regeneratedKey}
                  setRegeneratedKey={setRegeneratedKey}
                  deleteKeyDialogOpen={deleteKeyDialogOpen}
                  setDeleteKeyDialogOpen={setDeleteKeyDialogOpen}
                  keyToDelete={keyToDelete}
                  setKeyToDelete={setKeyToDelete}
                  isDeletingKey={isDeletingKey}
                  setIsDeletingKey={setIsDeletingKey}
                  loadApiKeys={loadApiKeys}
                />
              )}

              {activeSection === 'logs' && (
                <LogsSection
                  logs={logs}
                  isLoadingLogs={isLoadingLogs}
                  retryingMessage={retryingMessage}
                  loadLogs={loadLogs}
                  retryMessage={retryMessage}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;