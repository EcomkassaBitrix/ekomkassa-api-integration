import payti
import ofd
import fns
import details
import hooklog


def handler(event, context):
    """Автоматизации: создание личных кабинетов в Екомкасса (Payti) и ОФД.ру, заявки на регистрацию касс в ФНС по хукам из Битрикс24"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {**payti.CORS, 'Access-Control-Max-Age': '86400'}, 'body': '', 'isBase64Encoded': False}
    ofd.CTX['context'] = context
    action = (event.get('queryStringParameters') or {}).get('action', '')
    if action in hooklog.HOOK_ACTIONS:
        if action in payti.ACTIONS:
            result = payti.handle(event, action)
        elif action in ofd.ACTIONS:
            result = ofd.handle(event, action)
        else:
            result = fns.handle(event, action)
        hooklog.record(event, action, result)
        return result
    if action in payti.ACTIONS:
        return payti.handle(event, action)
    if action in ofd.ACTIONS:
        return ofd.handle(event, action)
    if action in fns.ACTIONS:
        return fns.handle(event, action)
    if action in details.ACTIONS:
        return details.handle(event, action)
    return payti.resp(400, {'error': 'Unknown action'})
