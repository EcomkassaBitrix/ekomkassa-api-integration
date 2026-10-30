import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { PAYTI_URL, paytiFetch } from './PaytiSettingsDialog';
import HookCollapsible from './HookCollapsible';
import EdoSettings, { EdoField, EdoSettingsData, EdoTemplate } from './edo/EdoSettings';
import EdoRules from './edo/EdoRules';
import EdoRequests from './edo/EdoRequests';

const EdoConsole = () => {
  const [s, setS] = useState<EdoSettingsData | null>(null);
  const [fields, setFields] = useState<EdoField[]>([]);
  const [templates, setTemplates] = useState<EdoTemplate[]>([]);
  const [error, setError] = useState('');
  const [view, setView] = useState<'requests' | 'rules' | 'settings'>('requests');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    paytiFetch('edo-meta').then((d) => {
      setS(d.settings);
      setFields(d.fields || []);
      setTemplates(d.templates || []);
      setError(d.error || '');
    });
  }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const d = await paytiFetch('edo-settings', { method: 'POST', body: s });
    setSaving(false);
    if (d.settings) {
      setS(d.settings);
      setSaved(true);
      const m = await paytiFetch('edo-meta');
      setFields(m.fields || []);
      setError(m.error || '');
    }
  };

  const set = (patch: EdoSettingsData) => {
    setSaved(false);
    setS((p) => (p ? { ...p, ...patch } : p));
  };

  if (!s) return <p className="text-muted-foreground">Загружаю настройки...</p>;

  const hookUrl = `${PAYTI_URL}?action=edo-hook&key=ВАШ_КЛЮЧ&dealId={{ID}}`;

  return (
    <div className="space-y-6">
      {error && (
        <Card className="p-4 text-sm text-destructive flex gap-2">
          <Icon name="CircleAlert" size={16} className="mt-0.5 shrink-0" />
          <span>Битрикс24 ответил с ошибкой: {error}</span>
        </Card>
      )}

      <HookCollapsible>
        <p className="text-sm text-muted-foreground">Добавьте робота «Вебхук» на нужную стадию сделки. Система определит воронку и стадию, найдёт подходящее правило и подготовит документы для ЭДО. Чтобы запустить конкретное правило, добавьте в ссылку &rule=номер (ссылки есть на вкладке «Правила»).</p>
        <div className="flex gap-2">
          <code className="flex-1 text-xs bg-muted rounded-md p-3 break-all">{hookUrl}</code>
          <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(hookUrl)}><Icon name="Copy" size={16} /></Button>
        </div>
      </HookCollapsible>

      <div className="flex gap-2">
        <Button variant={view === 'requests' ? 'default' : 'outline'} size="sm" onClick={() => setView('requests')}>Запросы по сделкам</Button>
        <Button variant={view === 'rules' ? 'default' : 'outline'} size="sm" onClick={() => setView('rules')}>Правила</Button>
        <Button variant={view === 'settings' ? 'default' : 'outline'} size="sm" onClick={() => setView('settings')}>Настройки</Button>
      </div>

      {view === 'requests' && <EdoRequests refreshKey={tick} />}

      {view === 'rules' && <EdoRules templates={templates} onTemplates={setTemplates} />}

      {view === 'settings' && (
        <>
          <EdoSettings s={s} set={set} fields={fields} onSave={save} />
          <div className="flex items-center gap-3 sticky bottom-0 bg-background/90 backdrop-blur py-3">
            <Button onClick={async () => { await save(); setTick((t) => t + 1); }} disabled={saving}>{saving ? 'Сохраняю...' : 'Сохранить настройки'}</Button>
            {saved && <span className="text-sm text-primary">Сохранено</span>}
          </div>
        </>
      )}
    </div>
  );
};

export default EdoConsole;
