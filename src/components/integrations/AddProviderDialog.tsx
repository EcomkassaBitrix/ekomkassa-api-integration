import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddProviderForm from './AddProviderForm';

interface AddProviderDialogProps {
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
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
  loadProviders: () => void;
}

const AddProviderDialog = ({
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
  isSaving,
  setIsSaving,
  loadProviders
}: AddProviderDialogProps) => {
  const resetForm = () => {
    setNewProviderName('');
    setNewProviderCode('');
    setNewProviderType('');
    setNewProviderWappiToken('');
    setNewProviderWappiProfileId('');
    setNewProviderPostboxAccessKey('');
    setNewProviderPostboxSecretKey('');
    setNewProviderPostboxFromEmail('');
    setNewProviderFcmProjectId('');
    setNewProviderFcmPrivateKey('');
    setNewProviderFcmClientEmail('');
    setNewProviderApnsTeamId('');
    setNewProviderApnsKeyId('');
    setNewProviderApnsPrivateKey('');
    setNewProviderApnsBundleId('');
  };

  const handleCreateProvider = async () => {
    setIsSaving(true);
    try {
      const requestBody: Record<string, string> = {
        provider_name: newProviderName,
        provider_code: newProviderCode,
        provider_type: newProviderType
      };

      if (newProviderType === 'whatsapp_business' || newProviderType === 'telegram_bot' || newProviderType === 'max') {
        requestBody.wappi_token = newProviderWappiToken;
        requestBody.wappi_profile_id = newProviderWappiProfileId;
      }
      if (newProviderType === 'yandex_postbox') {
        requestBody.postbox_access_key = newProviderPostboxAccessKey;
        requestBody.postbox_secret_key = newProviderPostboxSecretKey;
        requestBody.postbox_from_email = newProviderPostboxFromEmail;
      }
      if (newProviderType === 'fcm') {
        requestBody.fcm_project_id = newProviderFcmProjectId;
        requestBody.fcm_private_key = newProviderFcmPrivateKey;
        requestBody.fcm_client_email = newProviderFcmClientEmail;
      }
      if (newProviderType === 'apns') {
        requestBody.apns_team_id = newProviderApnsTeamId;
        requestBody.apns_key_id = newProviderApnsKeyId;
        requestBody.apns_private_key = newProviderApnsPrivateKey;
        requestBody.apns_bundle_id = newProviderApnsBundleId;
      }

      const response = await fetch('https://functions.poehali.dev/c55cf921-d1ec-4fc7-a6e2-59c730988a1e', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.error('HTTP', response.status, ':', await response.text());
        return;
      }

      const data = await response.json();
      if (data.success) {
        setAddProviderDialogOpen(false);
        resetForm();
        await loadProviders();
      } else {
        console.error('Failed to create provider:', data.error);
      }
    } catch (error) {
      console.error('Failed to create provider:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = () => {
    if (!newProviderName || !newProviderCode || !newProviderType) return false;
    if (newProviderType === 'whatsapp_business' || newProviderType === 'telegram_bot' || newProviderType === 'max') {
      return !!(newProviderWappiToken && newProviderWappiProfileId);
    }
    if (newProviderType === 'yandex_postbox') {
      return !!(newProviderPostboxAccessKey && newProviderPostboxSecretKey && newProviderPostboxFromEmail);
    }
    if (newProviderType === 'fcm') {
      return !!(newProviderFcmProjectId && newProviderFcmPrivateKey && newProviderFcmClientEmail);
    }
    if (newProviderType === 'apns') {
      return !!(newProviderApnsTeamId && newProviderApnsKeyId && newProviderApnsPrivateKey && newProviderApnsBundleId);
    }
    return true;
  };

  return (
    <Dialog open={addProviderDialogOpen} onOpenChange={setAddProviderDialogOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

        <AddProviderForm
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
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setAddProviderDialogOpen(false)} disabled={isSaving}>
            Отмена
          </Button>
          <Button onClick={handleCreateProvider} disabled={!isFormValid() || isSaving}>
            {isSaving ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Создание...
              </>
            ) : (
              <>
                <Icon name="Plus" size={16} className="mr-2" />
                Создать подключение
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddProviderDialog;
