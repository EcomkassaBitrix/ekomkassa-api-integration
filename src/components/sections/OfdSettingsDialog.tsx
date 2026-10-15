import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { paytiFetch } from './PaytiSettingsDialog';

interface MapCfg {
  mode: 'AUTO' | 'CRM' | 'STATIC';
  entity: string;
  field: string;
  value: string;
}
interface CrmField {
  code: string;
  title: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meta: { fields: { path: string; label: string }[]; entities: Record<string, string> } | null;
  onSaved: () => void;
}

const selectCls = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
const emptyCfg: MapCfg = { mode: 'AUTO', entity: '', field: '', value: '' };

const OfdSettingsDialog = ({ open, onOpenChange, meta, onSaved }: Props) => {
  const [mapping, setMapping] = useState<Record<string, MapCfg>>({});
  const [agreementField, setAgreementField] = useState('');
  const [crm, setCrm] = useState<Record<string, CrmField[]>>({});
  const [saving, setSaving] = useState(false);

  const loadEntity = async (entity: string, force = false) => {
    const key = entity.toUpperCase();
    if (!key || (!force && crm[key])) return;
    if (!crm[key]) setCrm((c) => ({ ...c, [key]: [] }));
    const d = await paytiFetch('crm-fields', { query: `entity=${key.toLowerCase()}` });
    setCrm((c) => ({ ...c, [key]: d.fields || [] }));
  };

  useEffect(() => {
    if (!open) return;
    paytiFetch('ofd-settings').then((d) => {
      const st = d.settings || {};
      const m: Record<string, MapCfg> = {};
      Object.entries(st.mapping_json || {}).forEach(([k, v]) => {
        const c = v as Partial<MapCfg> & { type?: string };
        m[k] = {
          mode: String(c.mode || c.type || 'AUTO').toUpperCase() as MapCfg['mode'],
          entity: String(c.entity || '').toUpperCase(),
          field: c.field || '',
          value: c.value || '',
        };
      });
      setMapping(m);
      setAgreementField(st.result_agreement_field || '');
      const used = new Set<string>(['DEAL']);
      Object.values(m).forEach((c) => c.mode === 'CRM' && c.entity && used.add(c.entity));
      used.forEach((e) => loadEntity(e, true));
    });
  }, [open]);

  const cfgOf = (path: string): MapCfg => mapping[path] || emptyCfg;
  const setMap = (path: string, patch: Partial<MapCfg>) => {
    setMapping((m) => ({ ...m, [path]: { ...emptyCfg, ...(m[path] || {}), ...patch } }));
    if (patch.entity) loadEntity(patch.entity);
  };

  const save = async () => {
    setSaving(true);
    await paytiFetch('ofd-settings', {
      method: 'POST',
      body: { mapping_json: mapping, result_agreement_field: agreementField },
    });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  const entityOptions = Object.entries(meta?.entities || {}).map(([k, v]) => ({ code: k.toUpperCase(), label: v }));

  const FieldSelect = ({ entity, value, onChange }: { entity: string; value: string; onChange: (v: string) => void }) => {
    const list = crm[entity.toUpperCase()] || [];
    const known = list.some((f) => f.code === value);
    return (
      <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)} disabled={!entity}>
        <option value="">Поле...</option>
        {value && !known && <option value={value}>{list.length === 0 ? 'Загрузка...' : 'Поле удалено из CRM'}</option>}
        {list.map((f) => (
          <option key={f.code} value={f.code}>{f.title}</option>
        ))}
      </select>
    );
  };

  const dealFields = crm.DEAL || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle>Настройки маппинга ОФД</DialogTitle>
          <DialogDescription>Откуда брать каждое поле запроса на создание личного кабинета в ОФД. Настройка общая для всех запусков.</DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border">
          <div className="grid grid-cols-[280px_1fr] gap-6 p-6">
            <div>
              <p className="font-medium">Куда записать результат</p>
              <p className="text-xs text-muted-foreground mb-2">поле сделки</p>
              <p className="text-xs text-muted-foreground">
                После успешного создания кабинета ID организации в ОФД вернётся в это поле сделки. Пустое поле — не заполняем.
              </p>
            </div>
            <div className="space-y-2">
              <div className="space-y-1 max-w-sm">
                <label className="text-xs uppercase text-muted-foreground">ID организации в ОФД</label>
                <select className={selectCls} value={agreementField} onChange={(e) => setAgreementField(e.target.value)}>
                  <option value="">Не записывать</option>
                  {agreementField && !dealFields.some((f) => f.code === agreementField) && (
                    <option value={agreementField}>{dealFields.length === 0 ? 'Загрузка...' : 'Поле удалено из CRM'}</option>
                  )}
                  {dealFields.map((f) => (
                    <option key={f.code} value={f.code}>{f.title}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                {agreementField ? 'После создания кабинета ID запишется в выбранное поле сделки' : 'Результат в сделку не записывается — только комментарий'}
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
                      <FieldSelect entity={cfg.entity} value={cfg.field} onChange={(v) => setMap(f.path, { field: v })} />
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

export default OfdSettingsDialog;
