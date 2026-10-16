import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { paytiFetch } from './PaytiSettingsDialog';

interface MapCfg {
  mode: 'AUTO' | 'CRM' | 'STATIC' | 'FILLED';
  entity: string;
  field: string;
  value: string;
  valueMap?: Record<string, string>;
}
interface Opt {
  value: string;
  label: string;
}
interface CrmField {
  code: string;
  title: string;
  items?: { id: string; value: string }[];
}
const PURPOSE_ROWS: [string, string][] = [
  ['InitialRegistration', 'Регистрация кассы'],
  ['Reregistration', 'Перерегистрация кассы'],
  ['Unregistration', 'Снятие кассы с учёта'],
  ['Report', 'Отчёт о регистрации'],
];
const AUTO_HINT: Record<string, string> = {
  Internet: 'да, если место расчётов похоже на сайт',
  ReregReasons: 'замена ФН, если заполнены данные старого и нового ФН',
  FormatVersion: '4 (ФФД 1.2)',
  FullAddress: 'адрес из реквизитов',
  InstallmentPlace: 'как адрес установки',
};
const SCOPE_TEXT: Record<string, string> = { IRU: '', RU: 'перерегистрация, снятие', R: 'перерегистрация', U: 'снятие с учёта', P: 'отчёт о регистрации' };
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meta: { fields: { path: string; label: string; scope?: string; multi?: boolean; options?: Opt[] | null }[]; entities: Record<string, string> } | null;
  onSaved: () => void;
}

const selectCls = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
const emptyCfg: MapCfg = { mode: 'AUTO', entity: '', field: '', value: '' };

const FnsSettingsDialog = ({ open, onOpenChange, meta, onSaved }: Props) => {
  const [mapping, setMapping] = useState<Record<string, MapCfg>>({});
  const [linkField, setLinkField] = useState('');
  const [rnmField, setRnmField] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [pEntity, setPEntity] = useState('DEAL');
  const [pField, setPField] = useState('');
  const [pValues, setPValues] = useState<Record<string, string>>({});
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
    paytiFetch('fns-settings').then((d) => {
      const st = d.settings || {};
      const m: Record<string, MapCfg> = {};
      Object.entries(st.mapping_json || {}).forEach(([k, v]) => {
        const c = v as Partial<MapCfg>;
        m[k] = {
          mode: String(c.mode || 'AUTO').toUpperCase() as MapCfg['mode'],
          entity: String(c.entity || '').toUpperCase(),
          field: c.field || '',
          value: c.value || '',
          valueMap: c.valueMap || {},
        };
      });
      setMapping(m);
      setLinkField(st.result_link_field || '');
      setRnmField(st.result_rnm_field || '');
      setBaseUrl(st.sign_base_url || window.location.origin);
      setPEntity(String(st.purpose_entity || 'DEAL').toUpperCase());
      setPField(st.purpose_field || '');
      setPValues(st.purpose_values || {});
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
    await paytiFetch('fns-settings', {
      method: 'POST',
      body: {
        mapping_json: mapping,
        result_link_field: linkField,
        result_rnm_field: rnmField,
        sign_base_url: baseUrl.trim().replace(/\/$/, ''),
        purpose_entity: pEntity,
        purpose_field: pField,
        purpose_values: pValues,
      },
    });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  const dealFields = crm.DEAL || [];
  const isBool = (f: { options?: Opt[] | null }) => !!f.options && f.options.length === 2 && f.options[0].value === 'да';
  const crmItems = (cfg: MapCfg) => (crm[cfg.entity.toUpperCase()] || []).find((x) => x.code === cfg.field)?.items || [];
  const entityOptions = Object.entries(meta?.entities || {}).map(([k, v]) => ({ code: k.toUpperCase(), label: v }));

  const DealSelect = ({ value, onChange, empty }: { value: string; onChange: (v: string) => void; empty: string }) => (
    <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{empty}</option>
      {value && !dealFields.some((f) => f.code === value) && <option value={value}>{dealFields.length === 0 ? 'Загрузка...' : 'Поле удалено из CRM'}</option>}
      {dealFields.map((f) => (
        <option key={f.code} value={f.code}>{f.title}</option>
      ))}
    </select>
  );

  const FieldSelect = ({ entity, value, onChange }: { entity: string; value: string; onChange: (v: string) => void }) => {
    const list = crm[entity.toUpperCase()] || [];
    return (
      <select className={selectCls} value={value} onChange={(e) => onChange(e.target.value)} disabled={!entity}>
        <option value="">Поле...</option>
        {value && !list.some((f) => f.code === value) && <option value={value}>{list.length === 0 ? 'Загрузка...' : 'Поле удалено из CRM'}</option>}
        {list.map((f) => (
          <option key={f.code} value={f.code}>{f.title}</option>
        ))}
      </select>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle>Настройки полей: регистрация кассы в ФНС</DialogTitle>
          <DialogDescription>Откуда брать данные для заявки и куда записывать результат. Настройка общая для всех запусков.</DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border">
          <div className="p-6 space-y-3">
            <p className="font-medium">Результат в сделку</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs uppercase text-muted-foreground">Ссылка для подписи клиентом</label>
                <DealSelect value={linkField} onChange={setLinkField} empty="Только в комментарий" />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase text-muted-foreground">Присвоенный РНМ</label>
                <DealSelect value={rnmField} onChange={setRnmField} empty="Не записывать" />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase text-muted-foreground">Адрес сайта для ссылок</label>
                <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Ссылка вида «адрес сайта»/sign/… открывается у клиента без входа в кабинет. Адрес должен быть тем, по которому сайт доступен клиенту.</p>
          </div>

          <div className="p-6 space-y-3">
            <p className="font-medium">Назначение заявки</p>
            <p className="text-xs text-muted-foreground">Поле сделки, по которому выбирается, что делать: зарегистрировать кассу, перерегистрировать, снять с учёта или отправить отчёт. В хуке можно указать назначение вручную, тогда это правило не используется.</p>
            <div className="grid grid-cols-2 gap-3 max-w-2xl">
              <select className={selectCls} value={pEntity} onChange={(e) => { setPEntity(e.target.value); setPField(''); loadEntity(e.target.value); }}>
                {entityOptions.map((o) => (
                  <option key={o.code} value={o.code}>{o.label}</option>
                ))}
              </select>
              <FieldSelect entity={pEntity} value={pField} onChange={setPField} />
            </div>
            {pField && (
              <div className="space-y-2 max-w-2xl">
                {PURPOSE_ROWS.map(([code, label]) => {
                  const items = (crm[pEntity.toUpperCase()] || []).find((f) => f.code === pField)?.items || [];
                  return (
                    <div key={code} className="grid grid-cols-[220px_1fr] gap-3 items-center">
                      <span className="text-sm">{label}</span>
                      <div>
                        <Input
                          list={`purpose-${code}`}
                          placeholder="Значение поля (можно несколько через запятую)"
                          value={pValues[code] || ''}
                          onChange={(e) => setPValues({ ...pValues, [code]: e.target.value })}
                        />
                        <datalist id={`purpose-${code}`}>
                          {items.map((i) => <option key={i.id} value={i.value} />)}
                        </datalist>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-6 space-y-3">
            <p className="font-medium">Откуда брать поля</p>
            {meta?.fields.map((f) => {
              const cfg = cfgOf(f.path);
              return (
                <div key={f.path} className="grid grid-cols-[220px_200px_1fr] gap-3 items-center">
                  <div>
                    <p className="text-sm">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{SCOPE_TEXT[f.scope || 'IRU'] ? `только: ${SCOPE_TEXT[f.scope || 'IRU']}` : f.path}</p>
                  </div>
                  <select className={selectCls} value={cfg.mode} onChange={(e) => setMap(f.path, { mode: e.target.value as MapCfg['mode'] })}>
                    <option value="AUTO">По умолчанию</option>
                    <option value="CRM">Своё поле из CRM</option>
                    <option value="STATIC">Фиксированное значение</option>
                    {isBool(f) && <option value="FILLED">Да, если поле CRM заполнено</option>}
                  </select>
                  {(cfg.mode === 'CRM' || cfg.mode === 'FILLED') && (
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
                  {cfg.mode === 'STATIC' && f.options && (
                    <select className={selectCls} value={cfg.value} onChange={(e) => setMap(f.path, { value: e.target.value })}>
                      <option value="">Выберите значение...</option>
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  )}
                  {cfg.mode === 'STATIC' && !f.options && <Input placeholder="Значение" value={cfg.value} onChange={(e) => setMap(f.path, { value: e.target.value })} />}
                  {cfg.mode === 'AUTO' && <span className="text-xs text-muted-foreground">{AUTO_HINT[f.path] || 'по правилам системы'}</span>}
                  {cfg.mode === 'CRM' && f.options && cfg.field && (
                    <div className="col-span-3 rounded-md bg-muted/40 p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">Сопоставьте значения поля CRM со значениями ОФД. Несопоставленные передаются как есть.</p>
                      {crmItems(cfg).length === 0 && <p className="text-xs text-muted-foreground">У поля нет списка значений: если там свободный текст, система попробует распознать его сама.</p>}
                      {crmItems(cfg).map((it) => (
                        <div key={it.id} className="grid grid-cols-[1fr_1fr] gap-3 items-center">
                          <span className="text-sm">{it.value}</span>
                          <select
                            className={selectCls}
                            value={cfg.valueMap?.[it.value] || ''}
                            onChange={(e) => setMap(f.path, { valueMap: { ...(cfg.valueMap || {}), [it.value]: e.target.value } })}
                          >
                            <option value="">Как есть</option>
                            {f.options.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
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

export default FnsSettingsDialog;
