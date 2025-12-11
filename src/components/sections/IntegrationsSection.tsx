import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import ProviderCard from '@/components/integrations/ProviderCard';
import ProviderConfigDialog from '@/components/integrations/ProviderConfigDialog';
import AddProviderDialog from '@/components/integrations/AddProviderDialog';
import DeleteProviderDialog from '@/components/integrations/DeleteProviderDialog';

interface IntegrationsSectionProps {
  providers: any[];
  isLoadingProviders: boolean;
  providerConfigs: Record<string, boolean>;
  configDialogOpen: boolean;
  setConfigDialogOpen: (open: boolean) => void;
  selectedProvider: any;
  wappiToken: string;
  setWappiToken: (token: string) => void;
  wappiProfileId: string;
  setWappiProfileId: (id: string) => void;
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
  addProviderDialogOpen: boolean;
  setAddProviderDialogOpen: (open: boolean) => void;
  newProviderName: string;
  setNewProviderName: (name: string) => void;
  newProviderType: string;
  setNewProviderType: (type: string) => void;
  newProviderWappiToken: string;
  setNewProviderWappiToken: (token: string) => void;
  newProviderWappiProfileId: string;
  setNewProviderWappiProfileId: (id: string) => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  providerToDelete: any;
  setProviderToDelete: (provider: any) => void;
  isDeleting: boolean;
  openProviderConfig: (provider: any) => void;
  saveProviderConfig: () => void;
  deleteProvider: () => void;
  loadProviders: () => void;
}

const IntegrationsSection = ({
  providers,
  isLoadingProviders,
  providerConfigs,
  configDialogOpen,
  setConfigDialogOpen,
  selectedProvider,
  wappiToken,
  setWappiToken,
  wappiProfileId,
  setWappiProfileId,
  isSaving,
  setIsSaving,
  addProviderDialogOpen,
  setAddProviderDialogOpen,
  newProviderName,
  setNewProviderName,
  newProviderType,
  setNewProviderType,
  newProviderWappiToken,
  setNewProviderWappiToken,
  newProviderWappiProfileId,
  setNewProviderWappiProfileId,
  deleteDialogOpen,
  setDeleteDialogOpen,
  providerToDelete,
  setProviderToDelete,
  isDeleting,
  openProviderConfig,
  saveProviderConfig,
  deleteProvider,
  loadProviders
}: IntegrationsSectionProps) => {
  return (
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
            <ProviderCard
              key={provider.id}
              provider={provider}
              openProviderConfig={openProviderConfig}
              setProviderToDelete={setProviderToDelete}
              setDeleteDialogOpen={setDeleteDialogOpen}
            />
          ))}
        </div>
      )}

      <ProviderConfigDialog
        configDialogOpen={configDialogOpen}
        setConfigDialogOpen={setConfigDialogOpen}
        selectedProvider={selectedProvider}
        providerConfigs={providerConfigs}
        wappiToken={wappiToken}
        setWappiToken={setWappiToken}
        wappiProfileId={wappiProfileId}
        setWappiProfileId={setWappiProfileId}
        isSaving={isSaving}
        saveProviderConfig={saveProviderConfig}
      />

      <AddProviderDialog
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
        isSaving={isSaving}
        setIsSaving={setIsSaving}
        loadProviders={loadProviders}
      />

      <DeleteProviderDialog
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        providerToDelete={providerToDelete}
        isDeleting={isDeleting}
        deleteProvider={deleteProvider}
      />
    </>
  );
};

export default IntegrationsSection;