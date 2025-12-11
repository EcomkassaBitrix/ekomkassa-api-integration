import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface ProviderConfigDialogProps {
  configDialogOpen: boolean;
  setConfigDialogOpen: (open: boolean) => void;
  selectedProvider: any;
  editProviderCode: string;
  setEditProviderCode: (code: string) => void;
  providerConfigs: Record<string, boolean>;
  wappiToken: string;
  setWappiToken: (token: string) => void;
  wappiProfileId: string;
  setWappiProfileId: (id: string) => void;
  isSaving: boolean;
  saveProviderConfig: () => void;
}

const ProviderConfigDialog = ({
  configDialogOpen,
  setConfigDialogOpen,
  selectedProvider,
  editProviderCode,
  setEditProviderCode,
  providerConfigs,
  wappiToken,
  setWappiToken,
  wappiProfileId,
  setWappiProfileId,
  isSaving,
  saveProviderConfig
}: ProviderConfigDialogProps) => {
  return (
    <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {selectedProvider && (
              <>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon name={selectedProvider.icon} size={20} className="text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <span>Настройка {selectedProvider.name}</span>
                  {providerConfigs[selectedProvider.code] && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      <Icon name="CheckCircle" size={12} className="mr-1" />
                      Настроено
                    </Badge>
                  )}
                </div>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {selectedProvider?.usesWappi ? (
              <>
                {providerConfigs[selectedProvider.code] 
                  ? `Обновите настройки интеграции ${selectedProvider.name} с Wappi.`
                  : `Для работы ${selectedProvider.name} требуется настроить интеграцию с Wappi.`
                }
                <br />
                <a 
                  href="https://wappi.pro" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 mt-2"
                >
                  Получить ключи в личном кабинете Wappi
                  <Icon name="ExternalLink" size={14} />
                </a>
              </>
            ) : (
              `Настройте параметры подключения для ${selectedProvider?.name}`
            )}
          </DialogDescription>
        </DialogHeader>

        {selectedProvider?.usesWappi ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-provider-code">Код провайдера (provider_code)</Label>
              <Input
                id="edit-provider-code"
                value={editProviderCode}
                onChange={(e) => setEditProviderCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="font-mono text-sm"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Используйте этот код в поле "provider" при отправке сообщений через API
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wappi-token">API Token</Label>
              <Input
                id="wappi-token"
                placeholder="Введите токен Wappi"
                value={wappiToken}
                onChange={(e) => setWappiToken(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Токен авторизации из личного кабинета wappi.pro
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wappi-profile">Profile ID</Label>
              <Input
                id="wappi-profile"
                placeholder="Введите ID профиля"
                value={wappiProfileId}
                onChange={(e) => setWappiProfileId(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Идентификатор профиля для работы с API
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <Icon name="Info" size={20} className="text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Как получить данные:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Зайдите на wappi.pro</li>
                    <li>Откройте раздел "Настройки API"</li>
                    <li>Скопируйте Token и Profile ID</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Настройки для этого провайдера будут доступны позже.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setConfigDialogOpen(false)}
            disabled={isSaving}
          >
            Отмена
          </Button>
          {selectedProvider?.usesWappi && (
            <Button 
              onClick={saveProviderConfig}
              disabled={!wappiToken || !wappiProfileId || isSaving}
            >
              {isSaving ? (
                <>
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Icon name="Check" size={16} className="mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProviderConfigDialog;