import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { PAYTI_URL } from '@/components/sections/PaytiSettingsDialog';

const PLUGIN_URL = 'https://www.cryptopro.ru/sites/default/files/products/cades/cadesplugin_api.js';

interface AppInfo {
  ok: boolean;
  status: string;
  expired: boolean;
  test: boolean;
  companyName: string;
  inn: string;
  serialNumber: string;
  fnNumber: string;
  model: string;
  address: string;
  place: string;
  rnm?: string;
  reason?: string;
  signerName?: string;
  error?: string;
}
interface CertItem {
  index: number;
  thumb: string;
  subject: string;
  validTo: string;
  lastName: string;
  givenName: string;
  position: string;
}

declare global {
  interface Window {
    cadesplugin?: any;
  }
}

const call = async (action: string, body?: unknown, token?: string) => {
  const r = await fetch(`${PAYTI_URL}?action=${action}${token ? `&token=${token}` : ''}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
};

const part = (subject: string, key: string) => {
  const m = subject.match(new RegExp(`(?:^|,\\s*)${key}=([^,]+)`));
  return m ? m[1].trim().replace(/^"|"$/g, '') : '';
};

const loadPlugin = () =>
  new Promise<void>((resolve, reject) => {
    if (window.cadesplugin) return resolve();
    const s = document.createElement('script');
    s.src = PLUGIN_URL;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('plugin'));
    document.head.appendChild(s);
  });

const DONE_TEXT: Record<string, string> = {
  sent_to_fns: 'Заявка подписана и отправлена в налоговую. Ответ придёт в течение рабочего дня, подписывать ничего больше не нужно.',
  approved: 'Касса зарегистрирована в налоговой.',
  rejected: 'Налоговая отклонила заявку.',
  test_signed: 'Тест пройден: подпись получена, в ОФД ничего не отправлено.',
  signing: 'Подпись отправляется, подождите минуту и обновите страницу.',
  sign_uncertain: 'Мы не получили ответ от ОФД. Подпись не отправляйте повторно, сообщите менеджеру.',
};

const SignPage = () => {
  const { token = '' } = useParams();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [certs, setCerts] = useState<CertItem[]>([]);
  const [selected, setSelected] = useState('');
  const [lastName, setLastName] = useState('');
  const [givenName, setGivenName] = useState('');
  const [position, setPosition] = useState('');
  const [plugin, setPlugin] = useState<'loading' | 'ok' | 'missing'>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    call('fns-public-get', undefined, token).then(setInfo).catch(() => setInfo({ ok: false, error: 'Нет связи с сервером' } as AppInfo));
  }, [token]);

  const readCerts = async () => {
    try {
      await loadPlugin();
      await window.cadesplugin;
      const store = await window.cadesplugin.CreateObjectAsync('CAdESCOM.Store');
      await store.Open(2, 'My', 2);
      const col = await store.Certificates;
      const count = await col.Count;
      const list: CertItem[] = [];
      for (let i = 1; i <= count; i++) {
        const c = await col.Item(i);
        const has = await c.HasPrivateKey();
        const to = new Date(await c.ValidToDate);
        if (!has || to < new Date()) continue;
        const subject = await c.SubjectName;
        list.push({
          index: i,
          thumb: await c.Thumbprint,
          subject,
          validTo: to.toLocaleDateString('ru-RU'),
          lastName: part(subject, 'SN'),
          givenName: part(subject, 'G'),
          position: part(subject, 'T'),
        });
      }
      await store.Close();
      setCerts(list);
      setPlugin('ok');
      if (list[0]) pick(list[0]);
    } catch {
      setPlugin('missing');
    }
  };

  const pick = (c: CertItem) => {
    setSelected(c.thumb);
    setLastName(c.lastName);
    setGivenName(c.givenName);
    setPosition(c.position || 'Индивидуальный предприниматель');
  };

  const open = info?.ok && !info.expired && ['created', 'awaiting_signature', 'test_created', 'test_awaiting_signature'].includes(info.status);

  useEffect(() => {
    if (open) readCerts();
  }, [open]);

  const sign = async () => {
    setBusy(true);
    setError('');
    try {
      const prep = await call('fns-public-prepare', { token, lastName, givenName, position });
      if (!prep.ok) throw new Error(prep.error || 'Не удалось подготовить документ');

      const store = await window.cadesplugin.CreateObjectAsync('CAdESCOM.Store');
      await store.Open(2, 'My', 2);
      const col = await store.Certificates;
      const found = await col.Find(0, selected);
      const cert = await found.Item(1);
      const signer = await window.cadesplugin.CreateObjectAsync('CAdESCOM.CPSigner');
      await signer.propset_Certificate(cert);
      await signer.propset_CheckCertificate(true);
      const sd = await window.cadesplugin.CreateObjectAsync('CAdESCOM.CadesSignedData');
      await sd.propset_ContentEncoding(1);
      await sd.propset_Content(btoa(prep.content));
      const signature = await sd.SignCades(signer, 1, false);
      await store.Close();

      const r = await call('fns-public-sign', { token, documentId: prep.documentId, signature });
      if (!r.ok) throw new Error(r.error || 'Подпись не принята');
      setDone(DONE_TEXT[r.status] || 'Готово');
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      setError(/cancel|отмен|0x8010006E/i.test(msg) ? 'Подписание отменено. Нажмите кнопку ещё раз и введите PIN-код.' : msg || 'Не удалось подписать');
    }
    setBusy(false);
  };

  const Row = ({ label, value }: { label: string; value?: string }) => (
    <div className="flex justify-between gap-4 py-2 border-b border-border last:border-0 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right break-words">{value || '—'}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4 py-10">
      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Icon name="FileSignature" size={22} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Подпись заявки на регистрацию кассы</h1>
            <p className="text-xs text-muted-foreground">Ekomkassa</p>
          </div>
        </div>

        {!info && <Card className="p-6 text-sm text-muted-foreground">Загрузка...</Card>}

        {info && !info.ok && <Card className="p-6 text-sm text-destructive">{info.error || 'Ссылка недействительна'}</Card>}

        {info?.ok && (
          <>
            {info.test && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">Тестовая заявка: в налоговую ничего не отправляется.</div>}

            <Card className="p-6">
              <p className="font-medium mb-2">Данные заявки</p>
              <Row label="Организация" value={info.companyName} />
              <Row label="ИНН" value={info.inn} />
              <Row label="Модель кассы" value={info.model} />
              <Row label="Заводской номер" value={info.serialNumber} />
              <Row label="Фискальный накопитель" value={info.fnNumber} />
              <Row label="Адрес установки" value={info.address} />
              <Row label="Место расчётов" value={info.place} />
            </Card>

            {info.expired && <Card className="p-6 text-sm text-destructive">Ссылка устарела. Попросите менеджера отправить новую.</Card>}

            {!info.expired && !open && !done && (
              <Card className="p-6 text-sm space-y-1">
                <p className="font-medium">{DONE_TEXT[info.status] || 'Заявка уже обработана'}</p>
                {info.rnm && <p>РНМ: <span className="font-mono">{info.rnm}</span></p>}
                {info.reason && <p className="text-destructive">{info.reason}</p>}
              </Card>
            )}

            {done && (
              <Card className="p-6 text-sm flex items-start gap-3 border-primary/40">
                <Icon name="CircleCheck" size={20} className="text-primary shrink-0" />
                <p className="font-medium">{done}</p>
              </Card>
            )}

            {open && !done && (
              <Card className="p-6 space-y-4">
                <p className="font-medium">Подпись квалифицированной электронной подписью</p>

                {plugin === 'loading' && <p className="text-sm text-muted-foreground">Ищем сертификаты на компьютере...</p>}

                {plugin === 'missing' && (
                  <div className="text-sm space-y-2">
                    <p className="text-destructive">Не удалось подключиться к КриптоПро.</p>
                    <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                      <li>Установите «КриптоПро ЭЦП Browser plug-in» и расширение для вашего браузера.</li>
                      <li>Вставьте токен с подписью в компьютер.</li>
                      <li>Разрешите странице доступ к плагину, если браузер спросит.</li>
                    </ul>
                    <Button variant="outline" onClick={() => { setPlugin('loading'); readCerts(); }}>Проверить снова</Button>
                  </div>
                )}

                {plugin === 'ok' && certs.length === 0 && (
                  <div className="text-sm space-y-2">
                    <p className="text-destructive">Подходящих сертификатов не найдено: нужен действующий сертификат с закрытым ключом.</p>
                    <Button variant="outline" onClick={() => { setPlugin('loading'); readCerts(); }}>Проверить снова</Button>
                  </div>
                )}

                {plugin === 'ok' && certs.length > 0 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs uppercase text-muted-foreground">Сертификат</label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={selected}
                        onChange={(e) => pick(certs.find((c) => c.thumb === e.target.value)!)}
                      >
                        {certs.map((c) => (
                          <option key={c.thumb} value={c.thumb}>
                            {[c.lastName, c.givenName].filter(Boolean).join(' ') || part(c.subject, 'CN')} · до {c.validTo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs uppercase text-muted-foreground">Фамилия</label>
                        <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs uppercase text-muted-foreground">Имя и отчество</label>
                        <Input value={givenName} onChange={(e) => setGivenName(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs uppercase text-muted-foreground">Должность</label>
                      <Input value={position} onChange={(e) => setPosition(e.target.value)} />
                    </div>
                    <p className="text-xs text-muted-foreground">Фамилия, имя и должность должны совпадать с данными сертификата. Подписать заявку может руководитель организации или ИП.</p>
                    <Button className="w-full gap-2" onClick={sign} disabled={busy || !lastName.trim() || !givenName.trim() || !position.trim()}>
                      <Icon name="PenLine" size={16} />
                      {busy ? 'Подписываем...' : 'Подписать и отправить в налоговую'}
                    </Button>
                  </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SignPage;
