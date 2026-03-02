import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface SandboxResponseProps {
  response: Record<string, unknown>;
}

const SandboxResponse = ({ response }: SandboxResponseProps) => {
  return (
    <Card className={`p-4 ${response.success ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
      <div className="flex items-start gap-3">
        <Icon
          name={response.success ? "CheckCircle" : "XCircle"}
          size={20}
          className={response.success ? "text-green-500 mt-0.5" : "text-destructive mt-0.5"}
        />
        <div className="flex-1">
          <p className={`font-medium mb-2 ${response.success ? 'text-green-500' : 'text-destructive'}`}>
            {response.success ? 'Сообщение отправлено!' : 'Ошибка отправки'}
          </p>
          {response.message_id && (
            <p className="text-sm text-muted-foreground mb-1">
              ID сообщения: <code className="font-mono text-xs">{response.message_id as string}</code>
            </p>
          )}
          {response.error && (
            <p className="text-sm text-muted-foreground">
              {response.error as string}
            </p>
          )}
          {response.status && (
            <p className="text-sm text-muted-foreground">
              Статус: {response.status as string}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SandboxResponse;
