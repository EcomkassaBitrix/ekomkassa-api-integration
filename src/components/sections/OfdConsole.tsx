import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { paytiFetch, PAYTI_URL } from './PaytiSettingsDialog';
import AttemptsHistory from './AttemptsHistory';
import HookCollapsible from './HookCollapsible';
import OfdSettingsDialog from './OfdSettingsDialog';
import HookLog from './HookLog';

interface FieldRow {
  path: string;
  label: string;
  value: string;
  source: string;
  method: string;
}
interface Step {
  step: string;
  ok: boolean;
  info: string;
}
interface Result {
  ok?: boolean;
  status?: string;
  error?: string;
  fields?: FieldRow[];
  errors?: string[];
  steps?: Step[];
  links?: Record<string, string>;
  request?: unknown;
  response?: unknown;
  email?: string;
  agreementId?: string;
}

const STATUS_TEXT: Record<string, string> = {
  success: 'Личный кабинет создан. Клиенту ушло письмо со ссылкой для создания логина и пароля',
  already_registered: 'По этой сделке кабинет в ОФД уже создан. Включите «Повторить принудительно», если нужен повтор',
  already_exists: 'В ОФД такая компания или пользователь уже существует',
  validation_failed: 'Не хватает данных для создания кабинета. Заполните поля вручную или поправьте CRM',
  ofd_validation_error: 'ОФД отклонил данные. Проверьте ИНН, название и email',
  temporary_error: 'Временная ошибка ОФД или сети. Кабинет мог частично создаться, проверьте перед повтором',
};

const CopyBtn = ({ text }: { text: string }) => (
  <button className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1" onClick={() => navigator.clipboard.writeText(text)}>
    <Icon name="Copy" size={12} />
    копировать
  </button>
);

const OfdConsole = () => {
  const [meta, setMeta] = useState<any>(null);
  const [dealId, setDealId] = useState('');
  const [force, setForce] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const loadMeta = () => paytiFetch('ofd-meta').then(setMeta);
  useEffect(() => {
    loadMeta();
  }, []);

  const run = async (action: 'ofd-preview' | 'ofd-register') => {
    if (!dealId.trim()) return;
    if (action === 'ofd-register' && !window.confirm('Будет создан реальный личный кабинет в ОФД, клиенту уйдёт письмо. Продолжить?')) return;
    setBusy(action);
    setRes(await paytiFetch(action, { method: 'POST', body: { dealId, force, overrides } }));
    setBusy('');
    if (action === 'ofd-register') setHistoryKey((k) => k + 1);
  };

  const hookUrl = `${PAYTI_URL}?action=ofd-hook&key=ВАШ_КЛЮЧ&dealId={{ID}}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={meta?.ofdKeyConfigured ? 'default' : 'destructive'}>
            {meta?.ofdKeyConfigured ? 'Ключ ОФД задан' : 'Ключ ОФД не задан'}
          </Badge>
          <Badge variant={meta?.bitrixConfigured ? 'default' : 'destructive'}>
            {meta?.bitrixConfigured ? 'Битрикс24 подключён' : 'Битрикс24 не подключён'}
          </Badge>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setSettingsOpen(true)}>
          <Icon name="Settings" size={16} />
          Настройки полей
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-1 max-w-sm">
          <label className="text-xs uppercase text-muted-foreground">ID сделки</label>
          <Input value={dealId} onChange={(e) => setDealId(e.target.value)} placeholder="12345" />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" onClick={() => run('ofd-preview')} disabled={!!busy || !dealId}>
            {busy === 'ofd-preview' ? 'Проверяю...' : 'Проверка без отправки'}
          </Button>
          <Button onClick={() => run('ofd-register')} disabled={!!busy || !dealId}>
            {busy === 'ofd-register' ? 'Создаю...' : 'Создать кабинет в ОФД'}
          </Button>
          <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
            Повторить, даже если уже создан
          </label>
        </div>
      </Card>

      <HookCollapsible>
        <div className="rounded-md bg-muted/50 p-4">
          <div className="flex justify-between mb-1">
            <span className="text-xs uppercase text-muted-foreground">Для робота в сделке</span>
            <CopyBtn text={hookUrl} />
          </div>
          <p className="font-mono text-xs break-all">{hookUrl}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Робот «Исходящий вебхук» на нужной стадии: вставьте ссылку в поле «Хендлер». {'{{ID}}'} робот заменит номером сделки сам.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Вместо ВАШ_КЛЮЧ подставьте любой активный ключ из раздела «API Ключи»: он общий для Payti и ОФД.</p>
      </HookCollapsible>

      {res && (
        <Card className={`p-4 text-sm ${res.ok ? 'border-primary/40' : 'border-destructive/40'}`}>
          <p className="font-medium">
            {(res.status && STATUS_TEXT[res.status]) || (res.ok ? 'Данные собраны, ошибок нет' : res.error || 'Есть ошибки')}
          </p>
          {res.errors && res.errors.length > 0 && (
            <ul className="list-disc pl-5 mt-2 text-destructive">
              {res.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          {res.links && (
            <div className="flex gap-4 mt-3">
              {Object.entries(res.links).map(([k, v]) => (
                <a key={k} href={v} target="_blank" rel="noreferrer" className="underline">
                  {k === 'deal' ? 'Сделка' : k === 'company' ? 'Компания' : 'Контакт'}
                </a>
              ))}
            </div>
          )}
          {res.agreementId && (
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 mt-3">
              <span className="text-muted-foreground">ID организации в ОФД</span>
              <span className="font-mono">{res.agreementId}</span>
              <CopyBtn text={res.agreementId} />
            </div>
          )}
        </Card>
      )}

      {res?.fields && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Поле</th>
                <th className="text-left px-4 py-2 font-medium">Значение</th>
                <th className="text-left px-4 py-2 font-medium">Источник</th>
              </tr>
            </thead>
            <tbody>
              {res.fields.map((f) => (
                <tr key={f.path} className="border-t border-border">
                  <td className="px-4 py-2">{f.label}</td>
                  <td className="px-4 py-2">
                    {f.value ? (
                      <span className="font-mono">{f.value}</span>
                    ) : (
                      <Input
                        className="h-8"
                        placeholder="Не заполнено, введите вручную"
                        value={overrides[f.path] || ''}
                        onChange={(e) => setOverrides({ ...overrides, [f.path]: e.target.value })}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {f.source} <Badge variant="secondary" className="ml-1">{f.method}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground mb-2">Запрос в ОФД</p>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all max-h-72 overflow-auto">
            {res?.request ? JSON.stringify(res.request, null, 2) : 'Нажмите «Проверка без отправки»'}
          </pre>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground mb-2">Ответ ОФД</p>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all max-h-72 overflow-auto">
            {res?.response ? JSON.stringify(res.response, null, 2) : 'Ответ появится после создания кабинета'}
          </pre>
        </Card>
      </div>

      <Card className="p-4">
        <p className="text-xs uppercase text-muted-foreground mb-2">Ход выполнения</p>
        {res?.steps?.length ? (
          <ul className="space-y-1 text-sm">
            {res.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <Icon name={s.ok ? 'CircleCheck' : 'CircleAlert'} size={16} className={s.ok ? 'text-primary' : 'text-destructive'} />
                <span className="font-medium">{s.step}</span>
                <span className="text-muted-foreground">{s.info}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Журнал появится после запуска.</p>
        )}
      </Card>

      <AttemptsHistory action="ofd-history" refreshKey={historyKey} />
      <HookLog kind="ofd" refreshKey={historyKey} />

      <OfdSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} meta={meta} onSaved={loadMeta} />
    </div>
  );
};

export default OfdConsole;
