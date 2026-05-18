import threading

from django.conf import settings
from django.core.mail import send_mail


def notify_package_received(package) -> None:
    resident = package.resident
    if not resident.email:
        return

    received_at_str = package.received_at.strftime("%d/%m/%Y %H:%M")
    carrier_str = package.carrier or "No especificado"

    body = (
        f"Hola {resident.username},\n\n"
        f"El conserje ha recibido un paquete para usted.\n\n"
        f"Descripción: {package.description}\n"
        f"Transportista: {carrier_str}\n"
        f"Fecha de recepción: {received_at_str}\n"
        f"{('Notas: ' + package.notes + chr(10)) if package.notes else ''}"
        f"\nPuede retirarlo en la conserjería.\n\n"
        f"Equipo Prodomia"
    )

    def send():
        try:
            send_mail(
                subject="Tiene un paquete esperándolo - Prodomia",
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[resident.email],
                fail_silently=False,
            )
        except BaseException:
            pass

    threading.Thread(target=send, daemon=True).start()
