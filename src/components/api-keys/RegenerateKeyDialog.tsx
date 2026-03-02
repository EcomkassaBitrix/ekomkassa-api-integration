import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ApiKey } from './ApiKeyCard';

interface RegenerateKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyToRegenerate: ApiKey | null;
  setKeyToRegenerate: (key: ApiKey | null) => void;
  isRegeneratingKey: boolean;
  setIsRegeneratingKey: (regenerating: boolean) => void;
  regeneratedKey: string | null;
  setRegeneratedKey: (key: string | null) => void;
  loadApiKeys: () => void;
}

const RegenerateKeyDialog = ({
  open,
  onOpenChange,
  keyToRegenerate,
  setKeyToRegenerate,
  isRegeneratingKey,
  setIsRegeneratingKey,
  regeneratedKey,
  setRegeneratedKey,
  loadApiKeys,
}: RegenerateKeyDialogProps) => {
  const handleClose = () => {
    onOpenChange(false);
    setKeyToRegenerate(null);
    setRegeneratedKey(null);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="RefreshCw" size={20} className="text-primary" />
            </div>
            <span>Перевыпустить API ключ?</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {keyToRegenerate && (
              <>
                {regeneratedKey ? (
                  <div className="space-y-3 mt-3">
                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="flex items-start gap-3">
                        <Icon name="CheckCircle" size={20} className="text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-green-500 mb-2">Ключ успешно перевыпущен!</p>
                          <p className="text-sm text-muted-foreground mb-3">
                            Скопируйте новый ключ сейчас. Старый ключ больше не работает.
                          </p>
                          <div className="flex items-center gap-2 bg-background p-3 rounded-lg border border-border">
                            <code className="text-sm font-mono flex-1 select-all break-all">{regeneratedKey}</code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigator.clipboard.writeText(regeneratedKey)}
                            >
                              <Icon name="Copy" size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    Вы действительно хотите перевыпустить API ключ <strong>{keyToRegenerate.key_name as string}</strong>?
                    <br />
                    <br />
                    Будет создан новый ключ, а текущий перестанет работать. Все приложения, использующие старый ключ, потеряют доступ к API.
                  </>
                )}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {regeneratedKey ? (
            <Button onClick={handleClose} className="w-full">
              Закрыть
            </Button>
          ) : (
            <>
              <AlertDialogCancel disabled={isRegeneratingKey}>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={async (e) => {
                  e.preventDefault();
                  if (!keyToRegenerate) return;

                  setIsRegeneratingKey(true);
                  try {
                    const response = await fetch('https://functions.poehali.dev/968d5f56-3d5a-4427-90b9-c040acd085d6', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
                      },
                      body: JSON.stringify({
                        action: 'regenerate',
                        key_id: keyToRegenerate.id
                      })
                    });
                    const data = await response.json();
                    if (data.success) {
                      setRegeneratedKey(data.api_key);
                      await loadApiKeys();
                    }
                  } catch (error) {
                    console.error('Failed to regenerate key:', error);
                  } finally {
                    setIsRegeneratingKey(false);
                  }
                }}
                disabled={isRegeneratingKey}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isRegeneratingKey ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    Перевыпуск...
                  </>
                ) : (
                  <>
                    <Icon name="RefreshCw" size={16} className="mr-2" />
                    Перевыпустить ключ
                  </>
                )}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RegenerateKeyDialog;
