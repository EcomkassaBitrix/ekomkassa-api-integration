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
        result_login_field: st.result_login_field || '',
        result_password_field: st.result_password_field || '',
        result_store_field: st.result_store_field || '',
      };
      setS(next);
      const used = new Set<string>(['DEAL']);
      if (next.mode_entity) used.add(next.mode_entity);
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
        {value && !known && <option value={value}>{value}</option>}
        {list.map((f) => (
          <option key={f.code} value={f.code}>{f.title} ({f.code})</option>
        ))}
      </select>
    );
  };

  const modeField = (crm[s.mode_entity || ''] || []).find((f) => f.code === s.mode_field);
  const dealFields = crm.DEAL || [];

  const resultSelect = (key: string, label: string) => (
    <div className="space-y-1">
      <label className="text-xs uppercase text-muted-foreground">{label}</label>
      <select className={selectCls} value={s[key] || ''} onChange={(e) => setS({ ...s, [key]: e.target.value })}>
        <option value="">Не записывать</option>
        {s[key] && !dealFields.some((f) => f.code === s[key]) && <option value={s[key]}>{s[key]}</option>}
        {dealFields.map((f) => (
          <option key={f.code} value={f.code}>{f.title} ({f.code})</option>
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
          <div className="grid grid-cols-[280px_1fr] gap-6 p-6">
            <div>
              <p className="font-medium">Режим регистрации Payti</p>
              <p className="text-xs text-muted-foreground mb-2">mode</p>
              <p className="text-xs text-muted-foreground">
                Совпало значение поля — режим A (агентский, с кассой). Не совпало — режим R (обычный). Без правила берётся режим, выбранный на странице.
              </p>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-3">
                <select
                  className={selectCls}
                  value={s.mode_entity || ''}
                  onChange={(e) => {
                    setS({ ...s, mode_entity: e.target.value, mode_field: '', mode_value: '' });
                    loadEntity(e.target.value);
                  }}
                >
                  <option value="">Где искать...</option>
                  {entityOptions.map((o) => (
                    <option key={o.code} value={o.code}>{o.label}</option>
                  ))}
                </select>
                <FieldSelect entity={s.mode_entity || ''} value={s.mode_field || ''} placeholder="Поле..." onChange={(v) => setS({ ...s, mode_field: v, mode_value: '' })} />
                {modeField && modeField.items.length > 0 ? (
                  <select className={selectCls} value={s.mode_value || ''} onChange={(e) => setS({ ...s, mode_value: e.target.value })}>
                    <option value="">Значение для A</option>
                    {s.mode_value && !modeField.items.some((i) => i.value === s.mode_value) && <option value={s.mode_value}>{s.mode_value}</option>}
                    {modeField.items.map((i) => (
                      <option key={i.id} value={i.value}>{i.value}</option>
                    ))}
                  </select>
                ) : (
                  <Input placeholder="Значение для A" value={s.mode_value || ''} disabled={!s.mode_field} onChange={(e) => setS({ ...s, mode_value: e.target.value })} />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {s.mode_entity && s.mode_field && s.mode_value
                  ? `Режим A, если «${s.mode_value}» в поле ${s.mode_field}; иначе R`
                  : 'Правило не задано — режим выбирается вручную на странице'}
              </p>
            </div>
          </div>

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