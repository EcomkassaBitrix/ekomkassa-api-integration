import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { PAYTI_URL, paytiFetch } from '../PaytiSettingsDialog';
import { EdoTemplate } from './EdoSettings';

interface Rule { id?: number; name: string; category_id: string; stage_id: string | null; template_ids: string[]; pick: string; enabled: boolean }
interface Funnel { id: string; name: string; stages: { id: string; name: string }[] }

const selectCls = 'w-full h-10 rounded-md border border-input bg-background px-3 text-sm';
const PICKS: Record<string, string> = { all: 'Все найденные документы', latest: 'Только последний документ', each_latest: 'Последний по каждому шаблону' };
const empty: Rule = { name: '', category_id: '0', stage_id: '', template_ids: [], pick: 'latest', enabled: true };

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="text-sm space-y-1 block">
    <span className="text-muted-foreground">{label}</span>
    {children}
    {hint && <span className="text-xs text-muted-foreground block">{hint}</span>}
  </label>
);

interface Props {
  templates: EdoTemplate[];
  onTemplates: (t: EdoTemplate[]) => void;
}

const EdoRules = ({ templates, onTemplates }: Props) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [edit, setEdit] = useState<Rule | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    paytiFetch('edo-rules').then((d) => setRules(d.rules || []));
    paytiFetch('edo-funnels').then((d) => {
      if (d.ok) setFunnels(d.funnels);
      else setMsg(`Не удалось получить воронки: ${d.error}`);
    });
  }, []);

  const syncTemplates = async () => {
    setLoading(true);
    const d = await paytiFetch('edo-templates-sync');
    setLoading(false);
    if (!d.ok) return setMsg(`Не удалось получить шаблоны: ${d.error}`);
    onTemplates(d.templates);
    setMsg(`Шаблонов в Битрикс24: ${d.templates.length}`);
  };

  const save = async () => {
    if (!edit) return;
    const d = await paytiFetch('edo-rule-save', { method: 'POST', body: edit });
    if (d.ok) {
      setRules(d.rules);
      setEdit(null);
    }
  };

  const remove = async (id: number) => {
    const d = await paytiFetch('edo-rule-delete', { query: `id=${id}` });
    if (d.ok) setRules(d.rules);
  };

  const toggleTpl = (id: string) => {
    if (!edit) return;
    const has = edit.template_ids.includes(id);
    setEdit({ ...edit, template_ids: has ? edit.template_ids.filter((t) => t !== id) : [...edit.template_ids, id] });
  };

  const funnelName = (id: string) => funnels.find((f) => f.id === id)?.name || `Воронка ${id}`;
  const stageName = (cat: string, id: string | null) => (id ? funnels.find((f) => f.id === cat)?.stages.find((s) => s.id === id)?.name || id : 'Любая стадия');
  const tplName = (id: string) => templates.find((t) => t.template_id === id)?.name || `Шаблон ${id}`;
  const stages = funnels.find((f) => f.id === edit?.category_id)?.stages || [];

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="font-medium">Правила: что забирать из сделки</p>
            <p className="text-sm text-muted-foreground">Хук смотрит на воронку и стадию сделки и берёт документы по шаблонам из подходящего правила. Если у стадии есть своё правило, оно главнее правила «любая стадия»</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={syncTemplates} disabled={loading}>{loading ? 'Загружаю...' : 'Обновить шаблоны'}</Button>
            <Button size="sm" onClick={() => setEdit({ ...empty })}>Добавить правило</Button>
          </div>
        </div>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        {rules.length === 0 && !edit && <p className="text-sm text-muted-foreground">Правил пока нет</p>}
        <div className="divide-y divide-border">
          {rules.map((r) => (
            <div key={r.id} className="py-3 flex items-start gap-3 text-sm">
              <div className="flex-1 space-y-1">
                <p className="font-medium">{r.name}{!r.enabled && <span className="text-xs text-muted-foreground ml-2">выключено</span>}</p>
                <p className="text-muted-foreground">{funnelName(r.category_id)} · {stageName(r.category_id, r.stage_id)}</p>
                <p className="text-muted-foreground">{r.template_ids.map(tplName).join(', ') || 'Шаблоны не выбраны'} · {PICKS[r.pick]}</p>
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-muted rounded px-2 py-1 break-all">{`${PAYTI_URL}?action=edo-hook&key=ВАШ_КЛЮЧ&dealId={{ID}}&rule=${r.id}`}</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(`${PAYTI_URL}?action=edo-hook&key=ВАШ_КЛЮЧ&dealId={{ID}}&rule=${r.id}`)}><Icon name="Copy" size={14} /></Button>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEdit({ ...r, stage_id: r.stage_id || '' })}>Изменить</Button>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id as number)}><Icon name="Trash2" size={16} /></Button>
            </div>
          ))}
        </div>
      </Card>

      {edit && (
        <Card className="p-6 space-y-4">
          <p className="font-medium">{edit.id ? 'Изменить правило' : 'Новое правило'}</p>
          <Field label="Название">
            <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Например: Первичка — договор на подписании" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Воронка">
              <select className={selectCls} value={edit.category_id} onChange={(e) => setEdit({ ...edit, category_id: e.target.value, stage_id: '' })}>
                {funnels.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </Field>
            <Field label="Стадия" hint="Если не выбрать, правило подойдёт для любой стадии воронки">
              <select className={selectCls} value={edit.stage_id || ''} onChange={(e) => setEdit({ ...edit, stage_id: e.target.value })}>
                <option value="">Любая стадия</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Какие документы брать (по шаблону генератора)</p>
            {templates.length === 0 && <p className="text-sm text-muted-foreground">Нажмите «Обновить шаблоны», чтобы загрузить список из Битрикс24</p>}
            <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-auto">
              {templates.map((t) => (
                <label key={t.template_id} className="flex items-center gap-2 text-sm rounded-md border border-border p-2 cursor-pointer">
                  <input type="checkbox" checked={edit.template_ids.includes(t.template_id)} onChange={() => toggleTpl(t.template_id)} />
                  <span>{t.name}</span>
                </label>
              ))}
            </div>
          </div>
          <Field label="Сколько документов брать" hint="Если в сделке несколько документов, например несколько версий договора">
            <select className={selectCls} value={edit.pick} onChange={(e) => setEdit({ ...edit, pick: e.target.value })}>
              {Object.entries(PICKS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={edit.enabled} onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })} />
            Правило включено
          </label>
          <div className="flex gap-2">
            <Button onClick={save} disabled={!edit.name.trim()}>Сохранить правило</Button>
            <Button variant="ghost" onClick={() => setEdit(null)}>Отмена</Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default EdoRules;
