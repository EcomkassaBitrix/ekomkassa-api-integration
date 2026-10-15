import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import Icon from '@/components/ui/icon';
import { authCall, setToken } from '@/lib/auth';

const CHANNELS = [
  { id: 'email', title: 'Почта', icon: 'Mail' },
  { id: 'telegram', title: 'Telegram', icon: 'Send' },
  { id: 'whatsapp', title: 'WhatsApp', icon: 'MessageCircle' },
  { id: 'max', title: 'MAX', icon: 'MessageSquare' },
];

const LoginForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [identifier, setIdentifier] = useState(localStorage.getItem('loginId') || '');
  const [step, setStep] = useState<'id' | 'code'>('id');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [channel, setChannel] = useState('email');

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const sendCode = async (ch: string) => {
    if (!identifier.trim()) return;
    setBusy(ch);
    setError('');
    const { status, data } = await authCall('request', { identifier, channel: ch });
    setBusy('');
    if (status !== 200) {
      setError(data.error || 'Не удалось отправить код');
      return;
    }
    localStorage.setItem('loginId', identifier);
    setChannel(ch);
    setSentTo(data.to || '');
    setCode('');
    setTimer(60);
    setStep('code');
  };

  const verify = async (value: string) => {
    setBusy('verify');
    setError('');
    const { status, data } = await authCall('verify', { identifier, code: value });
    setBusy('');
    if (status === 200 && data.token) {
      setToken(data.token);
      onSuccess();
      return;
    }
    setError(data.error || 'Неверный код');
    setCode('');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Icon name="Zap" size={24} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Ekomkassa</h1>
            <p className="text-xs text-muted-foreground">Integration Hub</p>
          </div>
        </div>

        {step === 'id' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs uppercase text-muted-foreground">Почта или телефон</label>
              <Input
                autoFocus
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendCode('email')}
                placeholder="services@ecomkassa.ru"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Куда отправить код:</p>
              <div className="grid grid-cols-2 gap-2">
                {CHANNELS.map((c) => (
                  <Button key={c.id} variant="outline" className="gap-2 justify-start" disabled={!!busy || !identifier.trim()} onClick={() => sendCode(c.id)}>
                    <Icon name={c.icon} size={16} />
                    {busy === c.id ? 'Отправляю...' : c.title}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {sentTo ? `Код отправлен: ${sentTo}.` : 'Если такой пользователь есть, код отправлен.'} Введите 6 цифр.
            </p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={verify} disabled={busy === 'verify'} autoFocus>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="flex items-center justify-between text-sm">
              <button className="text-muted-foreground hover:text-foreground" onClick={() => { setStep('id'); setError(''); }}>
                Назад
              </button>
              <button
                className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                disabled={timer > 0 || !!busy}
                onClick={() => sendCode(channel)}
              >
                {timer > 0 ? `Отправить снова через ${timer} с` : 'Отправить снова'}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </Card>
    </div>
  );
};

export default LoginForm;
