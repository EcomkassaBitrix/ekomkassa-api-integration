import { ReactNode, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Icon from '@/components/ui/icon';

interface Props {
  children: ReactNode;
}

const HookCollapsible = ({ children }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <Card className="overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/40 transition-colors">
          <span className="font-medium flex items-center gap-2">
            <Icon name="Webhook" size={18} />
            Запуск из Битрикс24
          </span>
          <Icon name="ChevronDown" size={18} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default HookCollapsible;
