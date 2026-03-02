import Icon from '@/components/ui/icon';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ApiKey } from './ApiKeyCard';

interface DeleteKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyToDelete: ApiKey | null;
  setKeyToDelete: (key: ApiKey | null) => void;
  isDeletingKey: boolean;
  setIsDeletingKey: (deleting: boolean) => void;
  loadApiKeys: () => void;
}

const DeleteKeyDialog = ({
  open,
  onOpenChange,
  keyToDelete,
  setKeyToDelete,
  isDeletingKey,
  setIsDeletingKey,
  loadApiKeys,
}: DeleteKeyDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
              <Icon name="AlertTriangle" size={20} className="text-destructive" />
            </div>
            <span>Удалить API ключ?</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {keyToDelete && (
              <>
                Вы действительно хотите удалить API ключ <strong>{keyToDelete.key_name as string}</strong>?
                <br />
                <br />
                Все приложения, использующие этот ключ, потеряют доступ к API. Это действие нельзя отменить.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeletingKey}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={async (e) => {
              e.preventDefault();
              if (!keyToDelete) return;

              setIsDeletingKey(true);
              try {
                const response = await fetch(`https://functions.poehali.dev/968d5f56-3d5a-4427-90b9-c040acd085d6?key_id=${keyToDelete.id as string}`, {
                  method: 'DELETE',
                  headers: {
                    'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
                  }
                });
                const data = await response.json();
                if (data.success) {
                  onOpenChange(false);
                  setKeyToDelete(null);
                  await loadApiKeys();
                }
              } catch (error) {
                console.error('Failed to delete key:', error);
              } finally {
                setIsDeletingKey(false);
              }
            }}
            disabled={isDeletingKey}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeletingKey ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Удаление...
              </>
            ) : (
              <>
                <Icon name="Trash2" size={16} className="mr-2" />
                Удалить ключ
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteKeyDialog;
