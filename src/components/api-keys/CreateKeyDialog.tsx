import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newKeyName: string;
  setNewKeyName: (name: string) => void;
  newKeyExpiry: string;
  setNewKeyExpiry: (expiry: string) => void;
  isCreatingKey: boolean;
  setIsCreatingKey: (creating: boolean) => void;
  createdKey: string | null;
  setCreatedKey: (key: string | null) => void;
  loadApiKeys: () => void;
}

const CreateKeyDialog = ({
  open,
  onOpenChange,
  newKeyName,
  setNewKeyName,
  newKeyExpiry,
  setNewKeyExpiry,
  isCreatingKey,
  setIsCreatingKey,
  createdKey,
  setCreatedKey,
  loadApiKeys,
}: CreateKeyDialogProps) => {
  const handleClose = () => {
    onOpenChange(false);
    setCreatedKey(null);
    setNewKeyName('');
    setNewKeyExpiry('never');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="Key" size={20} className="text-primary" />
            </div>
            <span>Создать API ключ</span>
          </DialogTitle>
          <DialogDescription>
            Новый ключ будет использоваться для авторизации API запросов
          </DialogDescription>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-start gap-3">
                <Icon name="CheckCircle" size={20} className="text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-500 mb-2">Ключ успешно создан!</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Скопируйте ключ сейчас. Вы не сможете увидеть его снова.
                  </p>
                  <div className="flex items-center gap-2 bg-background p-3 rounded-lg border border-border">
                    <code className="text-sm font-mono flex-1 select-all break-all">{createdKey}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigator.clipboard.writeText(createdKey)}
                    >
                      <Icon name="Copy" size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Название ключа</Label>
              <Input
                id="key-name"
                placeholder="Production Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Понятное имя для идентификации ключа
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="key-expiry">Срок действия</Label>
              <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                <SelectTrigger id="key-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Без срока действия</SelectItem>
                  <SelectItem value="30">30 дней</SelectItem>
                  <SelectItem value="90">90 дней</SelectItem>
                  <SelectItem value="180">180 дней</SelectItem>
                  <SelectItem value="365">1 год</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                После истечения срока ключ автоматически деактивируется
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {createdKey ? (
            <Button onClick={handleClose} className="w-full">
              Закрыть
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isCreatingKey}
              >
                Отмена
              </Button>
              <Button
                onClick={async () => {
                  setIsCreatingKey(true);
                  try {
                    const response = await fetch('https://functions.poehali.dev/968d5f56-3d5a-4427-90b9-c040acd085d6', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
                      },
                      body: JSON.stringify({
                        key_name: newKeyName,
                        expiry_days: newKeyExpiry
                      })
                    });
                    const data = await response.json();
                    if (data.success) {
                      setCreatedKey(data.api_key);
                      await loadApiKeys();
                    }
                  } catch (error) {
                    console.error('Failed to create key:', error);
                  } finally {
                    setIsCreatingKey(false);
                  }
                }}
                disabled={!newKeyName || isCreatingKey}
              >
                {isCreatingKey ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Icon name="Plus" size={16} className="mr-2" />
                    Создать ключ
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateKeyDialog;
