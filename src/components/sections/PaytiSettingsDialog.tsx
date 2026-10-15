import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const PAYTI_URL = 'https://functions.poehali.dev/c55cf921-d1ec-4fc7-a6e2-59c730988a1e';
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
  type: string;
  entity?: string;
  field?: string;
  value?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meta: { fields: { path: string; label: string }[]; entities: Record<string, string> } | null;
  onSaved: () => void;
}

const selectCls = 'h-10 rounded-md border border-input bg-background px-3 text-sm';

const PaytiSettingsDialog = ({ open, onOpenChange, meta, onSaved }: Props) => {
  const [mapping, setMapping] = useState<Record<string, MapCfg>>({});
  const [s, setS] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    paytiFetch('settings').then((d) => {
      const st = d.settings || {};
      setMapping(st.mapping_json || {});
      setS({
        default_environment: st.default_environment || 'test',
        default_registration_mode: st.default_registration_mode || 'A',
        mode_entity: st.mode_entity || '',
        mode_field: st.mode_field || '',
        mode_value: st.mode_value || '',
        result_login_field: st.result_login_field || '',
        result_password_field: st.result_password_field || '',
        result_store_field: st.result_store_field || '',
      });
    });
  }, [open]);

  const setMap = (path: string, patch: Partial<MapCfg>) =>
    setMapping((m) => ({ ...m, [path]: { type: 'AUTO', ...(m[path] || {}), ...patch } }));

  const save = async () => {
    setSaving(true);
    await paytiFetch('settings', { method: 'POST', body: { mapping_json: mapping, ...s } });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  const field = (key: string, label: string, ph = '') => (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input value={s[key] || ''} placeholder={ph} onChange={(e) => setS({ ...s, [key]: e.target.value })} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Настройки полей Payti</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Контур по умолчанию</label>
              <select className={`${selectCls} w-full`} value={s.default_environment || 'test'} onChange={(e) => setS({ ...s, default_environment: e.target.value })}>
                <option value="test">TEST</option>
                <option value="prod">PROD</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Режим по умолчанию</label>
              <select className={`${selectCls} w-full`} value={s.default_registration_mode || 'A'} onChange={(e) => setS({ ...s, default_registration_mode: e.target.value })}>
                <option value="A">A — агентский, с кассой</option>
                <option value="R">R — обычный, без кассы</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Правило выбора режима</p>
            <p className="text-xs text-muted-foreground mb-2">Если значение поля совпало — режим A, иначе R. Пусто — берётся режим по умолчанию.</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Сущность</label>
                <select className={`${selectCls} w-full`} value={s.mode_entity || ''} onChange={(e) => setS({ ...s, mode_entity: e.target.value })}>
                  <option value="">—</option>
                  {Object.entries(meta?.entities || {}).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {field('mode_field', 'Код поля', 'UF_CRM_...')}
              {field('mode_value', 'Значение', 'Да')}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Куда записать результат в сделке</p>
            <div className="grid grid-cols-3 gap-3">
              {field('result_login_field', 'Поле логина', 'UF_CRM_...')}
              {field('result_password_field', 'Поле пароля', 'UF_CRM_...')}
              {field('result_store_field', 'Поле ID магазина', 'UF_CRM_...')}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Откуда брать поля</p>
            <div className="space-y-2">
              {meta?.fields.map((f) => {
                const cfg = mapping[f.path] || { type: 'AUTO' };
                return (
                  <div key={f.path} className="grid grid-cols-[180px_110px_1fr] gap-2 items-center">
                    <span className="text-sm">{f.label}</span>
                    <select className={selectCls} value={cfg.type} onChange={(e) => setMap(f.path, { type: e.target.value })}>
                      <option value="AUTO">AUTO</option>
                      <option value="CRM">CRM</option>
                      <option value="STATIC">STATIC</option>
                    </select>
                    {cfg.type === 'CRM' && (
                      <div className="grid grid-cols-2 gap-2">
                        <select className={selectCls} value={cfg.entity || 'deal'} onChange={(e) => setMap(f.path, { entity: e.target.value })}>
                          {Object.entries(meta?.entities || {}).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <Input placeholder="Код поля" value={cfg.field || ''} onChange={(e) => setMap(f.path, { field: e.target.value })} />
                      </div>
                    )}
                    {cfg.type === 'STATIC' && (
                      <Input placeholder="Значение" value={cfg.value || ''} onChange={(e) => setMap(f.path, { value: e.target.value })} />
                    )}
                    {cfg.type === 'AUTO' && <span className="text-xs text-muted-foreground">по правилам</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Сохраняю...' : 'Сохранить'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaytiSettingsDialog;
