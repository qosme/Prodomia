from django.conf import settings
from transbank.webpay.webpay_plus.transaction import Transaction
from transbank.common.options import WebpayOptions
from transbank.common.integration_type import IntegrationType


def _get_options():
    environment = getattr(settings, "TRANSBANK_ENVIRONMENT", "TEST")
    if environment == "LIVE":
        integration_type = IntegrationType.LIVE
    else:
        integration_type = IntegrationType.TEST

    return WebpayOptions(
        commerce_code=settings.TRANSBANK_COMMERCE_CODE,
        api_key=settings.TRANSBANK_API_KEY,
        integration_type=integration_type,
    )


def init_transaction(buy_order: str, session_id: str, amount: int, return_url: str) -> dict:
    """
    Creates a Transbank WebPay Plus transaction.
    Returns a dict with 'token' and 'url' keys.
    """
    tx = Transaction(_get_options())
    response = tx.create(buy_order, session_id, amount, return_url)
    return {"token": response["token"], "url": response["url"]}


def confirm_transaction(token: str):
    """
    Commits a Transbank WebPay Plus transaction.
    Returns the full response object from Transbank.
    """
    tx = Transaction(_get_options())
    return tx.commit(token)
