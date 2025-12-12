import { useState } from 'react';

export const useApiKeys = () => {
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

  return {
    createKeyDialogOpen,
    setCreateKeyDialogOpen,
    newKeyName,
    setNewKeyName,
    newKeyExpiry,
    setNewKeyExpiry,
    isCreatingKey,
    setIsCreatingKey,
    createdKey,
    setCreatedKey,
    deleteKeyDialogOpen,
    setDeleteKeyDialogOpen,
    keyToDelete,
    setKeyToDelete,
    isDeletingKey,
    setIsDeletingKey,
    apiKeys,
    isLoadingKeys,
    regenerateKeyDialogOpen,
    setRegenerateKeyDialogOpen,
    keyToRegenerate,
    setKeyToRegenerate,
    isRegeneratingKey,
    setIsRegeneratingKey,
    regeneratedKey,
    setRegeneratedKey,
    loadApiKeys,
  };
};
