import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

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
  postboxAccessKey: string;
  setPostboxAccessKey: (key: string) => void;
  postboxSecretKey: string;
  setPostboxSecretKey: (key: string) => void;
  postboxFromEmail: string;
  setPostboxFromEmail: (email: string) => void;
  fcmProjectId: string;
  setFcmProjectId: (id: string) => void;
  fcmPrivateKey: string;
  setFcmPrivateKey: (key: string) => void;
  fcmClientEmail: string;
  setFcmClientEmail: (email: string) => void;
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
  postboxAccessKey,
  setPostboxAccessKey,
  postboxSecretKey,
  setPostboxSecretKey,
  postboxFromEmail,
  setPostboxFromEmail,
  fcmProjectId,
  setFcmProjectId,
  fcmPrivateKey,
  setFcmPrivateKey,
  fcmClientEmail,
  setFcmClientEmail,
  isSaving,
  saveProviderConfig
}: ProviderConfigDialogProps) => {
  const [copied, setCopied] = useState(false);

  const handleFcmConfigUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.project_id) setFcmProjectId(json.project_id);
        if (json.private_key) setFcmPrivateKey(json.private_key);
        if (json.client_email) setFcmClientEmail(json.client_email);
      } catch (error) {
        console.error('Ошибка парсинга JSON:', error);
      }
    };
    reader.readAsText(file);
  };

  const copyProviderCode = () => {
    navigator.clipboard.writeText(editProviderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
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
              <div className="flex gap-2">
                <Input
                  id="edit-provider-code"
                  value={editProviderCode}
                  onChange={(e) => setEditProviderCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="font-mono text-sm flex-1"
                  disabled
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyProviderCode}
                  className="px-3"
                >
                  <Icon name={copied ? "Check" : "Copy"} size={16} className={copied ? "text-green-500" : ""} />
                </Button>
              </div>
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
        ) : selectedProvider?.usesPostbox ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-provider-code">Код провайдера (provider_code)</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-provider-code"
                  value={editProviderCode}
                  className="font-mono text-sm flex-1"
                  disabled
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyProviderCode}
                  className="px-3"
                >
                  <Icon name={copied ? "Check" : "Copy"} size={16} className={copied ? "text-green-500" : ""} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Используйте этот код в поле "provider" при отправке сообщений через API
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postbox-access-key">Access Key ID</Label>
              <Input
                id="postbox-access-key"
                placeholder="Введите Access Key ID"
                value={postboxAccessKey}
                onChange={(e) => setPostboxAccessKey(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Ключ доступа из Yandex Cloud Postbox
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postbox-secret-key">Secret Access Key</Label>
              <Input
                id="postbox-secret-key"
                type="password"
                placeholder="Введите Secret Access Key"
                value={postboxSecretKey}
                onChange={(e) => setPostboxSecretKey(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Секретный ключ для доступа к API
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postbox-from-email">Адрес отправителя</Label>
              <Input
                id="postbox-from-email"
                type="email"
                placeholder="noreply@example.com"
                value={postboxFromEmail}
                onChange={(e) => setPostboxFromEmail(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Верифицированный адрес отправителя в Postbox
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <Icon name="Info" size={20} className="text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Как получить данные:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Откройте Yandex Cloud Console</li>
                    <li>Перейдите в Postbox → Настройки</li>
                    <li>Создайте Access Key</li>
                    <li>Верифицируйте адрес отправителя</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        ) : selectedProvider?.usesFcm ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-provider-code">Код провайдера (provider_code)</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-provider-code"
                  value={editProviderCode}
                  className="font-mono text-sm flex-1"
                  disabled
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyProviderCode}
                  className="px-3"
                >
                  <Icon name={copied ? "Check" : "Copy"} size={16} className={copied ? "text-green-500" : ""} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Используйте этот код в поле "provider" при отправке push-уведомлений через API
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fcm-upload-edit">Загрузить конфиг из файла (опционально)</Label>
              <div className="flex gap-2">
                <Input
                  id="fcm-upload-edit"
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
                    const input = document.getElementById('fcm-upload-edit') as HTMLInputElement;
                    if (input) input.value = '';
                    setFcmProjectId('');
                    setFcmPrivateKey('');
                    setFcmClientEmail('');
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
              <Label htmlFor="fcm-project-id">Project ID</Label>
              <Input
                id="fcm-project-id"
                placeholder="my-firebase-project"
                value={fcmProjectId}
                onChange={(e) => setFcmProjectId(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Идентификатор проекта Firebase
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fcm-client-email">Client Email</Label>
              <Input
                id="fcm-client-email"
                type="email"
                placeholder="firebase-adminsdk-xxxxx@my-project.iam.gserviceaccount.com"
                value={fcmClientEmail}
                onChange={(e) => setFcmClientEmail(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Email сервисного аккаунта
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fcm-private-key">Private Key</Label>
              <textarea
                id="fcm-private-key"
                placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvQIBADANBg...&#10;-----END PRIVATE KEY-----"
                value={fcmPrivateKey}
                onChange={(e) => setFcmPrivateKey(e.target.value)}
                className="w-full min-h-[120px] px-3 py-2 text-sm font-mono bg-background border border-input rounded-md resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Приватный ключ из Service Account JSON файла
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <Icon name="Info" size={20} className="text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Как получить данные:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Откройте Firebase Console</li>
                    <li>Перейдите в Project Settings → Service Accounts</li>
                    <li>Нажмите "Generate new private key"</li>
                    <li>Скопируйте нужные поля из JSON файла</li>
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
          {(selectedProvider?.usesWappi || selectedProvider?.usesPostbox || selectedProvider?.usesFcm) && (
            <Button 
              onClick={saveProviderConfig}
              disabled={
                (selectedProvider?.usesWappi && (!wappiToken || !wappiProfileId)) ||
                (selectedProvider?.usesPostbox && (!postboxAccessKey || !postboxSecretKey || !postboxFromEmail)) ||
                (selectedProvider?.usesFcm && (!fcmProjectId || !fcmPrivateKey || !fcmClientEmail)) ||
                isSaving
              }
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