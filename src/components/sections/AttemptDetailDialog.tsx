import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { paytiFetch } from './PaytiSettingsDialog';

export type AttemptKind = 'payti' | 'ofd' | 'fns';

interface Props {
  kind: AttemptKind;
  id: number | null;
  onClose: () => void;
}

interface Ev {
  step: string;
  ok: boolean;
  info: string;
}

const TITLE: Record<AttemptKind, string> = { payti: 'Екомкасса (Payti)', ofd: 'ОФД: личный кабинет', fns: 'Регистрация кассы в ФНС' };

const HINTS: Record<string, string> = {
  AlreadyExists: 'В ОФД эта компания уже заведена. Новый кабинет не нужен: клиент может войти в существующий или восстановить пароль на ofd.ru.',
  validation_failed: 'Запрос в сервис не отправлялся: не хватило данных в CRM. Список недостающего показан ниже.',
  already_exists: 'Такая запись уже есть на стороне сервиса, повторно создавать её не нужно.',
  duplicate: 'По этой сделке уже была успешная попытка, повтор не выполнялся.',
  temporary_error: 'Сервис не ответил или была сеть. Запись могла частично создаться, проверьте перед повтором.',
};

const pretty = (v: unknown) => (v === null || v === undefined ? '' : JSON.stringify(v, null, 2));

const Block = ({ title, value }: { title: string; value: unknown }) => {
  const text = pretty(value);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase text-muted-foreground">{title}</p>
        {text && (
          <button className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1" onClick={() => navigator.clipboard.writeText(text)}>
            <Icon name="Copy" size={12} />
            копировать
          </button>
        )}
      </div>
      <pre className="rounded-md bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap break-all max-h-64 overflow-auto">
        {text || 'Не сохранён: запрос в сервис не отправлялся'}
      </pre>
    </div>
  );
};

const AttemptDetailDialog = ({ kind, id, onClose }: Props) => {
  const [data, setData] = useState<{ item: any; events: Ev[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id === null) return;
    setData(null);
    setError('');
    paytiFetch('attempt-detail', { query: `kind=${kind}&id=${id}` }).then((d) => (d.item ? setData(d) : setError(d.error || 'Не удалось загрузить')));
  }, [id, kind]);

  const it = data?.item;
  const failed = it && !['success', 'approved', 'sent_to_fns', 'created', 'test_created', 'test_signed', 'test_awaiting_signature', 'awaiting_signature'].includes(it.status);
  const hint = it && (HINTS[it.error_code] || HINTS[it.status]);

  return (
    <Dialog open={id !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Попытка по сделке {it?.deal_id || ''}</DialogTitle>
          <DialogDescription>{TITLE[kind]}</DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {!data && !error && <p className="text-sm text-muted-foreground">Загрузка...</p>}

        {it && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap text-sm">
              <Badge variant={failed ? 'destructive' : 'default'}>{it.status}</Badge>
              {it.http_status && <span className="text-muted-foreground">HTTP {it.http_status}</span>}
              {it.error_code && <span className="font-mono text-xs">{it.error_code}</span>}
              <span className="text-muted-foreground ml-auto">{new Date(String(it.created_at).replace(' ', 'T') + 'Z').toLocaleString('ru-RU')}</span>
            </div>

            {(it.error_message || it.status_reason) && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
                <p className="font-medium text-destructive">Что пошло не так</p>
                <p className="mt-1 break-words">{it.error_message || it.status_reason}</p>
              </div>
            )}
            {hint && <p className="text-sm text-muted-foreground">{hint}</p>}

            {data!.events.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs uppercase text-muted-foreground">Шаги</p>
                {data!.events.map((e, i) => (
                  <div key={i} className="flex gap-3 text-xs py-0.5">
                    <Icon name={e.ok ? 'Check' : 'X'} size={14} className={e.ok ? 'text-primary' : 'text-destructive'} />
                    <span className="w-44 shrink-0">{e.step}</span>
                    <span className="text-muted-foreground break-all">{e.info}</span>
                  </div>
                ))}
              </div>
            )}

            <Block title="Запрос" value={it.request} />
            <Block title="Ответ сервиса" value={it.response} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AttemptDetailDialog;
