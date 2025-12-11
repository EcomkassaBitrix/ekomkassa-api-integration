import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface DeleteProviderDialogProps {
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  providerToDelete: any;
  isDeleting: boolean;
  deleteProvider: () => void;
}

const DeleteProviderDialog = ({
  deleteDialogOpen,
  setDeleteDialogOpen,
  providerToDelete,
  isDeleting,
  deleteProvider
}: DeleteProviderDialogProps) => {
  return (
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
              <Icon name="AlertTriangle" size={20} className="text-destructive" />
            </div>
            <span>Удалить подключение?</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {providerToDelete && (
              <>
                Вы действительно хотите удалить подключение <strong>{providerToDelete.name}</strong>?
                <br />
                <br />
                Это действие нельзя отменить. Все настройки и история отправок будут утеряны.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              deleteProvider();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Удаление...
              </>
            ) : (
              <>
                <Icon name="Trash2" size={16} className="mr-2" />
                Удалить
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteProviderDialog;
