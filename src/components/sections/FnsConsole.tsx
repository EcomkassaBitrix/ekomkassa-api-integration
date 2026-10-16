import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { paytiFetch, PAYTI_URL } from './PaytiSettingsDialog';
import HookCollapsible from './HookCollapsible';
import FnsSettingsDialog from './FnsSettingsDialog';
import FnsJournal from './FnsJournal';

interface FieldRow {
  path: string;
  label: string;
  value: string;
  source: string;
  method: string;
}
interface Result {
  ok?: boolean;
  status?: string;
  error?: string;
  fields?: FieldRow[];
  errors?: string[];
  links?: Record<string, string>;
  request?: unknown;
  warnings?: string[];
  link?: string;
  mode?: string;
  purpose?: string | null;
  purposeSource?: string;
}

const PURPOSES: [string, string][] = [
  ['', 'По полю сделки'],
  ['InitialRegistration', 'Регистрация'],
  ['Reregistration', 'Перерегистрация'],
  ['Unregistration', 'Снятие с учёта'],
  ['Report', 'Отчёт о регистрации'],
];
const PURPOSE_NAME: Record<string, string> = {
  InitialRegistration: 'Регистрация кассы',
  Reregistration: 'Перерегистрация кассы',
  Unregistration: 'Снятие кассы с учёта',
  Report: 'Отчёт о регистрации',
};

const STATUS_TEXT: Record<string, string> = {
  created: 'Заявка создана в ОФД. Отправьте клиенту ссылку для подписи',
  test_created: 'Тестовая заявка создана, в ОФД ничего не отправлено. Откройте ссылку и пройдите подпись',
  link_exists: 'По сделке уже есть действующая ссылка для подписи',
  already_registered: 'Заявка по этой сделке уже отправлена в ФНС',
  no_application: 'Нет заявки на регистрацию, которая ждёт отчёта. Обновите статус заявки в журнале после ответа ФНС',
  validation_failed: 'Не хватает данных. Заполните поля вручную или поправьте CRM',
  ofd_validation_error: 'ОФД отклонил данные заявки',
  ofd_error: 'ОФД не принял запрос',
  temporary_error: 'Временная ошибка ОФД или сети',
};

const CopyBtn = ({ text }: { text: string }) => (
  <button className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1" onClick={() => navigator.clipboard.writeText(text)}>
    <Icon name="Copy" size={12} />
    копировать
  </button>
);

const FnsConsole = () => {
  const [meta, setMeta] = useState<any>(null);
  const [dealId, setDealId] = useState('');
  const [force, setForce] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [journalKey, setJournalKey] = useState(0);
  const [hookTest, setHookTest] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [hookPurpose, setHookPurpose] = useState('');
  const [access, setAccess] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const checkAccess = async () => {
    setChecking(true);
    setAccess(await paytiFetch('fns-access-check'));
    setChecking(false);
  };

  const loadMeta = () => paytiFetch('fns-meta').then(setMeta);
  useEffect(() => {
    loadMeta();
  }, []);

  const preview = async () => {
    if (!dealId.trim()) return;
    setBusy('preview');
    setRes(await paytiFetch('fns-preview', { method: 'POST', body: { dealId, overrides, purpose } }));
    setBusy('');
  };

  const create = async (mode: 'test' | 'real') => {
    if (!dealId.trim()) return;
    if (mode === 'real' && !window.confirm('Будет создана реальная заявка в ОФД на регистрацию кассы. Продолжить?')) return;
    setBusy(mode);
    const d = await paytiFetch('fns-create', { method: 'POST', body: { dealId, mode, force, overrides, purpose, origin: window.location.origin } });
    setRes({ ...d, fields: res?.fields, links: res?.links });
    setBusy('');
    setJournalKey((k) => k + 1);
  };

  const hookUrl = `${PAYTI_URL}?action=fns-hook${hookTest ? '&mode=test' : ''}${hookPurpose ? `&purpose=${hookPurpose}` : ''}&key=ВАШ_КЛЮЧ&dealId={{ID}}`;
  const missing = res?.fields?.filter((f) => !f.value) || [];
  const optionsOf = (path: string) => meta?.fields?.find((m: { path: string }) => m.path === path)?.options || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={meta?.bitrixConfigured ? 'default' : 'destructive'}>
            {meta?.bitrixConfigured ? 'Битрикс24 подключён' : 'Битрикс24 не подключён'}
          </Badge>
          <button className="text-xs underline text-muted-foreground hover:text-foreground" onClick={checkAccess} disabled={checking}>
            {checking ? 'Проверяю...' : 'Проверить партнёрский ключ'}
          </button>
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
        <div className="space-y-1">
          <label className="text-xs uppercase text-muted-foreground">Назначение</label>
          <div className="flex gap-2 flex-wrap">
            {PURPOSES.map(([code, label]) => (
              <Button key={label} size="sm" variant={purpose === code ? 'default' : 'outline'} onClick={() => setPurpose(code)}>{label}</Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" onClick={preview} disabled={!!busy || !dealId}>
            {busy === 'preview' ? 'Проверяю...' : 'Проверка без отправки'}
          </Button>
          <Button variant="outline" onClick={() => create('test')} disabled={!!busy || !dealId}>
            {busy === 'test' ? 'Создаю...' : 'Тестовая заявка (без ОФД)'}
          </Button>
          <Button onClick={() => create('real')} disabled={!!busy || !dealId}>
            {busy === 'real' ? 'Создаю...' : 'Создать заявку в ОФД'}
          </Button>
          <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
            Создать новую, даже если ссылка уже есть
          </label>
        </div>
      </Card>

      {access && (
        <Card className="p-4 text-sm space-y-2">
          <p className="font-medium">
            {access.partnerKeyAccepted ? 'ОФД принимает партнёрский ключ на методах заявок' : 'ОФД не принимает партнёрский ключ на методах заявок'}
          </p>
          {access.probes.map((p: any) => (
            <div key={p.name} className="flex justify-between gap-4 text-xs">
              <span className="text-muted-foreground">{p.name}</span>
              <span className="font-mono break-all text-right">{p.skipped ? 'пропущено' : p.error || `${p.http} ${p.body || ''}`}</span>
            </div>
          ))}
          {!access.partnerKeyAccepted && <p className="text-xs text-muted-foreground">Для заявок используется логин и пароль кабинета ОФД клиента из CRM.</p>}
        </Card>
      )}

      <HookCollapsible>
        <div className="flex gap-2 items-center text-sm flex-wrap">
          <span className="text-xs uppercase text-muted-foreground">Назначение</span>
          {PURPOSES.map(([code, label]) => (
            <Button key={label} size="sm" variant={hookPurpose === code ? 'default' : 'outline'} onClick={() => setHookPurpose(code)}>{label}</Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">«По полю сделки» берёт назначение из поля, указанного в настройках полей. Для отчёта о регистрации обычно нужен отдельный робот на стадии после ответа ФНС.</p>
        <div className="flex gap-2 items-center text-sm">
          <span className="text-xs uppercase text-muted-foreground">Режим</span>
          {([[false, 'Боевой: заявка в ОФД'], [true, 'Тестовый: без ОФД']] as const).map(([t, l]) => (
            <Button key={l} size="sm" variant={hookTest === t ? 'default' : 'outline'} onClick={() => setHookTest(t)}>{l}</Button>
          ))}
        </div>
        <div className="rounded-md bg-muted/50 p-4">
          <div className="flex justify-between mb-1">
            <span className="text-xs uppercase text-muted-foreground">Для робота в сделке</span>
            <CopyBtn text={hookUrl} />
          </div>
          <p className="font-mono text-xs break-all">{hookUrl}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Робот «Исходящий вебхук» на нужной стадии: вставьте ссылку в поле «Хендлер». Он создаст заявку и положит ссылку для подписи в комментарий сделки.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Вместо ВАШ_КЛЮЧ подставьте любой активный ключ из раздела «API Ключи». Ссылка клиенту строится от адреса сайта из настроек полей.</p>
      </HookCollapsible>

      {res && (
        <Card className={`p-4 text-sm ${res.ok ? 'border-primary/40' : 'border-destructive/40'}`}>
          {res.purpose && <p className="text-xs uppercase text-muted-foreground mb-1">{PURPOSE_NAME[res.purpose] || res.purpose}{res.purposeSource ? ` · ${res.purposeSource}` : ''}</p>}
          <p className="font-medium">{(res.status && STATUS_TEXT[res.status]) || (res.ok ? 'Данные собраны, ошибок нет' : res.error || 'Есть ошибки')}</p>
          {res.errors && res.errors.length > 0 && (
            <ul className="list-disc pl-5 mt-2 text-destructive">
              {res.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          {res.warnings && res.warnings.length > 0 && (
            <ul className="list-disc pl-5 mt-2 text-muted-foreground">
              {res.warnings.map((e) => <li key={e}>{e} (нужно для боевой заявки, для теста не требуется)</li>)}
            </ul>
          )}
          {res.error && res.status && !STATUS_TEXT[res.status] && <p className="text-destructive mt-1">{res.error}</p>}
          {!res.ok && <button className="mt-2 underline text-muted-foreground" onClick={() => setSettingsOpen(true)}>Открыть настройки полей</button>}
          {res.link && (
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 mt-3 gap-3">
              <span className="text-muted-foreground shrink-0">Ссылка клиенту</span>
              <a href={res.link} target="_blank" rel="noreferrer" className="font-mono text-xs underline break-all flex-1">{res.link}</a>
              <CopyBtn text={res.link} />
            </div>
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
                    {f.value || f.path === 'Kpp' ? (
                      <span className="font-mono">{f.value || '—'}</span>
                    ) : optionsOf(f.path) ? (
                      <select
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                        value={overrides[f.path] || ''}
                        onChange={(e) => setOverrides({ ...overrides, [f.path]: e.target.value })}
                      >
                        <option value="">Не заполнено, выберите</option>
                        {optionsOf(f.path)!.map((o: { value: string; label: string }) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
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
          {missing.some((f) => f.path !== 'Kpp') && (
            <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border">Введите недостающие значения и снова нажмите «Проверка без отправки».</p>
          )}
        </Card>
      )}

      {res?.request !== undefined && (
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground mb-2">Запрос в ОФД (создание заявки)</p>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all max-h-72 overflow-auto">{JSON.stringify(res.request, null, 2)}</pre>
        </Card>
      )}

      <FnsJournal refreshKey={journalKey} baseUrl={window.location.origin} />

      <FnsSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} meta={meta} onSaved={loadMeta} />
    </div>
  );
};

export default FnsConsole;
