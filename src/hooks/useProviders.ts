import { useState } from 'react';

const getProviderIcon = (providerType: string, providerCode: string) => {
  if (providerType === 'yandex_postbox') return 'Mail';
  if (providerType === 'fcm') return 'Bell';
  if (providerType === 'apns') return 'Apple';
  if (providerCode.includes('whatsapp')) return 'Phone';
  if (providerCode.includes('telegram')) return 'Send';
  if (providerCode.includes('sms')) return 'MessageSquare';
  if (providerCode.includes('email')) return 'Mail';
  if (providerCode.includes('push')) return 'Bell';
  if (providerCode.includes('wappi') || providerCode.includes('max')) return 'MessageCircle';
  return 'Plug';
};

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
  lastAttemptAt: string | null;
}

export const useProviders = () => {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [editProviderCode, setEditProviderCode] = useState('');
  const [wappiToken, setWappiToken] = useState('');
  const [wappiProfileId, setWappiProfileId] = useState('');
  const [postboxAccessKey, setPostboxAccessKey] = useState('');
  const [postboxSecretKey, setPostboxSecretKey] = useState('');
  const [postboxFromEmail, setPostboxFromEmail] = useState('');
  const [fcmProjectId, setFcmProjectId] = useState('');
  const [fcmPrivateKey, setFcmPrivateKey] = useState('');
  const [fcmClientEmail, setFcmClientEmail] = useState('');
  const [apnsTeamId, setApnsTeamId] = useState('');
  const [apnsKeyId, setApnsKeyId] = useState('');
  const [apnsPrivateKey, setApnsPrivateKey] = useState('');
  const [apnsBundleId, setApnsBundleId] = useState('');
  const [smsAeroEmail, setSmsAeroEmail] = useState('');
  const [smsAeroApiKey, setSmsAeroApiKey] = useState('');
  const [smsAeroSign, setSmsAeroSign] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [addProviderDialogOpen, setAddProviderDialogOpen] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderCode, setNewProviderCode] = useState('');
  const [newProviderType, setNewProviderType] = useState('');
  const [newProviderWappiToken, setNewProviderWappiToken] = useState('');
  const [newProviderWappiProfileId, setNewProviderWappiProfileId] = useState('');
  const [newProviderPostboxAccessKey, setNewProviderPostboxAccessKey] = useState('');
  const [newProviderPostboxSecretKey, setNewProviderPostboxSecretKey] = useState('');
  const [newProviderPostboxFromEmail, setNewProviderPostboxFromEmail] = useState('');
  const [newProviderFcmProjectId, setNewProviderFcmProjectId] = useState('');
  const [newProviderFcmPrivateKey, setNewProviderFcmPrivateKey] = useState('');
  const [newProviderFcmClientEmail, setNewProviderFcmClientEmail] = useState('');
  const [newProviderApnsTeamId, setNewProviderApnsTeamId] = useState('');
  const [newProviderApnsKeyId, setNewProviderApnsKeyId] = useState('');
  const [newProviderApnsPrivateKey, setNewProviderApnsPrivateKey] = useState('');
  const [newProviderApnsBundleId, setNewProviderApnsBundleId] = useState('');
  
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [providerConfigs, setProviderConfigs] = useState<Record<string, boolean>>({});

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
        const providersData = data.providers.map((p: Record<string, unknown>, index: number) => {
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
          
          const usesWappi = ['whatsapp_business', 'telegram_bot', 'max', 'wappi'].includes(p.provider_type as string);
          const usesPostbox = p.provider_type === 'yandex_postbox';
          const usesFcm = p.provider_type === 'fcm';
          const usesApns = p.provider_type === 'apns';
          const usesSmsAero = p.provider_type === 'sms_aero';
          
          return {
            id: index + 1,
            name: p.provider_name,
            icon: getProviderIcon(p.provider_type as string, p.provider_code as string),
            status: connectionStatus,
            requests: 0,
            code: p.provider_code,
            usesWappi,
            usesPostbox,
            usesFcm,
            usesApns,
            usesSmsAero,
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

  const openProviderConfig = async (provider: Provider) => {
    setSelectedProvider(provider);
    setEditProviderCode(provider.code || '');
    setWappiToken('');
    setWappiProfileId('');
    setPostboxAccessKey('');
    setPostboxSecretKey('');
    setPostboxFromEmail('');
    setFcmProjectId('');
    setFcmPrivateKey('');
    setFcmClientEmail('');
    setApnsTeamId('');
    setApnsKeyId('');
    setApnsPrivateKey('');
    setApnsBundleId('');
    setSmsAeroEmail('');
    setSmsAeroApiKey('');
    setSmsAeroSign('');

    if (provider.usesSmsAero) {
      try {
        const resp = await fetch(
          `https://functions.poehali.dev/c55cf921-d1ec-4fc7-a6e2-59c730988a1e?action=config&provider_code=${provider.code}`,
          { headers: { 'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8' } }
        );
        const data = await resp.json();
        if (data.success && data.config) {
          setSmsAeroEmail(data.config.smsaero_email || '');
          setSmsAeroApiKey(data.config.smsaero_api_key || '');
          setSmsAeroSign(data.config.smsaero_sign || '');
        }
      } catch (e) {
        console.error('Failed to load smsaero config:', e);
      }
    }

    setConfigDialogOpen(true);
  };

  const saveProviderConfig = async () => {
    setIsSaving(true);
    try {
      const requestBody: Record<string, string> = {
        provider_code: selectedProvider.code
      };

      if (selectedProvider.usesWappi) {
        requestBody.wappi_token = wappiToken;
        requestBody.wappi_profile_id = wappiProfileId;
      }

      if (selectedProvider.usesPostbox) {
        requestBody.postbox_access_key = postboxAccessKey;
        requestBody.postbox_secret_key = postboxSecretKey;
        requestBody.postbox_from_email = postboxFromEmail;
      }

      if (selectedProvider.usesFcm) {
        requestBody.fcm_project_id = fcmProjectId;
        requestBody.fcm_private_key = fcmPrivateKey;
        requestBody.fcm_client_email = fcmClientEmail;
      }

      if (selectedProvider.usesApns) {
        requestBody.apns_team_id = apnsTeamId;
        requestBody.apns_key_id = apnsKeyId;
        requestBody.apns_private_key = apnsPrivateKey;
        requestBody.apns_bundle_id = apnsBundleId;
      }

      if (selectedProvider.usesSmsAero) {
        requestBody.smsaero_email = smsAeroEmail;
        requestBody.smsaero_api_key = smsAeroApiKey;
        requestBody.smsaero_sign = smsAeroSign;
      }

      const response = await fetch('https://functions.poehali.dev/c55cf921-d1ec-4fc7-a6e2-59c730988a1e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConfigDialogOpen(false);
        setWappiToken('');
        setWappiProfileId('');
        setPostboxAccessKey('');
        setPostboxSecretKey('');
        setPostboxFromEmail('');
        setFcmProjectId('');
        setFcmPrivateKey('');
        setFcmClientEmail('');
        setApnsTeamId('');
        setApnsKeyId('');
        setApnsPrivateKey('');
        setApnsBundleId('');
        setSmsAeroEmail('');
        setSmsAeroApiKey('');
        setSmsAeroSign('');
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

  return {
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
    providers,
    isLoadingProviders,
    deleteDialogOpen,
    setDeleteDialogOpen,
    providerToDelete,
    setProviderToDelete,
    isDeleting,
    providerConfigs,
    loadProviders,
    deleteProvider,
    openProviderConfig,
    saveProviderConfig,
  };
};