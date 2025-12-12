import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EditWappiConfig from './provider-edit-configs/EditWappiConfig';
import EditPostboxConfig from './provider-edit-configs/EditPostboxConfig';
import EditFcmConfig from './provider-edit-configs/EditFcmConfig';
import EditApnsConfig from './provider-edit-configs/EditApnsConfig';

interface ProviderConfigDialogProps {
  configDialogOpen: boolean;
  setConfigDialogOpen: (open: boolean) => void;
  selectedProvider: any;
  editProviderCode: string;
  setEditProviderCode: (code: string) => void;
  providerConfigs: Record<string, boolean>;
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
  isSaving: boolean;
  saveProviderConfig: () => void;
}

const ProviderConfigDialog = ({
  configDialogOpen,
  setConfigDialogOpen,
  selectedProvider,
  editProviderCode,
  setEditProviderCode,
  providerConfigs,
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
  isSaving,
  saveProviderConfig
}: ProviderConfigDialogProps) => {
  const handleFcmConfigUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.project_id) setFcmProjectId(json.project_id);
        if (json.private_key) setFcmPrivateKey(json.private_key);
        if (json.client_email) setFcmClientEmail(json.client_email);
      } catch (error) {
        console.error('Ошибка парсинга JSON:', error);
      }
    };
    reader.readAsText(file);
  };

  const handleApnsKeyUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setApnsPrivateKey(content);
      } catch (error) {
        console.error('Ошибка чтения файла:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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

        {selectedProvider?.usesWappi && (
          <EditWappiConfig
            editProviderCode={editProviderCode}
            setEditProviderCode={setEditProviderCode}
            wappiToken={wappiToken}
            setWappiToken={setWappiToken}
            wappiProfileId={wappiProfileId}
            setWappiProfileId={setWappiProfileId}
          />
        )}

        {selectedProvider?.usesPostbox && (
          <EditPostboxConfig
            editProviderCode={editProviderCode}
            setEditProviderCode={setEditProviderCode}
            postboxAccessKey={postboxAccessKey}
            setPostboxAccessKey={setPostboxAccessKey}
            postboxSecretKey={postboxSecretKey}
            setPostboxSecretKey={setPostboxSecretKey}
            postboxFromEmail={postboxFromEmail}
            setPostboxFromEmail={setPostboxFromEmail}
          />
        )}

        {selectedProvider?.usesFcm && (
          <EditFcmConfig
            editProviderCode={editProviderCode}
            setEditProviderCode={setEditProviderCode}
            fcmProjectId={fcmProjectId}
            setFcmProjectId={setFcmProjectId}
            fcmPrivateKey={fcmPrivateKey}
            setFcmPrivateKey={setFcmPrivateKey}
            fcmClientEmail={fcmClientEmail}
            setFcmClientEmail={setFcmClientEmail}
            handleFcmConfigUpload={handleFcmConfigUpload}
          />
        )}

        {selectedProvider?.usesApns && (
          <EditApnsConfig
            editProviderCode={editProviderCode}
            setEditProviderCode={setEditProviderCode}
            apnsTeamId={apnsTeamId}
            setApnsTeamId={setApnsTeamId}
            apnsKeyId={apnsKeyId}
            setApnsKeyId={setApnsKeyId}
            apnsPrivateKey={apnsPrivateKey}
            setApnsPrivateKey={setApnsPrivateKey}
            apnsBundleId={apnsBundleId}
            setApnsBundleId={setApnsBundleId}
            handleApnsKeyUpload={handleApnsKeyUpload}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setConfigDialogOpen(false)} disabled={isSaving}>
            Отмена
          </Button>
          <Button 
            onClick={saveProviderConfig} 
            disabled={
              isSaving || 
              (selectedProvider?.usesWappi && (!wappiToken || !wappiProfileId)) ||
              (selectedProvider?.usesPostbox && (!postboxAccessKey || !postboxSecretKey || !postboxFromEmail)) ||
              (selectedProvider?.usesFcm && (!fcmProjectId || !fcmPrivateKey || !fcmClientEmail)) ||
              (selectedProvider?.usesApns && (!apnsTeamId || !apnsKeyId || !apnsPrivateKey || !apnsBundleId))
            }
          >
            {isSaving ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Icon name="Save" size={16} className="mr-2" />
                Сохранить настройки
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProviderConfigDialog;
