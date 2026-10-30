import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { paytiFetch } from '../PaytiSettingsDialog';

export interface EdoField { code: string; label: string; items: string[] }
export interface DocType { id: number; name: string }
export interface EdoTemplate { template_id: string; name: string }
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

const EdoSettings = ({ s, set, fields, onSave }: Props) => {
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [types, setTypes] = useState<DocType[]>([]);

  useEffect(() => {
    paytiFetch('edo-potok-types').then((d) => setTypes(d.types || []));
  }, []);

  const say = (k: string, v: string) => setMsg((p) => ({ ...p, [k]: v }));

  const test = async (provider: 'diadoc' | 'potok') => {
    setBusy(provider);
    await onSave();
    const d = await paytiFetch('edo-test', { query: `provider=${provider}` });
    setBusy('');
    if (!d.ok) return say(provider, d.error);
    const boxes = (d.boxes || []).map((b: { name: string; inn: string }) => `${b.name} (${b.inn})`).join(', ');
    if (provider === 'potok') setTypes(d.types || []);
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
          <p className="text-sm text-muted-foreground">
            Вход по ID ЭДО и паролю организации (пароль выдаёт поддержка edo@edo.ru) либо по e-mail и паролю сотрудника из личного кабинета. Ключ доступа система получает сама и обновляет раз в сутки
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="ID ЭДО организации или e-mail сотрудника" hint="Например 2PS-0078414651 или user@company.ru">
            <Input autoComplete="off" value={str(s.potok_login)} onChange={(e) => set({ potok_login: e.target.value })} />
          </Field>
          <Field label="Пароль" hint={s.potok_password_set ? 'Пароль сохранён. Оставьте пустым, чтобы не менять' : 'Пароль организации или сотрудника, в зависимости от логина'}>
            <Input type="password" autoComplete="new-password" value={str(s.potok_password)} onChange={(e) => set({ potok_password: e.target.value })} />
          </Field>
          <Field label="Организация отправителя" hint="Нужна, если у сотрудника несколько организаций: ID ЭДО или ИНН. Пусто — берётся первая">
            <Input value={str(s.potok_org_id)} onChange={(e) => set({ potok_org_id: e.target.value })} />
          </Field>
          <Field label="Адрес API" hint="Обычно менять не нужно">
            <Input value={str(s.potok_base_url)} onChange={(e) => set({ potok_base_url: e.target.value })} placeholder="https://lk.edo.ru/api/edo/v1" />
          </Field>
          <Field label="Тип документа по умолчанию" hint="Берётся из справочника Потока. Для отдельных правил можно выбрать другой">
            <select className={selectCls} value={str(s.potok_doc_type)} onChange={(e) => set({ potok_doc_type: e.target.value })}>
              <option value="">Не выбрано</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              {str(s.potok_doc_type) && !types.some((t) => String(t.id) === str(s.potok_doc_type)) && <option value={str(s.potok_doc_type)}>Тип №{str(s.potok_doc_type)}</option>}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm self-end pb-2">
            <input type="checkbox" checked={s.potok_sign_requested !== false} onChange={(e) => set({ potok_sign_requested: e.target.checked })} />
            Запрашивать подпись у клиента
          </label>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => test('potok')} disabled={busy === 'potok'}>{busy === 'potok' ? 'Проверяю...' : 'Проверить вход и загрузить типы документов'}</Button>
          {msg.potok && <span className="text-sm text-muted-foreground">{msg.potok}</span>}
        </div>
      </Card>
    </div>
  );
};

export default EdoSettings;
