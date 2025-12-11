import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddProviderDialogProps {
  addProviderDialogOpen: boolean;
  setAddProviderDialogOpen: (open: boolean) => void;
  newProviderName: string;
  setNewProviderName: (name: string) => void;
  newProviderCode: string;
  setNewProviderCode: (code: string) => void;
  newProviderType: string;
  setNewProviderType: (type: string) => void;
  newProviderWappiToken: string;
  setNewProviderWappiToken: (token: string) => void;
  newProviderWappiProfileId: string;
  setNewProviderWappiProfileId: (id: string) => void;
  isSaving: boolean;
  loadProviders: () => void;
}

const AddProviderDialog = ({
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
  isSaving,
  loadProviders
}: AddProviderDialogProps) => {
  return (
    <Dialog open={addProviderDialogOpen} onOpenChange={setAddProviderDialogOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="Plus" size={20} className="text-primary" />
            </div>
            <span>Добавить подключение</span>
          </DialogTitle>
          <DialogDescription>
            Выберите провайдера и настройте подключение к каналу связи
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="provider-name">Название подключения</Label>
            <Input
              id="provider-name"
              placeholder="WhatsApp Business"
              value={newProviderName}
              onChange={(e) => setNewProviderName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Отображаемое имя подключения в интерфейсе
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-type">Провайдер</Label>
            <Select value={newProviderType} onValueChange={setNewProviderType}>
              <SelectTrigger id="provider-type">
                <SelectValue placeholder="Выберите провайдера" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wappi">Wappi (WhatsApp, Telegram, MAX)</SelectItem>
                <SelectItem value="sms">SMS Gateway</SelectItem>
                <SelectItem value="email">Email SMTP</SelectItem>
                <SelectItem value="push">Push Notifications</SelectItem>
                <SelectItem value="custom">Другой / Custom</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Провайдер для отправки сообщений
            </p>
          </div>

          {newProviderType === 'wappi' && (
            <>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <Icon name="Info" size={20} className="text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Настройки Wappi:</p>
                    <p className="text-muted-foreground mb-2">
                      Для работы через Wappi необходимо указать API токен и Profile ID
                    </p>
                    <a 
                      href="https://wappi.pro" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Получить ключи в личном кабинете
                      <Icon name="ExternalLink" size={12} />
                    </a>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-wappi-token">API Token</Label>
                <Input
                  id="new-wappi-token"
                  placeholder="Введите токен Wappi"
                  value={newProviderWappiToken}
                  onChange={(e) => setNewProviderWappiToken(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-wappi-profile">Profile ID</Label>
                <Input
                  id="new-wappi-profile"
                  placeholder="Введите ID профиля"
                  value={newProviderWappiProfileId}
                  onChange={(e) => setNewProviderWappiProfileId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </>
          )}

          {newProviderType && newProviderType !== 'wappi' && (
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <Icon name="AlertCircle" size={20} className="text-yellow-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Дополнительная интеграция:</p>
                  <p className="text-muted-foreground">
                    Для работы с этим провайдером потребуется дополнительная настройка в коде бэкенда
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setAddProviderDialogOpen(false);
              setNewProviderName('');
              setNewProviderCode('');
              setNewProviderType('');
              setNewProviderWappiToken('');
              setNewProviderWappiProfileId('');
            }}
            disabled={isSaving}
          >
            Отмена
          </Button>
          <Button 
            onClick={async () => {
              if (!newProviderName || !newProviderType) {
                return;
              }
              
              const generatedCode = newProviderName.toLowerCase().replace(/\s+/g, '_');
              
              if (newProviderType === 'wappi' && (!newProviderWappiToken || !newProviderWappiProfileId)) {
                return;
              }

              setIsSaving(true);
              try {
                const config: any = {};
                
                if (newProviderType === 'wappi') {
                  config.wappi_token = newProviderWappiToken;
                  config.wappi_profile_id = newProviderWappiProfileId;
                }

                const response = await fetch('https://functions.poehali.dev/c55cf921-d1ec-4fc7-a6e2-59c730988a1e', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
                  },
                  body: JSON.stringify({
                    provider_code: generatedCode,
                    provider_name: newProviderName,
                    provider_type: newProviderType,
                    ...config
                  })
                });
                
                const data = await response.json();
                
                if (data.success) {
                  setAddProviderDialogOpen(false);
                  setNewProviderName('');
                  setNewProviderCode('');
                  setNewProviderType('');
                  setNewProviderWappiToken('');
                  setNewProviderWappiProfileId('');
                  await loadProviders();
                }
              } catch (error) {
                console.error('Failed to add provider:', error);
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={
              !newProviderName || 
              !newProviderCode || 
              !newProviderType || 
              (newProviderType === 'wappi' && (!newProviderWappiToken || !newProviderWappiProfileId)) ||
              isSaving
            }
          >
            {isSaving ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Добавление...
              </>
            ) : (
              <>
                <Icon name="Check" size={16} className="mr-2" />
                Добавить подключение
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddProviderDialog;