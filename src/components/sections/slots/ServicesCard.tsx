import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { paytiFetch } from '../PaytiSettingsDialog';
import { CrmFieldMeta, SlotService, WEEKDAYS, selectCls } from './types';

interface Props {
  services: SlotService[];
  classifier: CrmFieldMeta | null;
  onChange: (s: SlotService[]) => void;
}

const empty: SlotService = {
  id: 0, name: '', match_values: [], duration_min: 60, buffer_min: 0, work_days: [1, 2, 3, 4, 5],
  work_from: '09:00', work_to: '18:00', is_default: false, is_active: true,
};

const ServicesCard = ({ services, classifier, onChange }: Props) => {
  const [edit, setEdit] = useState<SlotService | null>(null);
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState('');

  const save = async () => {
    if (!edit || !edit.name.trim()) return;
    setSaving(true);
    const d = await paytiFetch('slots-service-save', { method: 'POST', body: edit });
    setSaving(false);
    if (d.services) {
      onChange(d.services);
      setEdit(null);
    }
  };

  const remove = async (id: number) => {
    const d = await paytiFetch('slots-service-delete', { method: 'POST', body: { id } });
    if (d.services) onChange(d.services);
  };

  const toggleVal = (v: string) => {
    if (!edit) return;
    const has = edit.match_values.includes(v);
    setEdit({ ...edit, match_values: has ? edit.match_values.filter((x) => x !== v) : [...edit.match_values, v] });
  };

  const toggleDay = (n: number) => {
    if (!edit) return;
    const has = edit.work_days.includes(n);
    setEdit({ ...edit, work_days: has ? edit.work_days.filter((x) => x !== n) : [...edit.work_days, n].sort() });
  };

  const addCustom = () => {
    const v = custom.trim();
    if (!v || !edit || edit.match_values.includes(v)) return;
    setEdit({ ...edit, match_values: [...edit.match_values, v] });
    setCustom('');
  };

  const daysText = (d: number[]) => WEEKDAYS.filter((w) => d.includes(w.n)).map((w) => w.label).join(', ') || '—';

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Услуги и время на слот</p>
          <p className="text-sm text-muted-foreground">Какая услуга сколько занимает и когда её можно назначать</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setEdit({ ...empty })}>
          <Icon name="Plus" size={14} />
          Добавить услугу
        </Button>
      </div>

      <div className="space-y-2">
        {services.filter((s) => s.is_active).length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Услуг пока нет</p>}
        {services.filter((s) => s.is_active).map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div className="min-w-0">
              <p className="font-medium flex items-center gap-2">
                {s.name}
                {s.is_default && <Badge variant="secondary">По умолчанию</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.duration_min} мин{s.buffer_min ? ` + перерыв ${s.buffer_min} мин` : ''} · {daysText(s.work_days)} · {s.work_from}–{s.work_to}
              </p>
              <p className="text-xs text-muted-foreground truncate">Квалификации: {s.match_values.length ? s.match_values.join(', ') : 'не заданы'}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={() => setEdit(s)}><Icon name="Pencil" size={16} /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Icon name="Trash2" size={16} /></Button>
            </div>
          </div>
        ))}
      </div>

      {edit && (
        <div className="rounded-lg border border-primary/40 p-4 space-y-4 bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-sm space-y-1 md:col-span-3">
              <span className="text-muted-foreground">Название услуги</span>
              <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Настройка кассы" />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Длительность, мин</span>
              <Input type="number" min={5} value={edit.duration_min} onChange={(e) => setEdit({ ...edit, duration_min: Number(e.target.value) })} />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Перерыв после, мин</span>
              <Input type="number" min={0} value={edit.buffer_min} onChange={(e) => setEdit({ ...edit, buffer_min: Number(e.target.value) })} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm space-y-1">
                <span className="text-muted-foreground">С</span>
                <Input type="time" value={edit.work_from} onChange={(e) => setEdit({ ...edit, work_from: e.target.value })} />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-muted-foreground">До</span>
                <Input type="time" value={edit.work_to} onChange={(e) => setEdit({ ...edit, work_to: e.target.value })} />
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Дни недели</span>
            <div className="flex gap-2 flex-wrap">
              {WEEKDAYS.map((w) => (
                <button
                  key={w.n}
                  type="button"
                  onClick={() => toggleDay(w.n)}
                  className={`h-9 w-11 rounded-md border text-sm transition-colors ${edit.work_days.includes(w.n) ? 'bg-primary text-primary-foreground border-primary' : 'border-input text-muted-foreground hover:bg-muted'}`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">
              Какие значения поля «{classifier?.title || 'классификатор не выбран'}» относятся к этой услуге
            </span>
            {classifier && classifier.items.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {classifier.items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => toggleVal(it.value)}
                    className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${edit.match_values.includes(it.value) ? 'bg-primary text-primary-foreground border-primary' : 'border-input text-muted-foreground hover:bg-muted'}`}
                  >
                    {it.value}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Или впишите значение вручную" onKeyDown={(e) => e.key === 'Enter' && addCustom()} />
              <Button type="button" variant="outline" onClick={addCustom}>Добавить</Button>
            </div>
            {edit.match_values.filter((v) => !classifier?.items.some((i) => i.value === v)).length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {edit.match_values.filter((v) => !classifier?.items.some((i) => i.value === v)).map((v) => (
                  <Badge key={v} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleVal(v)}>{v}<Icon name="X" size={12} /></Badge>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={edit.is_default} onChange={(e) => setEdit({ ...edit, is_default: e.target.checked })} />
            Использовать, если ни одно значение не подошло
          </label>

          <div className="flex gap-2">
            <Button onClick={save} disabled={saving || !edit.name.trim()}>{saving ? 'Сохраняю...' : 'Сохранить услугу'}</Button>
            <Button variant="outline" onClick={() => setEdit(null)}>Отмена</Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ServicesCard;
