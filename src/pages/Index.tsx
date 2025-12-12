import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import IntegrationsSection from '@/components/sections/IntegrationsSection';
import ApiKeysSection from '@/components/sections/ApiKeysSection';
import LogsSection from '@/components/sections/LogsSection';
import DashboardSection from '@/components/sections/DashboardSection';
import SandboxSection from '@/components/sections/SandboxSection';
import { useProviders } from '@/hooks/useProviders';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useLogs } from '@/hooks/useLogs';

const Index = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  
  const providers = useProviders();
  const apiKeys = useApiKeys();
  const logs = useLogs();

  useEffect(() => {
    if (activeSection === 'logs') {
      logs.loadLogs();
    }
    if (activeSection === 'integrations') {
      providers.loadProviders();
    }
    if (activeSection === 'keys') {
      apiKeys.loadApiKeys();
    }
  }, [activeSection]);

  useEffect(() => {
    providers.loadProviders();
    apiKeys.loadApiKeys();
    logs.loadLogs();
  }, []);

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
              { id: 'sandbox', label: 'Песочница', icon: 'Send' },
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
                  {activeSection === 'sandbox' && 'Песочница'}
                  {activeSection === 'logs' && 'Логи запросов'}
                  {activeSection === 'settings' && 'Настройки'}
                  {activeSection === 'docs' && 'Документация API'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeSection === 'dashboard' && 'Общая статистика и мониторинг системы'}
                  {activeSection === 'integrations' && 'Подключения к каналам коммуникации'}
                  {activeSection === 'keys' && 'Управление доступом к API'}
                  {activeSection === 'sandbox' && 'Тестирование отправки сообщений'}
                  {activeSection === 'logs' && 'История запросов и событий'}
                  {activeSection === 'settings' && 'Конфигурация системы'}
                  {activeSection === 'docs' && 'API справка и примеры интеграции'}
                </p>
              </div>
              {activeSection === 'integrations' && (
                <Button size="sm" className="gap-2" onClick={() => providers.setAddProviderDialogOpen(true)}>
                  <Icon name="Plus" size={16} />
                  Добавить подключение
                </Button>
              )}
              {activeSection === 'keys' && (
                <Button size="sm" className="gap-2" onClick={() => apiKeys.setCreateKeyDialogOpen(true)}>
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
                  providers={providers.providers}
                  logs={logs.logs}
                />
              )}

              {activeSection === 'integrations' && (
                <IntegrationsSection
                  providers={providers.providers}
                  isLoadingProviders={providers.isLoadingProviders}
                  providerConfigs={providers.providerConfigs}
                  configDialogOpen={providers.configDialogOpen}
                  setConfigDialogOpen={providers.setConfigDialogOpen}
                  selectedProvider={providers.selectedProvider}
                  editProviderCode={providers.editProviderCode}
                  setEditProviderCode={providers.setEditProviderCode}
                  wappiToken={providers.wappiToken}
                  setWappiToken={providers.setWappiToken}
                  wappiProfileId={providers.wappiProfileId}
                  setWappiProfileId={providers.setWappiProfileId}
                  postboxAccessKey={providers.postboxAccessKey}
                  setPostboxAccessKey={providers.setPostboxAccessKey}
                  postboxSecretKey={providers.postboxSecretKey}
                  setPostboxSecretKey={providers.setPostboxSecretKey}
                  postboxFromEmail={providers.postboxFromEmail}
                  setPostboxFromEmail={providers.setPostboxFromEmail}
                  fcmProjectId={providers.fcmProjectId}
                  setFcmProjectId={providers.setFcmProjectId}
                  fcmPrivateKey={providers.fcmPrivateKey}
                  setFcmPrivateKey={providers.setFcmPrivateKey}
                  fcmClientEmail={providers.fcmClientEmail}
                  setFcmClientEmail={providers.setFcmClientEmail}
                  isSaving={providers.isSaving}
                  setIsSaving={providers.setIsSaving}
                  addProviderDialogOpen={providers.addProviderDialogOpen}
                  setAddProviderDialogOpen={providers.setAddProviderDialogOpen}
                  newProviderName={providers.newProviderName}
                  setNewProviderName={providers.setNewProviderName}
                  newProviderCode={providers.newProviderCode}
                  setNewProviderCode={providers.setNewProviderCode}
                  newProviderType={providers.newProviderType}
                  setNewProviderType={providers.setNewProviderType}
                  newProviderWappiToken={providers.newProviderWappiToken}
                  setNewProviderWappiToken={providers.setNewProviderWappiToken}
                  newProviderWappiProfileId={providers.newProviderWappiProfileId}
                  setNewProviderWappiProfileId={providers.setNewProviderWappiProfileId}
                  newProviderPostboxAccessKey={providers.newProviderPostboxAccessKey}
                  setNewProviderPostboxAccessKey={providers.setNewProviderPostboxAccessKey}
                  newProviderPostboxSecretKey={providers.newProviderPostboxSecretKey}
                  setNewProviderPostboxSecretKey={providers.setNewProviderPostboxSecretKey}
                  newProviderPostboxFromEmail={providers.newProviderPostboxFromEmail}
                  setNewProviderPostboxFromEmail={providers.setNewProviderPostboxFromEmail}
                  newProviderFcmProjectId={providers.newProviderFcmProjectId}
                  setNewProviderFcmProjectId={providers.setNewProviderFcmProjectId}
                  newProviderFcmPrivateKey={providers.newProviderFcmPrivateKey}
                  setNewProviderFcmPrivateKey={providers.setNewProviderFcmPrivateKey}
                  newProviderFcmClientEmail={providers.newProviderFcmClientEmail}
                  setNewProviderFcmClientEmail={providers.setNewProviderFcmClientEmail}
                  newProviderApnsTeamId={providers.newProviderApnsTeamId}
                  setNewProviderApnsTeamId={providers.setNewProviderApnsTeamId}
                  newProviderApnsKeyId={providers.newProviderApnsKeyId}
                  setNewProviderApnsKeyId={providers.setNewProviderApnsKeyId}
                  newProviderApnsPrivateKey={providers.newProviderApnsPrivateKey}
                  setNewProviderApnsPrivateKey={providers.setNewProviderApnsPrivateKey}
                  newProviderApnsBundleId={providers.newProviderApnsBundleId}
                  setNewProviderApnsBundleId={providers.setNewProviderApnsBundleId}
                  deleteDialogOpen={providers.deleteDialogOpen}
                  setDeleteDialogOpen={providers.setDeleteDialogOpen}
                  providerToDelete={providers.providerToDelete}
                  setProviderToDelete={providers.setProviderToDelete}
                  isDeleting={providers.isDeleting}
                  openProviderConfig={providers.openProviderConfig}
                  saveProviderConfig={providers.saveProviderConfig}
                  deleteProvider={providers.deleteProvider}
                  loadProviders={providers.loadProviders}
                />
              )}

              {activeSection === 'keys' && (
                <ApiKeysSection
                  apiKeys={apiKeys.apiKeys}
                  isLoadingKeys={apiKeys.isLoadingKeys}
                  createKeyDialogOpen={apiKeys.createKeyDialogOpen}
                  setCreateKeyDialogOpen={apiKeys.setCreateKeyDialogOpen}
                  newKeyName={apiKeys.newKeyName}
                  setNewKeyName={apiKeys.setNewKeyName}
                  newKeyExpiry={apiKeys.newKeyExpiry}
                  setNewKeyExpiry={apiKeys.setNewKeyExpiry}
                  isCreatingKey={apiKeys.isCreatingKey}
                  setIsCreatingKey={apiKeys.setIsCreatingKey}
                  createdKey={apiKeys.createdKey}
                  setCreatedKey={apiKeys.setCreatedKey}
                  regenerateKeyDialogOpen={apiKeys.regenerateKeyDialogOpen}
                  setRegenerateKeyDialogOpen={apiKeys.setRegenerateKeyDialogOpen}
                  keyToRegenerate={apiKeys.keyToRegenerate}
                  setKeyToRegenerate={apiKeys.setKeyToRegenerate}
                  isRegeneratingKey={apiKeys.isRegeneratingKey}
                  setIsRegeneratingKey={apiKeys.setIsRegeneratingKey}
                  regeneratedKey={apiKeys.regeneratedKey}
                  setRegeneratedKey={apiKeys.setRegeneratedKey}
                  deleteKeyDialogOpen={apiKeys.deleteKeyDialogOpen}
                  setDeleteKeyDialogOpen={apiKeys.setDeleteKeyDialogOpen}
                  keyToDelete={apiKeys.keyToDelete}
                  setKeyToDelete={apiKeys.setKeyToDelete}
                  isDeletingKey={apiKeys.isDeletingKey}
                  setIsDeletingKey={apiKeys.setIsDeletingKey}
                  loadApiKeys={apiKeys.loadApiKeys}
                />
              )}

              {activeSection === 'sandbox' && (
                <SandboxSection
                  providers={providers.providers}
                />
              )}

              {activeSection === 'logs' && (
                <LogsSection
                  logs={logs.logs}
                  isLoadingLogs={logs.isLoadingLogs}
                  retryingMessage={logs.retryingMessage}
                  loadLogs={logs.loadLogs}
                  retryMessage={logs.retryMessage}
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