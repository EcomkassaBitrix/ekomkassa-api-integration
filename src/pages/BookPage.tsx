import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { PAYTI_URL } from '@/components/sections/PaytiSettingsDialog';

interface Info {
  ok: boolean;
  status: 'invited' | 'booked' | 'cancelled';
  expired: boolean;
  title: string;
  logo: string;
  timezone: string;
  service: string;
  durationMin: number;
  start: string | null;
  end: string | null;
  employee: string;
  canReschedule: boolean;
  rescheduleHours: number;
  horizonDays: number;
  dealTitle: string;
  fields?: { id: string; label: string; hint: string }[];
  answers?: Record<string, string>;
  error?: string;
}

const call = async (action: string, token: string, opts: { body?: unknown; query?: string } = {}) => {
  const r = await fetch(`${PAYTI_URL}?action=${action}&token=${token}${opts.query ? '&' + opts.query : ''}`, {
    method: opts.body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return { code: r.status, data: await r.json() };
};

const dayKey = (iso: string, tz: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: tz });
const fmtDay = (iso: string, tz: string) => new Date(iso).toLocaleDateString('ru-RU', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'long' });
const fmtRange = (iso: string, mins: number, tz: string) => `${fmtTime(iso, tz)}–${fmtTime(new Date(new Date(iso).getTime() + mins * 60000).toISOString(), tz)}`;

const fmtTime = (iso: string, tz: string) => new Date(iso).toLocaleTimeString('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
const fmtFull = (iso: string, tz: string) => new Date(iso).toLocaleString('ru-RU', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const StepBar = ({ step }: { step: 1 | 2 }) => (
  <div className="flex items-center gap-2 text-sm">
    {[{ n: 1, t: 'Выберите время' }, { n: 2, t: 'Заполните информацию' }].map((x) => (
      <div key={x.n} className={`flex items-center gap-2 ${step === x.n ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === x.n ? 'bg-primary text-primary-foreground' : step > x.n ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>{x.n}</span>
        {x.t}
        {x.n === 1 && <span className="text-muted-foreground">›</span>}
      </div>
    ))}
  </div>
);

const BookPage = () => {
  const { token = '' } = useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [day, setDay] = useState('');
  const [picked, setPicked] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [justBooked, setJustBooked] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const tz = info?.timezone || 'Europe/Moscow';

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    const { data } = await call('slots-public-slots', token);
    setLoadingSlots(false);
    setSlots(data.slots || []);
  }, [token]);

  const loadInfo = useCallback(async () => {
    const { data } = await call('slots-public-get', token);
    setInfo(data);
    return data as Info;
  }, [token]);

  useEffect(() => {
    if (info?.answers) setAnswers((prev) => ({ ...info.answers, ...prev }));
  }, [info?.answers]);

  useEffect(() => {
    if (!info?.title) return;
    document.title = info.title;
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', info.title);
  }, [info?.title]);

  useEffect(() => {
    loadInfo().then((d) => {
      if (d.ok && d.status === 'invited' && !d.expired) {
        setChoosing(true);
        loadSlots();
      }
    });
  }, [loadInfo, loadSlots]);

  const days = useMemo(() => {
    const map = new Map<string, string[]>();
    slots.forEach((s) => {
      const k = dayKey(s, tz);
      map.set(k, [...(map.get(k) || []), s]);
    });
    return Array.from(map.entries());
  }, [slots, tz]);

  useEffect(() => {
    if (days.length && !days.some(([k]) => k === day)) setDay(days[0][0]);
  }, [days, day]);

  const book = async () => {
    setBusy(true);
    setError('');
    let code = 0;
    let data: any = {};
    try {
      const r = await call('slots-public-book', token, { body: { start: picked, answers } });
      code = r.code;
      data = r.data;
    } catch {
      data = { error: 'Не удалось записаться. Попробуйте ещё раз' };
    }
    setBusy(false);
    if (code === 200) {
      setInfo(data);
      setChoosing(false);
      setJustBooked(true);
      setPicked('');
      setStep(1);
      return;
    }
    setError(data.error || 'Не удалось записаться');
    if (data.taken) {
      setPicked('');
      setStep(1);
      loadSlots();
    }
  };

  const startReschedule = () => {
    setStep(1);
    setChoosing(true);
    setJustBooked(false);
    setPicked('');
    setError('');
    loadSlots();
  };

  const calTitle = info ? `${info.service || 'Настройка'}` : '';
  const googleUrl = info?.start && info.end
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calTitle)}&dates=${icsDate(info.start)}/${icsDate(info.end)}&details=${encodeURIComponent(info.title)}`
    : '';

  const downloadIcs = () => {
    if (!info?.start || !info.end) return;
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Booking//RU', 'BEGIN:VEVENT', `UID:${token}@booking`, `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${icsDate(info.start)}`, `DTEND:${icsDate(info.end)}`, `SUMMARY:${calTitle}`, `DESCRIPTION:${info.title}`,
      'BEGIN:VALARM', 'TRIGGER:-PT60M', 'ACTION:DISPLAY', 'DESCRIPTION:Напоминание', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'zapis.ics';
    a.click();
  };

  const header = (
    <div className="flex items-center gap-3 mb-6">
      {info?.logo && <img src={info.logo} alt="" className="h-12 max-w-[160px] object-contain" />}
      <h1 className="text-xl font-bold">{info?.title || 'Запись на настройку'}</h1>
    </div>
  );

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background flex justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl">
        {header}
        {children}
      </div>
    </div>
  );

  if (!info) return shell(<p className="text-muted-foreground">Загружаю...</p>);

  if (!info.ok) {
    return shell(
      <Card className="p-6 text-center space-y-2">
        <Icon name="LinkOff" size={32} className="mx-auto text-muted-foreground" />
        <p className="font-medium">Ссылка не найдена</p>
        <p className="text-sm text-muted-foreground">Проверьте адрес или запросите новую ссылку у менеджера</p>
      </Card>,
    );
  }

  if (info.status === 'cancelled' || (info.status === 'invited' && info.expired)) {
    return shell(
      <Card className="p-6 text-center space-y-2">
        <Icon name="Clock" size={32} className="mx-auto text-muted-foreground" />
        <p className="font-medium">{info.status === 'cancelled' ? 'Запись отменена' : 'Срок действия ссылки истёк'}</p>
        <p className="text-sm text-muted-foreground">Свяжитесь с менеджером, чтобы получить новую ссылку</p>
      </Card>,
    );
  }

  const hasFields = !!info.fields?.length;

  if (choosing && step === 2 && hasFields) {
    const ready = info.fields!.every((f) => (answers[f.id] || '').trim());
    return shell(
      <Card className="p-6 space-y-5">
        <StepBar step={2} />
        <div>
          <p className="font-medium">Заполните необходимую информацию</p>
          <p className="text-sm text-muted-foreground">Выбрано: {fmtFull(picked, tz)}. Все поля обязательны.</p>
        </div>
        <div className="space-y-4">
          {info.fields!.map((f) => (
            <label key={f.id} className="block space-y-1">
              <span className="text-sm font-medium">{f.label}</span>
              {f.hint && <span className="block text-xs text-muted-foreground">{f.hint}</span>}
              <Input value={answers[f.id] || ''} onChange={(e) => setAnswers({ ...answers, [f.id]: e.target.value })} />
            </label>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button className="flex-1" disabled={!ready || busy} onClick={book}>{busy ? 'Записываю...' : 'Записаться'}</Button>
          <Button variant="outline" onClick={() => { setError(''); setStep(1); }}>Назад</Button>
        </div>
      </Card>,
    );
  }

  if (choosing) {
    const daySlots = days.find(([k]) => k === day)?.[1] || [];
    return shell(
      <Card className="p-6 space-y-5">
        {hasFields && <StepBar step={1} />}
        <div>
          <p className="font-medium">{info.service}</p>
          <p className="text-sm text-muted-foreground">Длительность {info.durationMin} мин · время по поясу {info.timezone}</p>
          {info.status === 'booked' && info.start && <p className="text-sm text-muted-foreground mt-1">Сейчас: {fmtFull(info.start, tz)}</p>}
        </div>

        {loadingSlots && <p className="text-sm text-muted-foreground">Ищу свободное время...</p>}
        {!loadingSlots && days.length === 0 && (
          <div className="text-center py-6 space-y-1">
            <Icon name="CalendarX" size={28} className="mx-auto text-muted-foreground" />
            <p className="font-medium">Свободного времени пока нет</p>
            <p className="text-sm text-muted-foreground">Загляните позже или напишите менеджеру</p>
          </div>
        )}

        {days.length > 0 && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map(([k, list]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setDay(k); setPicked(''); }}
                  className={`shrink-0 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${day === k ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}
                >
                  <span className="block capitalize">{fmtDay(list[0], tz)}</span>
                  <span className="text-xs opacity-80">{list.length} вариантов</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {daySlots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPicked(s)}
                  className={`h-10 rounded-md border text-sm transition-colors ${picked === s ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}
                >
                  {info?.durationMin ? fmtRange(s, info.durationMin, tz) : fmtTime(s, tz)}
                </button>
              ))}
            </div>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          {hasFields ? (
            <Button className="flex-1" disabled={!picked || busy} onClick={() => { setError(''); setStep(2); }}>
              {picked ? 'Далее' : 'Выберите время'}
            </Button>
          ) : (
            <Button className="flex-1" disabled={!picked || busy} onClick={book}>
              {busy ? 'Записываю...' : picked ? `Записаться на ${fmtFull(picked, tz)}` : 'Выберите время'}
            </Button>
          )}
          {info.status === 'booked' && <Button variant="outline" onClick={() => setChoosing(false)}>Назад</Button>}
        </div>
      </Card>,
    );
  }

  return shell(
    <Card className="p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon name="CalendarCheck" size={22} />
        </div>
        <div>
          <p className="font-semibold text-lg">{justBooked ? 'Вы записаны' : 'Ваша запись'}</p>
          <p className="text-sm text-muted-foreground">{info.service}</p>
        </div>
      </div>

      {info.start && (
        <div className="rounded-lg bg-muted/40 p-4 space-y-1">
          <p className="text-lg font-medium capitalize">{fmtFull(info.start, tz)}</p>
          <p className="text-sm text-muted-foreground">
            до {info.end && fmtTime(info.end, tz)} · {info.durationMin} мин · {info.timezone}
          </p>
          {info.employee && <p className="text-sm">Специалист: {info.employee}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button variant="outline" className="gap-2" onClick={downloadIcs}>
          <Icon name="CalendarPlus" size={16} />
          В календарь (.ics)
        </Button>
        <Button variant="outline" className="gap-2" asChild>
          <a href={googleUrl} target="_blank" rel="noreferrer">
            <Icon name="Calendar" size={16} />
            Google Календарь
          </a>
        </Button>
      </div>

      {info.canReschedule ? (
        <Button variant="ghost" className="w-full gap-2" onClick={startReschedule}>
          <Icon name="CalendarClock" size={16} />
          Перенести на другое время
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground text-center">Перенос возможен не позднее чем за {info.rescheduleHours} ч до начала. Для изменений свяжитесь с менеджером.</p>
      )}
    </Card>,
  );
};

export default BookPage;
