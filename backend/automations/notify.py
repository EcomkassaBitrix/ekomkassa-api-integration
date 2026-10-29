import time

import requests

SEND_URL = 'https://functions.poehali.dev/ace36e55-b169-41f2-9d2b-546f92221bb7'
TG_PROVIDER = 'ek_tg'
TITLES = {'ofd': 'ОФД', 'payti': 'Payti'}
STATUS_TITLES = {
    'validation_failed': 'не хватает данных',
    'payti_validation_error': 'Payti отклонил данные',
    'ofd_validation_error': 'ОФД отклонил данные',
    'ofd_error': 'ошибка ОФД',
    'temporary_error': 'сервис не ответил',
    'error': 'ошибка настройки',
}
DEDUPE_MINUTES = 30
MAX_TRIES = 5


def queue(conn, kind, deal_id, status, error):
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM admin_notifications WHERE kind = %s AND deal_id = %s AND status = %s AND created_at > NOW() - (%s * INTERVAL '1 minute') LIMIT 1",
            (kind, str(deal_id), status, DEDUPE_MINUTES),
        )
        if cur.fetchone():
            cur.close()
            return
        text = (f"Ошибка регистрации в {TITLES.get(kind, kind)}\n"
                f"Сделка: {deal_id}\n"
                f"Причина: {STATUS_TITLES.get(status, status)}\n"
                f"Текст ошибки: {(error or 'не указан')[:500]}")
        cur.execute(
            "INSERT INTO admin_notifications (kind, deal_id, status, message_text) VALUES (%s, %s, %s, %s)",
            (kind, str(deal_id), status, text),
        )
        conn.commit()
        cur.close()
    except Exception as e:
        print(f'[NOTIFY] queue failed: {e}')
        conn.rollback()


def flush(conn, budget=2.5, max_items=5):
    deadline = time.time() + budget
    sent = 0
    try:
        cur = conn.cursor()
        cur.execute("SELECT api_key FROM api_keys WHERE is_active = true AND (expiry_date IS NULL OR expiry_date > NOW()) ORDER BY id LIMIT 1")
        key_row = cur.fetchone()
        cur.execute("SELECT phone FROM auth_users WHERE is_active = true AND phone IS NOT NULL AND phone <> ''")
        phones = [r['phone'] for r in cur.fetchall()]
        cur.execute(
            "SELECT id, message_text FROM admin_notifications WHERE sent_at IS NULL AND tries < %s AND created_at > NOW() - INTERVAL '1 day' ORDER BY id LIMIT %s",
            (MAX_TRIES, max_items),
        )
        items = cur.fetchall()
        if not items or not key_row:
            cur.close()
            return 0
        for item in items:
            ok = not phones
            for phone in phones:
                left = deadline - time.time()
                if left < 0.5:
                    break
                try:
                    r = requests.post(SEND_URL, json={'provider': TG_PROVIDER, 'recipient': phone, 'message': item['message_text']},
                                      headers={'X-Api-Key': key_row['api_key']}, timeout=min(left, 4))
                    if r.status_code == 200 and r.json().get('success'):
                        ok = True
                except Exception as e:
                    print(f'[NOTIFY] send failed: {e}')
            if ok:
                cur.execute("UPDATE admin_notifications SET sent_at = NOW(), tries = tries + 1 WHERE id = %s", (item['id'],))
                sent += 1
            elif deadline - time.time() >= 0.5:
                cur.execute("UPDATE admin_notifications SET tries = tries + 1 WHERE id = %s", (item['id'],))
            conn.commit()
            if deadline - time.time() < 0.5:
                break
        cur.close()
    except Exception as e:
        print(f'[NOTIFY] flush failed: {e}')
        conn.rollback()
    return sent
