import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface WappiConfigFieldsProps {
  wappiToken: string;
  setWappiToken: (token: string) => void;
  wappiProfileId: string;
  setWappiProfileId: (id: string) => void;
}

const WappiConfigFields = ({
  wappiToken,
  setWappiToken,
  wappiProfileId,
  setWappiProfileId,
}: WappiConfigFieldsProps) => {
  return (
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
          value={wappiToken}
          onChange={(e) => setWappiToken(e.target.value)}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-wappi-profile">Profile ID</Label>
        <Input
          id="new-wappi-profile"
          placeholder="Введите ID профиля"
          value={wappiProfileId}
          onChange={(e) => setWappiProfileId(e.target.value)}
          className="font-mono text-sm"
        />
      </div>
    </>
  );
};

export default WappiConfigFields;
