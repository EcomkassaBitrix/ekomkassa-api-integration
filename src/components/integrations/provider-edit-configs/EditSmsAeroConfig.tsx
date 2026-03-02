import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { useState } from 'react';

interface Sign {
  name: string;
  status: string;
}

interface EditSmsAeroConfigProps {
  editProviderCode: string;
  smsAeroEmail: string;
  setSmsAeroEmail: (val: string) => void;
  smsAeroApiKey: string;
  setSmsAeroApiKey: (val: string) => void;
  smsAeroSign: string;
  setSmsAeroSign: (val: string) => void;
}

const EditSmsAeroConfig = ({
  editProviderCode,
  smsAeroEmail,
  setSmsAeroEmail,
  smsAeroApiKey,
  setSmsAeroApiKey,
  smsAeroSign,
  setSmsAeroSign,
}: EditSmsAeroConfigProps) => {
  const [copied, setCopied] = useState(false);
  const [signs, setSigns] = useState<Sign[]>([]);
  const [isLoadingSigns, setIsLoadingSigns] = useState(false);
  const [signsError, setSignsError] = useState('');

  const copyProviderCode = () => {
    navigator.clipboard.writeText(editProviderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadSigns = async () => {
    setIsLoadingSigns(true);
    setSignsError('');
    try {
      const resp = await fetch(
        `https://functions.poehali.dev/c55cf921-d1ec-4fc7-a6e2-59c730988a1e/signs?provider_code=${editProviderCode}`,
        { headers: { 'X-Api-Key': 'ek_live_j8h3k2n4m5p6q7r8' } }
      );
      const data = await resp.json();
      if (data.success && data.signs) {
        setSigns(data.signs);
      } else {
        setSignsError(data.error || 'Не удалось загрузить подписи');
      }
    } catch {
      setSignsError('Ошибка соединения');
    } finally {
      setIsLoadingSigns(false);
    }
  };

  const statusLabel = (status: string) => {
    if (status === 'approve') return '✓';
    if (status === 'reject') return '✗';
    return '~';
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="edit-smsaero-code">Код провайдера (provider_code)</Label>
        <div className="flex gap-2">
          <Input
            id="edit-smsaero-code"
            value={editProviderCode}
            className="font-mono text-sm flex-1"
            disabled
          />
          <Button variant="outline" size="sm" onClick={copyProviderCode} className="px-3">
            <Icon name={copied ? 'Check' : 'Copy'} size={16} className={copied ? 'text-green-500' : ''} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Используйте этот код в поле "provider" при отправке сообщений через API
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-smsaero-email">Логин (email)</Label>
        <Input
          id="edit-smsaero-email"
          type="email"
          placeholder="email@example.com"
          value={smsAeroEmail}
          onChange={(e) => setSmsAeroEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Email вашего аккаунта на smsaero.ru
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-smsaero-apikey">API ключ</Label>
        <Input
          id="edit-smsaero-apikey"
          type="password"
          placeholder="EpNGKz4-6qMiI5DOBbFoNZbPLRATDCY-"
          value={smsAeroApiKey}
          onChange={(e) => setSmsAeroApiKey(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Настройки → API → API ключ на smsaero.ru
        </p>
      </div>

      <div className="space-y-2">
        <Label>Имя отправителя</Label>
        <div className="flex gap-2">
          {signs.length > 0 ? (
            <Select value={smsAeroSign} onValueChange={setSmsAeroSign}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Выберите подпись" />
              </SelectTrigger>
              <SelectContent>
                {signs.map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    <span>{s.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{statusLabel(s.status)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="edit-smsaero-sign"
              placeholder="MyBrand"
              value={smsAeroSign}
              onChange={(e) => setSmsAeroSign(e.target.value)}
              className="flex-1"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadSigns}
            disabled={isLoadingSigns}
            className="px-3"
            title="Загрузить подписи из SMS Aero"
          >
            <Icon name={isLoadingSigns ? 'Loader2' : 'RefreshCw'} size={16} className={isLoadingSigns ? 'animate-spin' : ''} />
          </Button>
        </div>
        {signsError && <p className="text-xs text-destructive">{signsError}</p>}
        <p className="text-xs text-muted-foreground">
          Зарегистрированная подпись отправителя в SMS Aero
        </p>
      </div>
    </div>
  );
};

export default EditSmsAeroConfig;
