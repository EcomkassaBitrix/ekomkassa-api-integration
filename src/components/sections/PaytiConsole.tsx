import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import PaytiSettingsDialog, { paytiFetch, PAYTI_URL } from './PaytiSettingsDialog';
import AttemptsHistory from './AttemptsHistory';
import HookCollapsible from './HookCollapsible';

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
  login?: string;
  password?: string;
  storeId?: string;
  firmId?: string;
  mode?: string;
  modeSource?: string;
  cashType?: string;
}

const STATUS_TEXT: Record<string, string> = {
  success: 'Клиент успешно зарегистрирован в Payti',
  already_registered: 'Эта сделка уже зарегистрирована на этом контуре. Включите «Повторить принудительно», если нужен повтор',
  unsupported_type: 'Тип кассы не подходит для автоматической регистрации в Payti. Ничего не отправлено',
  validation_failed: 'Не хватает данных для регистрации. Заполните поля вручную или поправьте CRM',
  payti_validation_error: 'Payti отклонил данные (400). Проверьте значения полей',
  duplicate: 'Payti сообщает, что такой клиент уже есть (409)',
  temporary_error: 'Временная ошибка Payti или сети. Клиент мог частично создаться, проверьте перед повтором',
};

const CopyBtn = ({ text }: { text: string }) => (
  <button className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1" onClick={() => navigator.clipboard.writeText(text)}>
    <Icon name="Copy" size={12} />
    копировать
  </button>
);

const PaytiConsole = () => {
  const [meta, setMeta] = useState<any>(null);
  const [dealId, setDealId] = useState('');
  const [env, setEnv] = useState<'test' | 'prod'>('test');
  const [mode, setMode] = useState<'' | 'A' | 'R'>('');
  const [force, setForce] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hookEnv, setHookEnv] = useState<'test' | 'prod'>('test');
  const [hookMode, setHookMode] = useState<'A' | 'R' | ''>('A');
  const [historyKey, setHistoryKey] = useState(0);

  const loadMeta = () => paytiFetch('meta').then(setMeta);
  useEffect(() => {
    loadMeta();
  }, []);

  const run = async (action: 'deal-preview' | 'dry-run' | 'register') => {
    if (!dealId.trim()) return;
    if (action === 'register' && env === 'prod' && !window.confirm('Будет создан реальный клиент в Payti. Продолжить?')) return;
    setBusy(action);
    const data = await paytiFetch(action, {
      method: 'POST',
      body: { dealId, environment: env, mode, force, overrides },
    });
    setRes(data);
    setBusy('');
    if (action === 'register') setHistoryKey((k) => k + 1);
  };

  const missing = (res?.fields || []).filter((f) => !f.value);
  const hookUrl = `${PAYTI_URL}?action=hook&env=${hookEnv}${hookMode ? `&mode=${hookMode}` : ''}&key=ВАШ_КЛЮЧ&dealId={{ID}}`;
  const creds = res?.status === 'success' ? [
    ['Логин', res.login], ['Пароль', res.password], ['ID магазина', res.storeId],
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
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
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs uppercase text-muted-foreground">ID сделки</label>
            <Input value={dealId} onChange={(e) => setDealId(e.target.value)} placeholder="12345" />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase text-muted-foreground">Контур</label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={env} onChange={(e) => setEnv(e.target.value as 'test' | 'prod')}>
              <option value="test">TEST — тестовый сервер</option>
              <option value="prod">PROD — боевой сервер</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase text-muted-foreground">Режим</label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={mode} onChange={(e) => setMode(e.target.value as '' | 'A' | 'R')}>
              <option value="">По правилу из настроек</option>
              <option value="A">A — агентский, с кассой</option>
              <option value="R">R — обычный, без кассы</option>
            </select>
            {!mode && res?.modeSource && <p className="text-xs text-muted-foreground">Определён: {res.mode} ({res.modeSource})</p>}
          </div>
        </div>

        {env === 'prod' && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <Icon name="TriangleAlert" size={16} />
            Боевой контур: будет создан реальный клиент в Payti.
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" onClick={() => run('deal-preview')} disabled={!!busy || !dealId}>
            {busy === 'deal-preview' ? 'Загружаю...' : 'Загрузить сделку'}
          </Button>
          <Button variant="outline" onClick={() => run('dry-run')} disabled={!!busy || !dealId}>
            {busy === 'dry-run' ? 'Проверяю...' : 'Проверка без отправки'}
          </Button>
          <Button variant={env === 'prod' ? 'destructive' : 'default'} onClick={() => run('register')} disabled={!!busy || !dealId}>
            {busy === 'register' ? 'Регистрирую...' : `Зарегистрировать в ${env.toUpperCase()}`}
          </Button>
          <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
            Повторить, даже если уже зарегистрирован
          </label>
        </div>
      </Card>

      <HookCollapsible>
        <p className="text-sm text-muted-foreground">Соберите ссылку и подставьте свой ключ — остальные параметры уже в ней.</p>
        <div className="flex gap-6 text-sm items-center flex-wrap">
          <div className="flex gap-2 items-center">
            <span className="text-xs uppercase text-muted-foreground">Контур</span>
            {(['prod', 'test'] as const).map((e) => (
              <Button key={e} size="sm" variant={hookEnv === e ? 'default' : 'outline'} onClick={() => setHookEnv(e)}>{e.toUpperCase()}</Button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs uppercase text-muted-foreground">Режим</span>
            {([['A', 'A — агентский'], ['R', 'R — обычный'], ['', 'По правилу']] as const).map(([m, l]) => (
              <Button key={l} size="sm" variant={hookMode === m ? 'default' : 'outline'} onClick={() => setHookMode(m)}>{l}</Button>
            ))}
          </div>
        </div>
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
        <p className="text-xs text-muted-foreground">
          Вместо ВАШ_КЛЮЧ подставьте любой активный ключ из раздела «API Ключи». Режим в ссылке сильнее правила из настроек.
        </p>
      </HookCollapsible>

      {res && (
        <Card className={`p-4 text-sm ${res.ok ? 'border-primary/40' : 'border-destructive/40'}`}>
          <p className="font-medium">
            {(res.status && STATUS_TEXT[res.status]) || (res.ok ? 'Данные собраны, ошибок нет' : res.error || 'Есть ошибки')}
          </p>
          {(res.cashType || res.mode !== undefined) && (
            <div className="flex gap-6 mt-2 text-muted-foreground flex-wrap">
              {res.cashType !== undefined && <span>Тип кассы: <b className="text-foreground">{res.cashType || 'не указан'}</b></span>}
              <span>
                Режим скрипта:{' '}
                <b className="text-foreground">
                  {res.mode === 'A' ? 'A — агентский, с кассой' : res.mode === 'R' ? 'R — обычный, регистрация в ЛК' : 'не определён, регистрация не будет выполнена'}
                </b>
              </span>
              {res.modeSource && <span>({res.modeSource})</span>}
            </div>
          )}
          {res.errors && res.errors.length > 0 && (
            <ul className="list-disc pl-5 mt-2 text-destructive">
              {res.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          {!res.ok && (
            <button className="mt-2 underline text-muted-foreground" onClick={() => setSettingsOpen(true)}>Открыть настройки полей</button>
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
        </Card>
      )}

      {creds.length > 0 && (
        <Card className="p-4 space-y-2">
          <p className="text-sm font-medium">Доступы клиента</p>
          {creds.map(([l, v]) => (
            <div key={l} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground w-32">{l}</span>
              <span className="font-mono flex-1">{v || '—'}</span>
              {v && <CopyBtn text={v} />}
            </div>
          ))}
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
                    {f.value || f.path === 'user.password' ? (
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
          {missing.length > 0 && (
            <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
              Введите недостающие значения и снова нажмите «Проверка без отправки».
            </p>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground mb-2">Запрос</p>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all max-h-72 overflow-auto">
            {res?.request ? JSON.stringify(res.request, null, 2) : 'Нажмите «Загрузить сделку» или «Проверка без отправки»'}
          </pre>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground mb-2">Ответ Payti</p>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all max-h-72 overflow-auto">
            {res?.response ? JSON.stringify(res.response, null, 2) : 'Ответ появится после регистрации'}
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

      <AttemptsHistory action="history" refreshKey={historyKey} />

      <PaytiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} meta={meta} onSaved={loadMeta} />
    </div>
  );
};

export default PaytiConsole;
