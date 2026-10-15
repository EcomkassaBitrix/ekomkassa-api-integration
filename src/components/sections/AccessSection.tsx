import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { authCall } from '@/lib/auth';

interface AuthUser {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  is_active: boolean;
  is_owner: boolean;
  created_at: string;
  last_login_at: string | null;
}

const fmt = (v: string | null) => (v ? new Date(v.replace(' ', 'T') + 'Z').toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : 'не входил');
const fmtPhone = (p: string | null) => (p && p.length === 11 ? `+7 ${p.slice(1, 4)} ${p.slice(4, 7)}-${p.slice(7, 9)}-${p.slice(9)}` : '—');

const AccessSection = ({ inviteOpen, setInviteOpen }: { inviteOpen: boolean; setInviteOpen: (v: boolean) => void }) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    const { data } = await authCall('users-list');
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const invite = async () => {
    setBusy(true);
    setError('');
    const { status, data } = await authCall('users-invite', { name, email, phone, origin: window.location.origin });
    setBusy(false);
    if (status !== 200) {
      setError(data.error || 'Не удалось добавить');
      return;
    }
    setNotice(data.inviteSent ? `Приглашение отправлено на ${email}` : `Пользователь добавлен, но письмо не ушло. Сообщите ему адрес сайта сами`);
    setName('');
    setEmail('');
    setPhone('');
    setInviteOpen(false);
    load();
  };

  const toggle = async (u: AuthUser, active: boolean) => {
    await authCall('users-toggle', { id: u.id, active });
    load();
  };

  const remove = async (u: AuthUser) => {
    if (!window.confirm(`Удалить доступ для ${u.email}? Он сразу выйдет из кабинета.`)) return;
    await authCall('users-delete', { id: u.id });
    load();
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-muted-foreground hover:text-foreground">
            <Icon name="X" size={16} />
          </button>
        </div>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Пользователь</th>
              <th className="text-left px-4 py-3 font-medium">Телефон</th>
              <th className="text-left px-4 py-3 font-medium">Последний вход</th>
              <th className="text-left px-4 py-3 font-medium">Доступ</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Загрузка...</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.name || u.email}</span>
                    {u.is_owner && <Badge>Владелец</Badge>}
                    {!u.is_owner && !u.is_active && <Badge variant="secondary">Отключён</Badge>}
                  </div>
                  {u.name && <p className="text-xs text-muted-foreground">{u.email}</p>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{fmtPhone(u.phone)}</td>
                <td className="px-4 py-3 text-muted-foreground">{fmt(u.last_login_at)}</td>
                <td className="px-4 py-3">
                  {u.is_owner ? (
                    <span className="text-muted-foreground">Полный</span>
                  ) : (
                    <Switch checked={u.is_active} onCheckedChange={(v) => toggle(u, v)} />
                  )}
                </td>
                <td className="px-4 py-3">
                  {!u.is_owner && (
                    <button className="text-muted-foreground hover:text-destructive" title="Удалить" onClick={() => remove(u)}>
                      <Icon name="Trash2" size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground">
        Приглашённые заходят по коду на почту или в мессенджер, как и вы. Раздел «Доступы» видите только вы.
      </p>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пригласить пользователя</DialogTitle>
            <DialogDescription>Ему придёт письмо со ссылкой. Войти он сможет по коду, который уйдёт на почту или телефон.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs uppercase text-muted-foreground">Имя</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван Петров" />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase text-muted-foreground">Почта</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ivan@company.ru" />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase text-muted-foreground">Телефон для кодов в мессенджеры (необязательно)</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="89991234567" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={invite} disabled={busy || !email.trim()}>
              {busy ? 'Отправляю...' : 'Отправить приглашение'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessSection;
