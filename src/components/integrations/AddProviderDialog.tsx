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
  newProviderPostboxAccessKey: string;
  setNewProviderPostboxAccessKey: (key: string) => void;
  newProviderPostboxSecretKey: string;
  setNewProviderPostboxSecretKey: (key: string) => void;
  newProviderPostboxFromEmail: string;
  setNewProviderPostboxFromEmail: (email: string) => void;
  newProviderFcmProjectId: string;
  setNewProviderFcmProjectId: (id: string) => void;
  newProviderFcmPrivateKey: string;
  setNewProviderFcmPrivateKey: (key: string) => void;
  newProviderFcmClientEmail: string;
  setNewProviderFcmClientEmail: (email: string) => void;
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
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
  isSaving,
  setIsSaving,
  loadProviders
}: AddProviderDialogProps) => {
  const handleFcmConfigUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.project_id) setNewProviderFcmProjectId(json.project_id);
        if (json.private_key) setNewProviderFcmPrivateKey(json.private_key);
        if (json.client_email) setNewProviderFcmClientEmail(json.client_email);
      } catch (error) {
        console.error('Ошибка парсинга JSON:', error);
      }
    };
    reader.readAsText(file);
  };
  return (
    <Dialog open={addProviderDialogOpen} onOpenChange={setAddProviderDialogOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
            <Label htmlFor="provider-code">Код провайдера (provider_code)</Label>
            <Input
              id="provider-code"
              placeholder="ek_wa"
              value={newProviderCode}
              onChange={(e) => setNewProviderCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Уникальный идентификатор для использования в API (только латиница, цифры и _)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-type">Провайдер</Label>
            <Select value={newProviderType} onValueChange={setNewProviderType}>
              <SelectTrigger id="provider-type">
                <SelectValue placeholder="Выберите провайдера" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp_business">
                  <div className="flex items-center gap-2">
                    <Icon name="Phone" size={16} />
                    <span>WhatsApp (Wappi)</span>
                  </div>
                </SelectItem>
                <SelectItem value="telegram_bot">
                  <div className="flex items-center gap-2">
                    <Icon name="Send" size={16} />
                    <span>Telegram (Wappi)</span>
                  </div>
                </SelectItem>
                <SelectItem value="max">
                  <div className="flex items-center gap-2">
                    <Icon name="MessageCircle" size={16} />
                    <span>MAX (Wappi)</span>
                  </div>
                </SelectItem>
                <SelectItem value="yandex_postbox">
                  <div className="flex items-center gap-2">
                    <Icon name="Mail" size={16} />
                    <span>Яндекс Postbox API</span>
                  </div>
                </SelectItem>
                <SelectItem value="fcm">
                  <div className="flex items-center gap-2">
                    <Icon name="Bell" size={16} />
                    <span>Firebase Cloud Messaging (Android Push)</span>
                  </div>
                </SelectItem>
                <SelectItem value="sms">SMS Gateway</SelectItem>
                <SelectItem value="email">Email SMTP</SelectItem>
                <SelectItem value="custom">Другой / Custom</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Провайдер для отправки сообщений
            </p>
          </div>

          {(newProviderType === 'whatsapp_business' || newProviderType === 'telegram_bot' || newProviderType === 'max') && (
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

          {newProviderType === 'yandex_postbox' && (
            <>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <Icon name="Info" size={20} className="text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Настройки Yandex Postbox:</p>
                    <p className="text-muted-foreground mb-2">
                      Для работы через Yandex Postbox необходимо указать Access Key, Secret Key и адрес отправителя
                    </p>
                    <a 
                      href="https://yandex.cloud/ru/docs/postbox/quickstart" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Инструкция по настройке
                      <Icon name="ExternalLink" size={12} />
                    </a>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-postbox-access-key">Access Key ID</Label>
                <Input
                  id="new-postbox-access-key"
                  placeholder="Введите Access Key ID"
                  value={newProviderPostboxAccessKey}
                  onChange={(e) => setNewProviderPostboxAccessKey(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-postbox-secret-key">Secret Access Key</Label>
                <Input
                  id="new-postbox-secret-key"
                  type="password"
                  placeholder="Введите Secret Access Key"
                  value={newProviderPostboxSecretKey}
                  onChange={(e) => setNewProviderPostboxSecretKey(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-postbox-from-email">Адрес отправителя (From)</Label>
                <Input
                  id="new-postbox-from-email"
                  type="email"
                  placeholder="noreply@example.com"
                  value={newProviderPostboxFromEmail}
                  onChange={(e) => setNewProviderPostboxFromEmail(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Адрес должен быть верифицирован в Postbox
                </p>
              </div>
            </>
          )}

          {newProviderType === 'fcm' && (
            <>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <Icon name="Info" size={20} className="text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Настройки Firebase Cloud Messaging (FCM):</p>
                    <p className="text-muted-foreground mb-2">
                      Загрузите JSON-файл с конфигурацией или заполните поля вручную
                    </p>
                    <a 
                      href="https://console.firebase.google.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Открыть Firebase Console
                      <Icon name="ExternalLink" size={12} />
                    </a>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fcm-upload">Загрузить конфиг из файла (опционально)</Label>
                <div className="flex gap-2">
                  <Input
                    id="fcm-upload"
                    type="file"
                    accept=".json"
                    onChange={handleFcmConfigUpload}
                    className="cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById('fcm-upload') as HTMLInputElement;
                      if (input) input.value = '';
                      setNewProviderFcmProjectId('');
                      setNewProviderFcmPrivateKey('');
                      setNewProviderFcmClientEmail('');
                    }}
                  >
                    <Icon name="X" size={16} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Загрузите JSON-файл из Firebase Console для автозаполнения
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-fcm-project-id">Project ID</Label>
                <Input
                  id="new-fcm-project-id"
                  placeholder="my-firebase-project"
                  value={newProviderFcmProjectId}
                  onChange={(e) => setNewProviderFcmProjectId(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Идентификатор проекта Firebase (например: my-app-12345)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-fcm-client-email">Client Email</Label>
                <Input
                  id="new-fcm-client-email"
                  type="email"
                  placeholder="firebase-adminsdk-xxxxx@my-project.iam.gserviceaccount.com"
                  value={newProviderFcmClientEmail}
                  onChange={(e) => setNewProviderFcmClientEmail(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Email сервисного аккаунта из JSON файла
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-fcm-private-key">Private Key</Label>
                <textarea
                  id="new-fcm-private-key"
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvQIBADANBg...&#10;-----END PRIVATE KEY-----"
                  value={newProviderFcmPrivateKey}
                  onChange={(e) => setNewProviderFcmPrivateKey(e.target.value)}
                  className="w-full min-h-[120px] px-3 py-2 text-sm font-mono bg-background border border-input rounded-md resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  Приватный ключ из JSON файла (включая BEGIN/END теги)
                </p>
              </div>
            </>
          )}

          {newProviderType && !['whatsapp_business', 'telegram_bot', 'max', 'yandex_postbox', 'fcm'].includes(newProviderType) && (
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
              setNewProviderPostboxAccessKey('');
              setNewProviderPostboxSecretKey('');
              setNewProviderPostboxFromEmail('');
              setNewProviderFcmProjectId('');
              setNewProviderFcmPrivateKey('');
              setNewProviderFcmClientEmail('');
            }}
            disabled={isSaving}
          >
            Отмена
          </Button>
          <Button 
            onClick={async () => {
              if (!newProviderName || !newProviderCode || !newProviderType) {
                return;
              }
              
              const isWappiProvider = ['whatsapp_business', 'telegram_bot', 'max'].includes(newProviderType);
              const isPostboxProvider = newProviderType === 'yandex_postbox';
              const isFcmProvider = newProviderType === 'fcm';
              
              if (isWappiProvider && (!newProviderWappiToken || !newProviderWappiProfileId)) {
                return;
              }
              
              if (isPostboxProvider && (!newProviderPostboxAccessKey || !newProviderPostboxSecretKey || !newProviderPostboxFromEmail)) {
                return;
              }
              
              if (isFcmProvider && (!newProviderFcmProjectId || !newProviderFcmPrivateKey || !newProviderFcmClientEmail)) {
                return;
              }

              setIsSaving(true);
              try {
                const config: any = {};
                
                if (isWappiProvider) {
                  config.wappi_token = newProviderWappiToken;
                  config.wappi_profile_id = newProviderWappiProfileId;
                }
                
                if (isPostboxProvider) {
                  config.postbox_access_key = newProviderPostboxAccessKey;
                  config.postbox_secret_key = newProviderPostboxSecretKey;
                  config.postbox_from_email = newProviderPostboxFromEmail;
                }
                
                if (isFcmProvider) {
                  config.fcm_project_id = newProviderFcmProjectId;
                  config.fcm_private_key = newProviderFcmPrivateKey;
                  config.fcm_client_email = newProviderFcmClientEmail;
                }

                const response = await fetch('https://functions.poehali.dev/c55cf921-d1ec-4fc7-a6e2-59c730988a1e', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8'
                  },
                  body: JSON.stringify({
                    provider_code: newProviderCode,
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
                  setNewProviderPostboxAccessKey('');
                  setNewProviderPostboxSecretKey('');
                  setNewProviderPostboxFromEmail('');
                  setNewProviderFcmProjectId('');
                  setNewProviderFcmPrivateKey('');
                  setNewProviderFcmClientEmail('');
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
              (['whatsapp_business', 'telegram_bot', 'max'].includes(newProviderType) && (!newProviderWappiToken || !newProviderWappiProfileId)) ||
              (newProviderType === 'yandex_postbox' && (!newProviderPostboxAccessKey || !newProviderPostboxSecretKey || !newProviderPostboxFromEmail)) ||
              (newProviderType === 'fcm' && (!newProviderFcmProjectId || !newProviderFcmPrivateKey || !newProviderFcmClientEmail)) ||
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