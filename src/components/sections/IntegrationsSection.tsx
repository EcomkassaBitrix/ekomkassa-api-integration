import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import ProviderCard from '@/components/integrations/ProviderCard';
import ProviderConfigDialog from '@/components/integrations/ProviderConfigDialog';
import AddProviderDialog from '@/components/integrations/AddProviderDialog';
import DeleteProviderDialog from '@/components/integrations/DeleteProviderDialog';

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

interface IntegrationsSectionProps {
  providers: Provider[];
  isLoadingProviders: boolean;
  providerConfigs: Record<string, boolean>;
  configDialogOpen: boolean;
  setConfigDialogOpen: (open: boolean) => void;
  selectedProvider: Provider | null;
  editProviderCode: string;
  setEditProviderCode: (code: string) => void;
  wappiToken: string;
  setWappiToken: (token: string) => void;
  wappiProfileId: string;
  setWappiProfileId: (id: string) => void;
  postboxAccessKey: string;
  setPostboxAccessKey: (key: string) => void;
  postboxSecretKey: string;
  setPostboxSecretKey: (key: string) => void;
  postboxFromEmail: string;
  setPostboxFromEmail: (email: string) => void;
  fcmProjectId: string;
  setFcmProjectId: (id: string) => void;
  fcmPrivateKey: string;
  setFcmPrivateKey: (key: string) => void;
  fcmClientEmail: string;
  setFcmClientEmail: (email: string) => void;
  apnsTeamId: string;
  setApnsTeamId: (id: string) => void;
  apnsKeyId: string;
  setApnsKeyId: (id: string) => void;
  apnsPrivateKey: string;
  setApnsPrivateKey: (key: string) => void;
  apnsBundleId: string;
  setApnsBundleId: (id: string) => void;
  smsAeroEmail: string;
  setSmsAeroEmail: (val: string) => void;
  smsAeroApiKey: string;
  setSmsAeroApiKey: (val: string) => void;
  smsAeroSign: string;
  setSmsAeroSign: (val: string) => void;
  tgApiId: string;
  setTgApiId: (val: string) => void;
  tgApiHash: string;
  setTgApiHash: (val: string) => void;
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
  addProviderDialogOpen: boolean;
  setAddProviderDialogOpen: (open: boolean) => void;
  newProviderName: string;
  setNewProviderName: (name: string) => void;
  newProviderCode: string;
  setNewProviderCode: (code: string) => void;
  newProviderType: string;
  setNewProviderType: (type: string) => void;
  newProviderWappiToken: string;
  setNewProviderWappiToken: (token: string) => void;
  newProviderWappiProfileId: string;
  setNewProviderWappiProfileId: (id: string) => void;
  newProviderPostboxAccessKey: string;
  setNewProviderPostboxAccessKey: (key: string) => void;
  newProviderPostboxSecretKey: string;
  setNewProviderPostboxSecretKey: (key: string) => void;
  newProviderPostboxFromEmail: string;
  setNewProviderPostboxFromEmail: (email: string) => void;
  newProviderFcmProjectId: string;
  setNewProviderFcmProjectId: (id: string) => void;
  newProviderFcmPrivateKey: string;
  setNewProviderFcmPrivateKey: (key: string) => void;
  newProviderFcmClientEmail: string;
  setNewProviderFcmClientEmail: (email: string) => void;
  newProviderApnsTeamId: string;
  setNewProviderApnsTeamId: (id: string) => void;
  newProviderApnsKeyId: string;
  setNewProviderApnsKeyId: (id: string) => void;
  newProviderApnsPrivateKey: string;
  setNewProviderApnsPrivateKey: (key: string) => void;
  newProviderApnsBundleId: string;
  setNewProviderApnsBundleId: (id: string) => void;
  newProviderTgApiId?: string;
  setNewProviderTgApiId?: (val: string) => void;
  newProviderTgApiHash?: string;
  setNewProviderTgApiHash?: (val: string) => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  providerToDelete: Provider | null;
  setProviderToDelete: (provider: Provider | null) => void;
  isDeleting: boolean;
  openProviderConfig: (provider: Provider) => void;
  saveProviderConfig: () => Promise<string | null>;
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
  editProviderCode,
  setEditProviderCode,
  wappiToken,
  setWappiToken,
  wappiProfileId,
  setWappiProfileId,
  postboxAccessKey,
  setPostboxAccessKey,
  postboxSecretKey,
  setPostboxSecretKey,
  postboxFromEmail,
  setPostboxFromEmail,
  fcmProjectId,
  setFcmProjectId,
  fcmPrivateKey,
  setFcmPrivateKey,
  fcmClientEmail,
  setFcmClientEmail,
  apnsTeamId,
  setApnsTeamId,
  apnsKeyId,
  setApnsKeyId,
  apnsPrivateKey,
  setApnsPrivateKey,
  apnsBundleId,
  setApnsBundleId,
  smsAeroEmail,
  setSmsAeroEmail,
  smsAeroApiKey,
  setSmsAeroApiKey,
  smsAeroSign,
  setSmsAeroSign,
  tgApiId = '',
  setTgApiId = () => {},
  tgApiHash = '',
  setTgApiHash = () => {},
  isSaving,
  setIsSaving,
  addProviderDialogOpen,
  setAddProviderDialogOpen,
  newProviderName,
  setNewProviderName,
  newProviderCode,
  setNewProviderCode,
  newProviderType,
  setNewProviderType,
  newProviderWappiToken,
  setNewProviderWappiToken,
  newProviderWappiProfileId,
  setNewProviderWappiProfileId,
  newProviderPostboxAccessKey,
  setNewProviderPostboxAccessKey,
  newProviderPostboxSecretKey,
  setNewProviderPostboxSecretKey,
  newProviderPostboxFromEmail,
  setNewProviderPostboxFromEmail,
  newProviderFcmProjectId,
  setNewProviderFcmProjectId,
  newProviderFcmPrivateKey,
  setNewProviderFcmPrivateKey,
  newProviderFcmClientEmail,
  setNewProviderFcmClientEmail,
  newProviderApnsTeamId,
  setNewProviderApnsTeamId,
  newProviderApnsKeyId,
  setNewProviderApnsKeyId,
  newProviderApnsPrivateKey,
  setNewProviderApnsPrivateKey,
  newProviderApnsBundleId,
  setNewProviderApnsBundleId,
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
        editProviderCode={editProviderCode}
        setEditProviderCode={setEditProviderCode}
        providerConfigs={providerConfigs}
        wappiToken={wappiToken}
        setWappiToken={setWappiToken}
        wappiProfileId={wappiProfileId}
        setWappiProfileId={setWappiProfileId}
        postboxAccessKey={postboxAccessKey}
        setPostboxAccessKey={setPostboxAccessKey}
        postboxSecretKey={postboxSecretKey}
        setPostboxSecretKey={setPostboxSecretKey}
        postboxFromEmail={postboxFromEmail}
        setPostboxFromEmail={setPostboxFromEmail}
        fcmProjectId={fcmProjectId}
        setFcmProjectId={setFcmProjectId}
        fcmPrivateKey={fcmPrivateKey}
        setFcmPrivateKey={setFcmPrivateKey}
        fcmClientEmail={fcmClientEmail}
        setFcmClientEmail={setFcmClientEmail}
        apnsTeamId={apnsTeamId}
        setApnsTeamId={setApnsTeamId}
        apnsKeyId={apnsKeyId}
        setApnsKeyId={setApnsKeyId}
        apnsPrivateKey={apnsPrivateKey}
        setApnsPrivateKey={setApnsPrivateKey}
        apnsBundleId={apnsBundleId}
        setApnsBundleId={setApnsBundleId}
        smsAeroEmail={smsAeroEmail}
        setSmsAeroEmail={setSmsAeroEmail}
        smsAeroApiKey={smsAeroApiKey}
        setSmsAeroApiKey={setSmsAeroApiKey}
        smsAeroSign={smsAeroSign}
        setSmsAeroSign={setSmsAeroSign}
        tgApiId={tgApiId}
        setTgApiId={setTgApiId}
        tgApiHash={tgApiHash}
        setTgApiHash={setTgApiHash}
        isSaving={isSaving}
        saveProviderConfig={saveProviderConfig}
      />

      <AddProviderDialog
        addProviderDialogOpen={addProviderDialogOpen}
        setAddProviderDialogOpen={setAddProviderDialogOpen}
        newProviderName={newProviderName}
        setNewProviderName={setNewProviderName}
        newProviderCode={newProviderCode}
        setNewProviderCode={setNewProviderCode}
        newProviderType={newProviderType}
        setNewProviderType={setNewProviderType}
        newProviderWappiToken={newProviderWappiToken}
        setNewProviderWappiToken={setNewProviderWappiToken}
        newProviderWappiProfileId={newProviderWappiProfileId}
        setNewProviderWappiProfileId={setNewProviderWappiProfileId}
        newProviderPostboxAccessKey={newProviderPostboxAccessKey}
        setNewProviderPostboxAccessKey={setNewProviderPostboxAccessKey}
        newProviderPostboxSecretKey={newProviderPostboxSecretKey}
        setNewProviderPostboxSecretKey={setNewProviderPostboxSecretKey}
        newProviderPostboxFromEmail={newProviderPostboxFromEmail}
        setNewProviderPostboxFromEmail={setNewProviderPostboxFromEmail}
        newProviderFcmProjectId={newProviderFcmProjectId}
        setNewProviderFcmProjectId={setNewProviderFcmProjectId}
        newProviderFcmPrivateKey={newProviderFcmPrivateKey}
        setNewProviderFcmPrivateKey={setNewProviderFcmPrivateKey}
        newProviderFcmClientEmail={newProviderFcmClientEmail}
        setNewProviderFcmClientEmail={setNewProviderFcmClientEmail}
        newProviderApnsTeamId={newProviderApnsTeamId}
        setNewProviderApnsTeamId={setNewProviderApnsTeamId}
        newProviderApnsKeyId={newProviderApnsKeyId}
        setNewProviderApnsKeyId={setNewProviderApnsKeyId}
        newProviderApnsPrivateKey={newProviderApnsPrivateKey}
        setNewProviderApnsPrivateKey={setNewProviderApnsPrivateKey}
        newProviderApnsBundleId={newProviderApnsBundleId}
        setNewProviderApnsBundleId={setNewProviderApnsBundleId}
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