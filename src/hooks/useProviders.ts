import { useState } from 'react';

const getProviderIcon = (providerType: string, providerCode: string) => {
  if (providerType === 'yandex_postbox') return 'Mail';
  if (providerType === 'fcm') return 'Bell';
  if (providerCode.includes('whatsapp')) return 'Phone';
  if (providerCode.includes('telegram')) return 'Send';
  if (providerCode.includes('sms')) return 'MessageSquare';
  if (providerCode.includes('email')) return 'Mail';
  if (providerCode.includes('push')) return 'Bell';
  if (providerCode.includes('wappi') || providerCode.includes('max')) return 'MessageCircle';
  return 'Plug';
};

export const useProviders = () => {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [editProviderCode, setEditProviderCode] = useState('');
  const [wappiToken, setWappiToken] = useState('');
  const [wappiProfileId, setWappiProfileId] = useState('');
  const [postboxAccessKey, setPostboxAccessKey] = useState('');
  const [postboxSecretKey, setPostboxSecretKey] = useState('');
  const [postboxFromEmail, setPostboxFromEmail] = useState('');
  const [fcmProjectId, setFcmProjectId] = useState('');
  const [fcmPrivateKey, setFcmPrivateKey] = useState('');
  const [fcmClientEmail, setFcmClientEmail] = useState('');
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
  
  const [providers, setProviders] = useState<any[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<any>(null);
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
          
          const usesWappi = ['whatsapp_business', 'telegram_bot', 'max', 'wappi'].includes(p.provider_type);
          const usesPostbox = p.provider_type === 'yandex_postbox';
          const usesFcm = p.provider_type === 'fcm';
          
          return {
            id: index + 1,
            name: p.provider_name,
            icon: getProviderIcon(p.provider_type, p.provider_code),
            status: connectionStatus,
            requests: 0,
            code: p.provider_code,
            usesWappi: usesWappi,
            usesPostbox: usesPostbox,
            usesFcm: usesFcm,
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

  const openProviderConfig = (provider: any) => {
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
    setConfigDialogOpen(true);
  };

  const saveProviderConfig = async () => {
    setIsSaving(true);
    try {
      const requestBody: any = {
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
