import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import ApiKeyCard, { ApiKey } from '@/components/api-keys/ApiKeyCard';
import CreateKeyDialog from '@/components/api-keys/CreateKeyDialog';
import RegenerateKeyDialog from '@/components/api-keys/RegenerateKeyDialog';
import DeleteKeyDialog from '@/components/api-keys/DeleteKeyDialog';

interface ApiKeysSectionProps {
  apiKeys: ApiKey[];
  isLoadingKeys: boolean;
  createKeyDialogOpen: boolean;
  setCreateKeyDialogOpen: (open: boolean) => void;
  newKeyName: string;
  setNewKeyName: (name: string) => void;
  newKeyExpiry: string;
  setNewKeyExpiry: (expiry: string) => void;
  isCreatingKey: boolean;
  setIsCreatingKey: (creating: boolean) => void;
  createdKey: string | null;
  setCreatedKey: (key: string | null) => void;
  regenerateKeyDialogOpen: boolean;
  setRegenerateKeyDialogOpen: (open: boolean) => void;
  keyToRegenerate: ApiKey | null;
  setKeyToRegenerate: (key: ApiKey | null) => void;
  isRegeneratingKey: boolean;
  setIsRegeneratingKey: (regenerating: boolean) => void;
  regeneratedKey: string | null;
  setRegeneratedKey: (key: string | null) => void;
  deleteKeyDialogOpen: boolean;
  setDeleteKeyDialogOpen: (open: boolean) => void;
  keyToDelete: ApiKey | null;
  setKeyToDelete: (key: ApiKey | null) => void;
  isDeletingKey: boolean;
  setIsDeletingKey: (deleting: boolean) => void;
  loadApiKeys: () => void;
}

const ApiKeysSection = ({
  apiKeys,
  isLoadingKeys,
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
  regenerateKeyDialogOpen,
  setRegenerateKeyDialogOpen,
  keyToRegenerate,
  setKeyToRegenerate,
  isRegeneratingKey,
  setIsRegeneratingKey,
  regeneratedKey,
  setRegeneratedKey,
  deleteKeyDialogOpen,
  setDeleteKeyDialogOpen,
  keyToDelete,
  setKeyToDelete,
  isDeletingKey,
  setIsDeletingKey,
  loadApiKeys
}: ApiKeysSectionProps) => {
  return (
    <>
      <div className="space-y-6">
        {isLoadingKeys ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="Loader2" size={32} className="animate-spin text-primary" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="Key" size={48} className="mx-auto mb-3 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">API ключи не найдены</p>
            <Button onClick={() => setCreateKeyDialogOpen(true)}>
              <Icon name="Plus" size={16} className="mr-2" />
              Создать первый ключ
            </Button>
          </div>
        ) : (
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
            <h3 className="text-lg font-semibold mb-4">Активные API ключи</h3>
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <ApiKeyCard
                  key={key.id as string ?? key.key_id}
                  apiKey={key}
                  onRegenerate={(k) => {
                    setKeyToRegenerate(k);
                    setRegenerateKeyDialogOpen(true);
                  }}
                  onDelete={(k) => {
                    setKeyToDelete(k);
                    setDeleteKeyDialogOpen(true);
                  }}
                />
              ))}
            </div>
          </Card>
        )}
      </div>

      <CreateKeyDialog
        open={createKeyDialogOpen}
        onOpenChange={setCreateKeyDialogOpen}
        newKeyName={newKeyName}
        setNewKeyName={setNewKeyName}
        newKeyExpiry={newKeyExpiry}
        setNewKeyExpiry={setNewKeyExpiry}
        isCreatingKey={isCreatingKey}
        setIsCreatingKey={setIsCreatingKey}
        createdKey={createdKey}
        setCreatedKey={setCreatedKey}
        loadApiKeys={loadApiKeys}
      />

      <RegenerateKeyDialog
        open={regenerateKeyDialogOpen}
        onOpenChange={setRegenerateKeyDialogOpen}
        keyToRegenerate={keyToRegenerate}
        setKeyToRegenerate={setKeyToRegenerate}
        isRegeneratingKey={isRegeneratingKey}
        setIsRegeneratingKey={setIsRegeneratingKey}
        regeneratedKey={regeneratedKey}
        setRegeneratedKey={setRegeneratedKey}
        loadApiKeys={loadApiKeys}
      />

      <DeleteKeyDialog
        open={deleteKeyDialogOpen}
        onOpenChange={setDeleteKeyDialogOpen}
        keyToDelete={keyToDelete}
        setKeyToDelete={setKeyToDelete}
        isDeletingKey={isDeletingKey}
        setIsDeletingKey={setIsDeletingKey}
        loadApiKeys={loadApiKeys}
      />
    </>
  );
};

export default ApiKeysSection;