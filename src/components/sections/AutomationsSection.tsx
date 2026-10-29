import { useState } from 'react';
import Icon from '@/components/ui/icon';
import PaytiConsole from './PaytiConsole';
import OfdConsole from './OfdConsole';
import FnsConsole from './FnsConsole';

const tabs = [
  { id: 'lk', label: 'ЛК Екомкасса (Payti)', icon: 'UserCog' },
  { id: 'ofd', label: 'ОФД', icon: 'Receipt' },
  { id: 'fns', label: 'Регистрация кассы в ФНС', icon: 'FileSignature' },
];

const AutomationsSection = () => {
  const [tab, setTab] = useState('lk');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 transition-all ${
              tab === t.id
                ? 'border-primary text-foreground font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name={t.icon} size={18} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'lk' && <PaytiConsole />}
      {tab === 'ofd' && <OfdConsole />}
      {tab === 'fns' && <FnsConsole />}
    </div>
  );
};

export default AutomationsSection;