import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { PAYTI_URL, paytiFetch } from './PaytiSettingsDialog';
import HookCollapsible from './HookCollapsible';
import HookLog from './HookLog';
import ServicesCard from './slots/ServicesCard';
import BookingsCard from './slots/BookingsCard';
import { BrandingCard, FunnelCard, RulesCard, TeamCard, WebhookCard } from './slots/SettingsCards';
import { Meta, SlotService, SlotSettings } from './slots/types';

const SlotsConsole = () => {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [s, setS] = useState<SlotSettings | null>(null);
  const [services, setServices] = useState<SlotService[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<'bookings' | 'settings'>('bookings');
  const [tick, setTick] = useState(0);
  const [busyInfo, setBusyInfo] = useState('');

  useEffect(() => {
    paytiFetch('slots-meta').then((d: Meta) => {
      setMeta(d);
      setS(d.settings);
      setServices(d.services || []);
    });
  }, []);

  const set = (patch: Partial<SlotSettings>) => {
    setSaved(false);
    setS((p) => (p ? { ...p, ...patch } : p));
  };

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const d = await paytiFetch('slots-settings', { method: 'POST', body: s });
    setSaving(false);
    if (d.error) {
      setBusyInfo(d.error);
      return;
    }
    if (d.settings) {
      setS(d.settings);
      setSaved(true);
      setTick((t) => t + 1);
    }
  };

  const checkBusy = async () => {
    setBusyInfo('Проверяю...');
    await save();
    const d = await paytiFetch('slots-busy-check');
    if (!d.ok) return setBusyInfo(`Не удалось прочитать календари: ${d.error}`);
    const total = Object.values(d.busy as Record<string, string[]>).reduce((a, b) => a + b.length, 0);
    setBusyInfo(`Календари читаются. Занятых промежутков на 7 дней: ${total}`);
  };

  if (!meta || !s) return <p className="text-muted-foreground">Загружаю настройки...</p>;

  const classifier = meta.fields.find((f) => f.code === s.classifier_field) || null;
  const hookUrl = `${PAYTI_URL}?action=slots-hook&key=ВАШ_КЛЮЧ&dealId={{ID}}`;

  return (
    <div className="space-y-6">
      {meta.errors.length > 0 && (
        <Card className="p-4 text-sm text-destructive flex gap-2">
          <Icon name="CircleAlert" size={16} className="mt-0.5 shrink-0" />
          <span>Битрикс24 ответил с ошибкой: {meta.errors[0]}. Проверьте права вебхука (CRM, календарь, задачи, пользователи).</span>
        </Card>
      )}

      <HookCollapsible>
        <p className="text-sm text-muted-foreground">
          Добавьте робота «Вебхук» на этап «Согласование времени». Он создаст ссылку для клиента и запишет её в сделку.
        </p>
        <div className="flex gap-2">
          <code className="flex-1 text-xs bg-muted rounded-md p-3 break-all">{hookUrl}</code>
          <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(hookUrl)}><Icon name="Copy" size={16} /></Button>
        </div>
      </HookCollapsible>

      <div className="flex gap-2">
        <Button variant={view === 'bookings' ? 'default' : 'outline'} size="sm" onClick={() => setView('bookings')}>Записи</Button>
        <Button variant={view === 'settings' ? 'default' : 'outline'} size="sm" onClick={() => setView('settings')}>Настройки</Button>
      </div>

      {view === 'bookings' && (
        <>
          <BookingsCard refreshKey={tick} />
          <HookLog kind="slots" />
        </>
      )}

      {view === 'settings' && (
        <>
          <WebhookCard s={s} set={set} onSave={save} />
          <BrandingCard s={s} set={set} />
          <FunnelCard meta={meta} s={s} set={set} />
          <ServicesCard services={services} classifier={classifier} crmFields={meta.fields} onChange={setServices} />
          <TeamCard meta={meta} s={s} set={set} />
          <RulesCard s={s} set={set} />
          <div className="flex items-center gap-3 sticky bottom-0 bg-background/90 backdrop-blur py-3">
            <Button onClick={save} disabled={saving}>{saving ? 'Сохраняю...' : 'Сохранить настройки'}</Button>
            <Button variant="outline" onClick={checkBusy}>Проверить календари</Button>
            {saved && <span className="text-sm text-primary">Сохранено</span>}
            {busyInfo && <span className="text-sm text-muted-foreground">{busyInfo}</span>}
          </div>
        </>
      )}
    </div>
  );
};

export default SlotsConsole;
