import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const PAYTI_URL = 'https://functions.poehali.dev/c459207f-4d47-4bca-bf92-591823a29583';
export const PAYTI_API_KEY = 'ek_live_j8h3k2n4m5p6q7r8';

export const paytiFetch = async (action: string, opts: { method?: string; query?: string; body?: unknown } = {}) => {
  const res = await fetch(`${PAYTI_URL}?action=${action}${opts.query ? '&' + opts.query : ''}`, {
    method: opts.method || 'GET',
    headers: { 'X-Api-Key': PAYTI_API_KEY, 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res.json();
};

interface MapCfg {
  mode: 'AUTO' | 'CRM' | 'STATIC';
  entity: string;
  field: string;
  value: string;
}
interface CrmField {
  code: string;
  title: string;
  items: { id: string; value: string }[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meta: { fields: { path: string; label: string }[]; entities: Record<string, string> } | null;
  onSaved: () => void;
}

const selectCls = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
const emptyCfg: MapCfg = { mode: 'AUTO', entity: '', field: '', value: '' };

const PaytiSettingsDialog = ({ open, onOpenChange, meta, onSaved }: Props) => {
  const [mapping, setMapping] = useState<Record<string, MapCfg>>({});
  const [s, setS] = useState<Record<string, string>>({});
  const [crm, setCrm] = useState<Record<string, CrmField[]>>({});
  const [saving, setSaving] = useState(false);

  const loadEntity = async (entity: string) => {
    const key = entity.toUpperCase();
    if (!key || crm[key]) return;
    setCrm((c) => ({ ...c, [key]: [] }));
    const d = await paytiFetch('crm-fields', { query: `entity=${key.toLowerCase()}` });
    setCrm((c) => ({ ...c, [key]: d.fields || [] }));
  };

  useEffect(() => {
    if (!open) return;
    paytiFetch('settings').then((d) => {
      const st = d.settings || {};
      const m: Record<string, MapCfg> = {};
      Object.entries(st.mapping_json || {}).forEach(([k, v]: [string, any]) => {
        m[k] = {
          mode: String(v.mode || v.type || 'AUTO').toUpperCase() as MapCfg['mode'],
          entity: String(v.entity || '').toUpperCase(),
          field: v.field || '',
          value: v.value || '',
        };
      });
      setMapping(m);
      const next = {
        mode_entity: String(st.mode_entity || '').toUpperCase(),
        mode_field: st.mode_field || '',
        mode_value: st.mode_value || '',
        mode_r_entity: String(st.mode_r_entity || '').toUpperCase(),
        mode_r_field: st.mode_r_field || '',
        mode_r_value: st.mode_r_value || '',
        result_login_field: st.result_login_field || '',
        result_password_field: st.result_password_field || '',
        result_store_field: st.result_store_field || '',
      };
      setS(next);
      const used = new Set<string>(['DEAL']);
      if (next.mode_entity) used.add(next.mode_entity);
      if (next.mode_r_entity) used.add(next.mode_r_entity);
      Object.values(m).forEach((c) => c.mode === 'CRM' && c.entity && used.add(c.entity));
      used.forEach((e) => loadEntity(e));
    });
  }, [open]);

  const cfgOf = (path: string): MapCfg => mapping[path] || emptyCfg;
  const setMap = (path: string, patch: Partial<MapCfg>) => {
    setMapping((m) => ({ ...m, [path]: { ...emptyCfg, ...(m[path] || {}), ...patch } }));
    if (patch.entity) loadEntity(patch.entity);
  };

  const save = async () => {
    setSaving(true);
    await paytiFetch('settings', {
      method: 'POST',
      body: { mapping_json: mapping, ...s },
    });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  const entityOptions = Object.entries(meta?.entities || {}).map(([k, v]) => ({ code: k.toUpperCase(), label: v }));

  const FieldSelect = ({ entity, value, onChange, placeholder }: { entity: string; value: string; onChange: (v: string) => void; placeholder: string }) => {
    const list = crm[entity.toUpperCase()] || [];
    const known = list.some((f) => f.code === value);
    return (
      <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)} disabled={!entity}>
        <option value="">{placeholder}</option>
        {value && !known && <option value={value}>{list.length === 0 ? 'Загрузка...' : 'Поле удалено из CRM'}</option>}
        {list.map((f) => (
          <option key={f.code} value={f.code}>{f.title}</option>
        ))}
      </select>
    );
  };

  const dealFields = crm.DEAL || [];

  const modeRule = (o: { prefix: 'mode' | 'mode_r'; title: string; hint: string; valueLabel: string; letter: 'A' | 'R' }) => {
    const ent = s[`${o.prefix}_entity`] || '';
    const fld = s[`${o.prefix}_field`] || '';
    const val = s[`${o.prefix}_value`] || '';
    const fieldMeta = (crm[ent] || []).find((f) => f.code === fld);
    return (
      <div className="grid grid-cols-[280px_1fr] gap-6 p-6">
        <div>
          <p className="font-medium">{o.title}</p>
          <p className="text-xs text-muted-foreground mb-2">mode = {o.letter}</p>
          <p className="text-xs text-muted-foreground">{o.hint}</p>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-3">
            <select
              className={selectCls}
              value={ent}
              onChange={(e) => {
                setS({ ...s, [`${o.prefix}_entity`]: e.target.value, [`${o.prefix}_field`]: '', [`${o.prefix}_value`]: '' });
                loadEntity(e.target.value);
              }}
            >
              <option value="">Где искать...</option>
              {entityOptions.map((x) => (
                <option key={x.code} value={x.code}>{x.label}</option>
              ))}
            </select>
            <FieldSelect entity={ent} value={fld} placeholder="Поле..." onChange={(v) => setS({ ...s, [`${o.prefix}_field`]: v, [`${o.prefix}_value`]: '' })} />
            {fieldMeta && fieldMeta.items.length > 0 ? (
              <select className={selectCls} value={val} onChange={(e) => setS({ ...s, [`${o.prefix}_value`]: e.target.value })}>
                <option value="">{o.valueLabel}</option>
                {val && !fieldMeta.items.some((i) => i.value === val) && <option value={val}>{val}</option>}
                {fieldMeta.items.map((i) => (
                  <option key={i.id} value={i.value}>{i.value}</option>
                ))}
              </select>
            ) : (
              <Input placeholder={o.valueLabel} value={val} disabled={!fld} onChange={(e) => setS({ ...s, [`${o.prefix}_value`]: e.target.value })} />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {ent && fld && val
              ? `Режим ${o.letter}, если в поле «${fieldMeta?.title || fld}» значение «${val}»`
              : 'Правило не задано'}
          </p>
        </div>
      </div>
    );
  };


  const resultSelect = (key: string, label: string) => (
    <div className="space-y-1">
      <label className="text-xs uppercase text-muted-foreground">{label}</label>
      <select className={selectCls} value={s[key] || ''} onChange={(e) => setS({ ...s, [key]: e.target.value })}>
        <option value="">Не записывать</option>
        {s[key] && !dealFields.some((f) => f.code === s[key]) && <option value={s[key]}>{dealFields.length === 0 ? 'Загрузка...' : 'Поле удалено из CRM'}</option>}
        {dealFields.map((f) => (
          <option key={f.code} value={f.code}>{f.title}</option>
        ))}
      </select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle>Настройки маппинга</DialogTitle>
          <DialogDescription>Откуда брать каждое поле Payti. Настройка общая для всех запусков.</DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border">
          {modeRule({
            prefix: 'mode',
            title: 'Режим регистрации «Миг»',
            hint: 'Агентский режим A, с кассой Payti. Если в сделке совпало значение поля — регистрация пойдёт в режиме A.',
            valueLabel: 'Значение для A',
            letter: 'A',
          })}

          {modeRule({
            prefix: 'mode_r',
            title: 'Регистрация в ЛК',
            hint: 'Обычный режим R, без кассы. Если в сделке совпало значение поля — регистрация пойдёт в режиме R.',
            valueLabel: 'Значение для R',
            letter: 'R',
          })}

          <div className="grid grid-cols-[280px_1fr] gap-6 p-6">
            <div>
              <p className="font-medium">Куда записать результат</p>
              <p className="text-xs text-muted-foreground mb-2">поля сделки</p>
              <p className="text-xs text-muted-foreground">
                После успешной регистрации логин, пароль и номер магазина вернутся в эти поля сделки. Пустое поле — не заполняем.
              </p>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-3">
                {resultSelect('result_login_field', 'Логин')}
                {resultSelect('result_password_field', 'Пароль')}
                {resultSelect('result_store_field', 'ID магазина')}
              </div>
              <p className="text-xs text-muted-foreground">
                {s.result_login_field || s.result_password_field || s.result_store_field
                  ? 'После регистрации данные запишутся в выбранные поля сделки'
                  : 'Результат в сделку не записывается — только комментарий'}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-3">
            <p className="font-medium">Откуда брать поля</p>
            {meta?.fields.map((f) => {
              const cfg = cfgOf(f.path);
              return (
                <div key={f.path} className="grid grid-cols-[200px_200px_1fr] gap-3 items-center">
                  <div>
                    <p className="text-sm">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{f.path}</p>
                  </div>
                  <select className={selectCls} value={cfg.mode} onChange={(e) => setMap(f.path, { mode: e.target.value as MapCfg['mode'] })}>
                    <option value="AUTO">По умолчанию</option>
                    <option value="CRM">Своё поле из CRM</option>
                    <option value="STATIC">Фиксированное значение</option>
                  </select>
                  {cfg.mode === 'CRM' && (
                    <div className="grid grid-cols-2 gap-3">
                      <select className={selectCls} value={cfg.entity} onChange={(e) => setMap(f.path, { entity: e.target.value, field: '' })}>
                        <option value="">Где искать...</option>
                        {entityOptions.map((o) => (
                          <option key={o.code} value={o.code}>{o.label}</option>
                        ))}
                      </select>
                      <FieldSelect entity={cfg.entity} value={cfg.field} placeholder="Поле..." onChange={(v) => setMap(f.path, { field: v })} />
                    </div>
                  )}
                  {cfg.mode === 'STATIC' && (
                    <Input placeholder="Значение" value={cfg.value} onChange={(e) => setMap(f.path, { value: e.target.value })} />
                  )}
                  {cfg.mode === 'AUTO' && <span className="text-xs text-muted-foreground">по правилам системы</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-border">
          <Button onClick={save} disabled={saving}>{saving ? 'Сохраняю...' : 'Сохранить настройки'}</Button>
          <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => onOpenChange(false)}>Закрыть</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaytiSettingsDialog;