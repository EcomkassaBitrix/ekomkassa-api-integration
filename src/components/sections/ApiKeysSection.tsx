import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ApiKey {
  key_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  [key: string]: unknown;
}

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
                <div key={key.id} className="p-4 bg-background/50 rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{key.key_name}</h4>
                        <Badge variant="outline">{key.is_active ? 'Активен' : 'Неактивен'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Создан: {new Date(key.created_at).toLocaleDateString('ru-RU')}
                      </p>
                      {key.last_used_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Последнее использование: {new Date(key.last_used_at).toLocaleString('ru-RU')}
                        </p>
                      )}
                      {key.expiry_date && (
                        <p className="text-xs text-yellow-500 mt-1">
                          Истекает: {new Date(key.expiry_date).toLocaleDateString('ru-RU')}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Icon name="MoreVertical" size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          navigator.clipboard.writeText(key.api_key);
                        }}>
                          <Icon name="Copy" size={14} className="mr-2" />
                          Копировать ключ
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setKeyToRegenerate(key);
                          setRegenerateKeyDialogOpen(true);
                        }}>
                          <Icon name="RefreshCw" size={14} className="mr-2" />
                          Перевыпустить
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setKeyToDelete(key);
                            setDeleteKeyDialogOpen(true);
                          }}
                        >
                          <Icon name="Trash2" size={14} className="mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 bg-background p-3 rounded-lg border border-border">
                    <code className="text-sm font-mono flex-1 select-all">{key.api_key}</code>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(key.api_key);
                      }}
                    >
                      <Icon name="Copy" size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Dialog open={createKeyDialogOpen} onOpenChange={setCreateKeyDialogOpen}>
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
                        onClick={() => {
                          navigator.clipboard.writeText(createdKey);
                        }}
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
              <Button 
                onClick={() => {
                  setCreateKeyDialogOpen(false);
                  setCreatedKey(null);
                  setNewKeyName('');
                  setNewKeyExpiry('never');
                }}
                className="w-full"
              >
                Закрыть
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCreateKeyDialogOpen(false);
                    setNewKeyName('');
                    setNewKeyExpiry('never');
                  }}
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

      <AlertDialog open={regenerateKeyDialogOpen} onOpenChange={setRegenerateKeyDialogOpen}>
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
                                onClick={() => {
                                  navigator.clipboard.writeText(regeneratedKey);
                                }}
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
                      Вы действительно хотите перевыпустить API ключ <strong>{keyToRegenerate.key_name}</strong>?
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
              <Button 
                onClick={() => {
                  setRegenerateKeyDialogOpen(false);
                  setKeyToRegenerate(null);
                  setRegeneratedKey(null);
                }}
                className="w-full"
              >
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

      <AlertDialog open={deleteKeyDialogOpen} onOpenChange={setDeleteKeyDialogOpen}>
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
                  Вы действительно хотите удалить API ключ <strong>{keyToDelete.key_name}</strong>?
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
                  const response = await fetch(`https://functions.poehali.dev/968d5f56-3d5a-4427-90b9-c040acd085d6?key_id=${keyToDelete.id}`, {
                    method: 'DELETE',
                    headers: {
                      'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
                    }
                  });
                  const data = await response.json();
                  if (data.success) {
                    setDeleteKeyDialogOpen(false);
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
    </>
  );
};

export default ApiKeysSection;