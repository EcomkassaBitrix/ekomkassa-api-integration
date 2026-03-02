import ProviderBaseFields from './provider-configs/ProviderBaseFields';
import WappiConfigFields from './provider-configs/WappiConfigFields';
import PostboxConfigFields from './provider-configs/PostboxConfigFields';
import FcmConfigFields from './provider-configs/FcmConfigFields';
import ApnsConfigFields from './provider-configs/ApnsConfigFields';

interface AddProviderFormProps {
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
}

const AddProviderForm = ({
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
}: AddProviderFormProps) => {
  const isWappi = newProviderType === 'whatsapp_business' || newProviderType === 'telegram_bot' || newProviderType === 'max';

  return (
    <div className="space-y-4 py-4">
      <ProviderBaseFields
        providerName={newProviderName}
        setProviderName={setNewProviderName}
        providerCode={newProviderCode}
        setProviderCode={setNewProviderCode}
        providerType={newProviderType}
        setProviderType={setNewProviderType}
      />

      {isWappi && (
        <WappiConfigFields
          wappiToken={newProviderWappiToken}
          setWappiToken={setNewProviderWappiToken}
          wappiProfileId={newProviderWappiProfileId}
          setWappiProfileId={setNewProviderWappiProfileId}
        />
      )}

      {newProviderType === 'yandex_postbox' && (
        <PostboxConfigFields
          postboxAccessKey={newProviderPostboxAccessKey}
          setPostboxAccessKey={setNewProviderPostboxAccessKey}
          postboxSecretKey={newProviderPostboxSecretKey}
          setPostboxSecretKey={setNewProviderPostboxSecretKey}
          postboxFromEmail={newProviderPostboxFromEmail}
          setPostboxFromEmail={setNewProviderPostboxFromEmail}
        />
      )}

      {newProviderType === 'fcm' && (
        <FcmConfigFields
          fcmProjectId={newProviderFcmProjectId}
          setFcmProjectId={setNewProviderFcmProjectId}
          fcmClientEmail={newProviderFcmClientEmail}
          setFcmClientEmail={setNewProviderFcmClientEmail}
          fcmPrivateKey={newProviderFcmPrivateKey}
          setFcmPrivateKey={setNewProviderFcmPrivateKey}
          uploadInputId="fcm-upload"
        />
      )}

      {newProviderType === 'apns' && (
        <ApnsConfigFields
          apnsTeamId={newProviderApnsTeamId}
          setApnsTeamId={setNewProviderApnsTeamId}
          apnsKeyId={newProviderApnsKeyId}
          setApnsKeyId={setNewProviderApnsKeyId}
          apnsPrivateKey={newProviderApnsPrivateKey}
          setApnsPrivateKey={setNewProviderApnsPrivateKey}
          apnsBundleId={newProviderApnsBundleId}
          setApnsBundleId={setNewProviderApnsBundleId}
          uploadInputId="apns-upload"
        />
      )}
    </div>
  );
};

export default AddProviderForm;
