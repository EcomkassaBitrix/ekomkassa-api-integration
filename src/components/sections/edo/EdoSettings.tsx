import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { paytiFetch } from '../PaytiSettingsDialog';

export interface EdoField { code: string; label: string; items: string[] }
export interface EdoTemplate { template_id: string; name: string; enabled: boolean }
export type EdoSettingsData = Record<string, string | boolean | undefined>;

const selectCls = 'w-full h-10 rounded-md border border-input bg-background px-3 text-sm';

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="text-sm space-y-1 block">
    <span className="text-muted-foreground">{label}</span>
    {children}
    {hint && <span className="text-xs text-muted-foreground block">{hint}</span>}
  </label>
);

interface Props {
  s: EdoSettingsData;
  set: (patch: EdoSettingsData) => void;
  fields: EdoField[];
  templates: EdoTemplate[];
  onTemplates: (t: EdoTemplate[]) => void;
  onSave: () => Promise<void>;
}

const ValueSelect = ({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) => {
  if (!items.length) return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
  const options = value && !items.includes(value) ? [value, ...items] : items;
  return (
    <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Не выбрано</option>
      {options.map((i) => <option key={i} value={i}>{i}</option>)}
    </select>
  );
};

const str = (v: string | boolean | undefined) => (typeof v === 'string' ? v : '');

const EdoSettings = ({ s, set, fields, templates, onTemplates, onSave }: Props) => {
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');

  const say = (k: string, v: string) => setMsg((p) => ({ ...p, [k]: v }));

  const syncTemplates = async () => {
    setBusy('tpl');
    await onSave();
    const d = await paytiFetch('edo-templates-sync');
    setBusy('');
    if (!d.ok) return say('tpl', `Не удалось получить шаблоны: ${d.error}`);
    onTemplates(d.templates);
    say('tpl', `Найдено шаблонов: ${d.templates.length}`);
  };

  const toggle = async (t: EdoTemplate) => {
    const enabled = !t.enabled;
    onTemplates(templates.map((x) => (x.template_id === t.template_id ? { ...x, enabled } : x)));
    await paytiFetch('edo-template-save', { method: 'POST', body: { template_id: t.template_id, enabled } });
  };

  const test = async (provider: 'diadoc' | 'potok') => {
    setBusy(provider);
    await onSave();
    const d = await paytiFetch('edo-test', { query: `provider=${provider}` });
    setBusy('');
    if (!d.ok) return say(provider, d.error);
    const boxes = (d.boxes || []).map((b: { name: string; inn: string }) => `${b.name} (${b.inn})`).join(', ');
    say(provider, `${d.info}${boxes ? `. Организации: ${boxes}` : ''}`);
  };

  const field = fields.find((f) => f.code === s.edo_field);

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div>
          <p className="font-medium">Битрикс24</p>
          <p className="text-sm text-muted-foreground">Входящий вебхук с правами на CRM и генератор документов. Если поле пустое, используется общий вебхук проекта</p>
        </div>
        <Field label="Адрес входящего вебхука" hint={s.webhook_set ? `Сейчас сохранён: ${str(s.webhook_hint)}. Оставьте поле пустым, чтобы не менять` : undefined}>
          <Input type="password" autoComplete="off" value={str(s.bitrix_webhook_url)} onChange={(e) => set({ bitrix_webhook_url: e.target.value })} placeholder="https://домен.bitrix24.ru/rest/1/токен/" />
        </Field>
        <Field label="Поле сделки «Оператор ЭДО»" hint="По нему система выбирает, куда отправлять документы">
          <select className={selectCls} value={str(s.edo_field)} onChange={(e) => set({ edo_field: e.target.value })}>
            <option value="">Не выбрано</option>
            {fields.map((f) => <option key={f.code} value={f.code}>{f.label}</option>)}
          </select>
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Значение для Диадока" hint={field ? undefined : 'Сначала выберите поле выше'}>
            <ValueSelect items={field?.items || []} value={str(s.diadoc_value)} onChange={(v) => set({ diadoc_value: v })} />
          </Field>
          <Field label="Значение для ЭДО Потока">
            <ValueSelect items={field?.items || []} value={str(s.potok_value)} onChange={(v) => set({ potok_value: v })} />
          </Field>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="font-medium">Какие документы искать в сделке</p>
            <p className="text-sm text-muted-foreground">Отметьте шаблоны генератора документов, документы по которым нужно передавать в ЭДО</p>
          </div>
          <Button variant="outline" size="sm" onClick={syncTemplates} disabled={busy === 'tpl'}>{busy === 'tpl' ? 'Загружаю...' : 'Загрузить шаблоны из Битрикс24'}</Button>
        </div>
        {msg.tpl && <p className="text-sm text-muted-foreground">{msg.tpl}</p>}
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Шаблоны ещё не загружены</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-auto">
            {templates.map((t) => (
              <label key={t.template_id} className="flex items-center gap-2 text-sm rounded-md border border-border p-2 cursor-pointer">
                <input type="checkbox" checked={t.enabled} onChange={() => toggle(t)} />
                <span>{t.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">№{t.template_id}</span>
              </label>
            ))}
          </div>
        )}
        <Field label="В каком виде забирать файл">
          <select className={selectCls} value={str(s.file_format) || 'pdf'} onChange={(e) => set({ file_format: e.target.value })}>
            <option value="pdf">PDF</option>
            <option value="docx">Word (docx)</option>
            <option value="both">PDF и Word</option>
          </select>
        </Field>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <p className="font-medium">Диадок</p>
          <p className="text-sm text-muted-foreground">Доступ по протоколу Диадок API. Ключ интеграции выдаёт Контур</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Среда">
            <select className={selectCls} value={str(s.diadoc_env) || 'test'} onChange={(e) => set({ diadoc_env: e.target.value })}>
              <option value="test">Тестовая</option>
              <option value="prod">Рабочая</option>
            </select>
          </Field>
          <Field label="Ключ интеграции (client id)">
            <Input value={str(s.diadoc_client_id)} onChange={(e) => set({ diadoc_client_id: e.target.value })} />
          </Field>
          <Field label="Логин">
            <Input autoComplete="off" value={str(s.diadoc_login)} onChange={(e) => set({ diadoc_login: e.target.value })} />
          </Field>
          <Field label="Пароль" hint={s.diadoc_password_set ? 'Пароль сохранён. Оставьте пустым, чтобы не менять' : undefined}>
            <Input type="password" autoComplete="new-password" value={str(s.diadoc_password)} onChange={(e) => set({ diadoc_password: e.target.value })} />
          </Field>
          <Field label="Ящик отправителя (box id)">
            <Input value={str(s.diadoc_box_id)} onChange={(e) => set({ diadoc_box_id: e.target.value })} />
          </Field>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => test('diadoc')} disabled={busy === 'diadoc'}>{busy === 'diadoc' ? 'Проверяю...' : 'Проверить вход'}</Button>
          {msg.diadoc && <span className="text-sm text-muted-foreground">{msg.diadoc}</span>}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <p className="font-medium">ЭДО Поток</p>
          <p className="text-sm text-muted-foreground">Доступ по протоколу API ЭДО Потока. Адрес тестового и рабочего API выдаёт оператор</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Среда">
            <select className={selectCls} value={str(s.potok_env) || 'test'} onChange={(e) => set({ potok_env: e.target.value })}>
              <option value="test">Тестовая</option>
              <option value="prod">Рабочая</option>
            </select>
          </Field>
          <Field label="Адрес API">
            <Input value={str(s.potok_base_url)} onChange={(e) => set({ potok_base_url: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="Логин">
            <Input autoComplete="off" value={str(s.potok_login)} onChange={(e) => set({ potok_login: e.target.value })} />
          </Field>
          <Field label="Пароль" hint={s.potok_password_set ? 'Пароль сохранён. Оставьте пустым, чтобы не менять' : undefined}>
            <Input type="password" autoComplete="new-password" value={str(s.potok_password)} onChange={(e) => set({ potok_password: e.target.value })} />
          </Field>
          <Field label="Организация отправителя">
            <Input value={str(s.potok_org_id)} onChange={(e) => set({ potok_org_id: e.target.value })} />
          </Field>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => test('potok')} disabled={busy === 'potok'}>{busy === 'potok' ? 'Проверяю...' : 'Проверить адрес'}</Button>
          {msg.potok && <span className="text-sm text-muted-foreground">{msg.potok}</span>}
        </div>
      </Card>
    </div>
  );
};

export default EdoSettings;
