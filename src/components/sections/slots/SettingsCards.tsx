import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { paytiFetch } from '../PaytiSettingsDialog';
import { BitrixUser, Meta, SlotSettings, Stage, selectCls } from './types';

interface Props {
  meta: Meta;
  s: SlotSettings;
  set: (patch: Partial<SlotSettings>) => void;
}

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="text-sm space-y-1 block">
    <span className="text-muted-foreground">{label}</span>
    {children}
    {hint && <span className="text-xs text-muted-foreground block">{hint}</span>}
  </label>
);

const num = (v: string) => Math.max(Number(v) || 0, 0);

export const BrandingCard = ({ s, set }: Pick<Props, 's' | 'set'>) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    const data: string = await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsDataURL(file);
    });
    const d = await paytiFetch('slots-logo', { method: 'POST', body: { data, contentType: file.type } });
    setBusy(false);
    if (d.url) set({ logo_url: d.url });
  };

  return (
    <Card className="p-6 space-y-4">
      <p className="font-medium">Что увидит клиент</p>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
          {s.logo_url ? <img src={s.logo_url} alt="" className="max-w-full max-h-full object-contain" /> : <Icon name="Image" size={24} className="text-muted-foreground" />}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? 'Загружаю...' : 'Загрузить логотип'}</Button>
          {s.logo_url && <Button variant="ghost" size="sm" onClick={() => set({ logo_url: null })}>Убрать</Button>}
          <input ref={ref} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
      </div>
      <Field label="Название формы записи">
        <Input value={s.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Адрес сайта для ссылок" hint="Ссылка клиенту будет вида адрес/book/код">
        <Input value={s.base_url || ''} onChange={(e) => set({ base_url: e.target.value })} placeholder="https://example.ru" />
      </Field>
    </Card>
  );
};

export const FunnelCard = ({ meta, s, set }: Props) => {
  const [srcStages, setSrcStages] = useState<Stage[]>([]);
  const [dstStages, setDstStages] = useState<Stage[]>([]);
  const [dstCat, setDstCat] = useState(s.source_category_id || '0');

  useEffect(() => {
    if (s.source_category_id == null) return;
    paytiFetch('slots-stages', { query: `category=${s.source_category_id}` }).then((d) => setSrcStages(d.stages || []));
  }, [s.source_category_id]);
  useEffect(() => {
    paytiFetch('slots-stages', { query: `category=${dstCat}` }).then((d) => setDstStages(d.stages || []));
  }, [dstCat]);

  const fields = meta.fields;
  const textFields = fields.filter((f) => ['string', 'text', 'url'].includes(f.type) && f.code.startsWith('UF_'));
  const dateFields = fields.filter((f) => ['datetime', 'date', 'string'].includes(f.type) && f.code.startsWith('UF_'));
  const listFields = fields.filter((f) => f.items.length > 0 || f.code.startsWith('UF_'));

  return (
    <Card className="p-6 space-y-4">
      <div>
        <p className="font-medium">Воронка и поля сделки</p>
        <p className="text-sm text-muted-foreground">Откуда берём заявки и куда записываем результат</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Воронка с заявками на настройку">
          <select className={selectCls} value={s.source_category_id ?? ''} onChange={(e) => set({ source_category_id: e.target.value, source_stage_id: null })}>
            <option value="">Не выбрана</option>
            {meta.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Этап «Согласование времени»" hint="Когда сделка попадёт сюда, клиенту уйдёт ссылка">
          <select className={selectCls} value={s.source_stage_id ?? ''} onChange={(e) => set({ source_stage_id: e.target.value })}>
            <option value="">Не выбран</option>
            {srcStages.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Воронка для следующего этапа">
          <select className={selectCls} value={dstCat} onChange={(e) => { setDstCat(e.target.value); set({ target_stage_id: null }); }}>
            {meta.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Куда двигать после записи">
          <select className={selectCls} value={s.target_stage_id ?? ''} onChange={(e) => set({ target_stage_id: e.target.value })}>
            <option value="">Не двигать</option>
            {dstStages.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Поле-классификатор услуги" hint="По его значению подбирается услуга и длительность">
          <select className={selectCls} value={s.classifier_field ?? ''} onChange={(e) => set({ classifier_field: e.target.value })}>
            <option value="">Не выбрано</option>
            {listFields.map((f) => <option key={f.code} value={f.code}>{f.title}</option>)}
          </select>
        </Field>
        <Field label="Поле для времени начала" hint="Сюда запишется дата и время записи">
          <select className={selectCls} value={s.start_field ?? ''} onChange={(e) => set({ start_field: e.target.value })}>
            <option value="">Не записывать</option>
            {dateFields.map((f) => <option key={f.code} value={f.code}>{f.title}</option>)}
          </select>
        </Field>
        <Field label="Поле для ссылки на запись" hint="Необязательно: ссылка дублируется в карточку сделки">
          <select className={selectCls} value={s.link_field ?? ''} onChange={(e) => set({ link_field: e.target.value })}>
            <option value="">Не записывать</option>
            {textFields.map((f) => <option key={f.code} value={f.code}>{f.title}</option>)}
          </select>
        </Field>
      </div>
    </Card>
  );
};

export const TeamCard = ({ meta, s, set }: Props) => {
  const [users, setUsers] = useState<BitrixUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  const load = async (dep: string) => {
    setLoading(true);
    const d = await paytiFetch('slots-users', { query: `department=${dep}` });
    setUsers(d.users || []);
    setLoading(false);
  };

  useEffect(() => {
    load(s.department_id || '');
  }, [s.department_id]);

  const has = (id: string) => s.employees.some((e) => e.id === id);
  const toggle = (u: BitrixUser) =>
    set({ employees: has(u.id) ? s.employees.filter((e) => e.id !== u.id) : [...s.employees, { id: u.id, name: u.name }] });
  const addAll = () => set({ employees: [...s.employees, ...users.filter((u) => !has(u.id)).map((u) => ({ id: u.id, name: u.name }))] });
  const shown = users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Card className="p-6 space-y-4">
      <div>
        <p className="font-medium">Специалисты</p>
        <p className="text-sm text-muted-foreground">Общий календарь складывается из календарей выбранных сотрудников</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Отдел Битрикс24">
          <select className={selectCls} value={s.department_id ?? ''} onChange={(e) => set({ department_id: e.target.value })}>
            <option value="">Все сотрудники</option>
            {meta.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Поиск">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Фамилия или имя" />
        </Field>
      </div>

      <div className="flex gap-2 flex-wrap min-h-8">
        {s.employees.length === 0 && <p className="text-sm text-muted-foreground">Никто не выбран</p>}
        {s.employees.map((e) => (
          <button key={e.id} type="button" onClick={() => set({ employees: s.employees.filter((x) => x.id !== e.id) })} className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-sm">
            {e.name}
            <Icon name="X" size={12} />
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border max-h-56 overflow-y-auto divide-y divide-border">
        {loading && <p className="p-3 text-sm text-muted-foreground">Загружаю сотрудников...</p>}
        {!loading && shown.length === 0 && <p className="p-3 text-sm text-muted-foreground">Никого не найдено</p>}
        {shown.map((u) => (
          <label key={u.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
            <input type="checkbox" checked={has(u.id)} onChange={() => toggle(u)} />
            <span>{u.name}</span>
            <span className="text-xs text-muted-foreground">{u.position}</span>
          </label>
        ))}
      </div>
      {s.department_id && <Button variant="outline" size="sm" onClick={addAll}>Добавить весь отдел</Button>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
        <Field label="Кто выполняет настройку" hint="При выборе «из сделки» запись идёт только на ответственного по сделке, а список выше не используется">
          <select className={selectCls} value={s.employee_mode || 'auto'} onChange={(e) => set({ employee_mode: e.target.value as 'auto' | 'deal' })}>
            <option value="auto">Свободный из списка</option>
            <option value="deal">Ответственный из сделки</option>
          </select>
        </Field>
        <Field label="Кто ставит задачи">
          <select className={selectCls} value={s.assigner_mode} onChange={(e) => set({ assigner_mode: e.target.value as 'deal' | 'user' })}>
            <option value="deal">Ответственный по сделке</option>
            <option value="user">Выбранный руководитель</option>
          </select>
        </Field>
        {s.assigner_mode === 'user' && (
          <Field label="Руководитель">
            <select className={selectCls} value={s.assigner_user_id ?? ''} onChange={(e) => set({ assigner_user_id: e.target.value })}>
              <option value="">Выберите</option>
              {[...users, ...s.employees.filter((e) => !users.some((u) => u.id === e.id)).map((e) => ({ ...e, position: '' }))].map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
        )}
      </div>
    </Card>
  );
};

export const RulesCard = ({ s, set }: Pick<Props, 's' | 'set'>) => (
  <Card className="p-6 space-y-4">
    <p className="font-medium">Правила записи</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Field label="Записаться можно на дней вперёд">
        <Input type="number" min={1} value={s.horizon_days} onChange={(e) => set({ horizon_days: num(e.target.value) })} />
      </Field>
      <Field label="Не позднее чем за, часов">
        <Input type="number" min={0} value={s.min_notice_hours} onChange={(e) => set({ min_notice_hours: num(e.target.value) })} />
      </Field>
      <Field label="Шаг слотов, мин">
        <Input type="number" min={5} value={s.step_min} onChange={(e) => set({ step_min: num(e.target.value) })} />
      </Field>
      <Field label="Перенос не позднее чем за, часов">
        <Input type="number" min={0} value={s.reschedule_deadline_hours} onChange={(e) => set({ reschedule_deadline_hours: num(e.target.value) })} />
      </Field>
      <Field label="Записей в день, всего" hint="0 — без ограничения">
        <Input type="number" min={0} value={s.max_per_day} onChange={(e) => set({ max_per_day: num(e.target.value) })} />
      </Field>
      <Field label="Ссылка действует, дней">
        <Input type="number" min={1} value={s.link_days} onChange={(e) => set({ link_days: num(e.target.value) })} />
      </Field>
    </div>
    <Field label="Часовой пояс">
      <select className={selectCls} value={s.timezone} onChange={(e) => set({ timezone: e.target.value })}>
        {['Europe/Kaliningrad', 'Europe/Moscow', 'Europe/Samara', 'Asia/Yekaterinburg', 'Asia/Omsk', 'Asia/Krasnoyarsk', 'Asia/Irkutsk', 'Asia/Yakutsk', 'Asia/Vladivostok'].map((z) => <option key={z} value={z}>{z}</option>)}
      </select>
    </Field>
    <div className="space-y-2 pt-2 border-t border-border">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.check_bitrix_busy} onChange={(e) => set({ check_bitrix_busy: e.target.checked })} />Учитывать занятость в календарях Битрикс24</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.check_bitrix_tasks} onChange={(e) => set({ check_bitrix_tasks: e.target.checked })} />Учитывать задачи специалиста с плановым временем (начало и окончание)</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.create_task} onChange={(e) => set({ create_task: e.target.checked })} />Создавать задачу специалисту в сделке</label>
      {s.create_task && (
        <>
          <Field label="Название задачи" hint="Переменные: {название сделки}, {deal} — номер сделки, {service} — услуга">
            <Input value={s.task_title} onChange={(e) => set({ task_title: e.target.value })} />
          </Field>
          <Field label="Описание задачи" hint="В фигурных скобках пишите название поля сделки из Битрикс24, например {ЗН ФН}. Поля компании и контакта: {Компания: ИНН}. Также доступны {Название}, {дата записи}">
            <Textarea rows={12} value={s.task_description || ''} onChange={(e) => set({ task_description: e.target.value })} />
          </Field>
        </>
      )}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.create_calendar_event} onChange={(e) => set({ create_calendar_event: e.target.checked })} />Создавать событие в календаре специалиста</label>
    </div>
  </Card>
);

export const WebhookCard = ({ s, set, onSave }: Pick<Props, 's' | 'set'> & { onSave: () => Promise<void> }) => {
  const [result, setResult] = useState('');
  const [checking, setChecking] = useState(false);

  const test = async () => {
    setChecking(true);
    setResult('');
    await onSave();
    const d = await paytiFetch('slots-webhook-test');
    setChecking(false);
    if (!d.ok) return setResult(`Вебхук не работает: ${d.error}`);
    setResult(d.missing.length ? `Вебхук работает, но не хватает прав: ${d.missing.join(', ')}` : 'Вебхук работает, все нужные права есть');
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <p className="font-medium">Вебхук Битрикс24 для слотов</p>
        <p className="text-sm text-muted-foreground">Отдельный входящий вебхук только для этого раздела. Если поле пустое, используется общий вебхук проекта</p>
      </div>
      <Field
        label="Адрес входящего вебхука"
        hint={s.webhook_set ? `Сейчас сохранён: ${s.webhook_hint}. Оставьте поле пустым, чтобы не менять` : 'Права: CRM, календарь, задачи, пользователи, структура компании'}
      >
        <Input
          type="password"
          autoComplete="off"
          value={s.bitrix_webhook_url || ''}
          onChange={(e) => set({ bitrix_webhook_url: e.target.value })}
          placeholder="https://домен.bitrix24.ru/rest/1/токен/"
        />
      </Field>
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={test} disabled={checking}>{checking ? 'Проверяю...' : 'Сохранить и проверить права'}</Button>
        {s.webhook_set && (
          <Button variant="ghost" size="sm" onClick={async () => { await paytiFetch('slots-settings', { method: 'POST', body: { bitrix_webhook_url: '' } }); set({ webhook_set: false, webhook_hint: '', bitrix_webhook_url: '' }); }}>
            Вернуть общий вебхук
          </Button>
        )}
        {result && <span className="text-sm text-muted-foreground">{result}</span>}
      </div>
    </Card>
  );
};
