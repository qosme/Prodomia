import uuid
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="MonthlyFee",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("unit", models.CharField(max_length=50)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("period_year", models.PositiveIntegerField()),
                ("period_month", models.PositiveIntegerField()),
                ("due_date", models.DateField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "unique_together": {("unit", "period_year", "period_month")},
            },
        ),
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("status", models.CharField(
                    choices=[
                        ("PENDING", "Pending"),
                        ("PAID", "Paid"),
                        ("FAILED", "Failed"),
                        ("MANUAL", "Manual"),
                    ],
                    default="PENDING",
                    max_length=20,
                )),
                ("token", models.CharField(blank=True, max_length=200)),
                ("buy_order", models.CharField(blank=True, max_length=64, null=True, unique=True)),
                ("session_id", models.CharField(blank=True, max_length=64)),
                ("transaction_date", models.DateTimeField(blank=True, null=True)),
                ("authorization_code", models.CharField(blank=True, max_length=50)),
                ("response_code", models.IntegerField(blank=True, null=True)),
                ("payment_type_code", models.CharField(blank=True, max_length=10)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("monthly_fee", models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="payments",
                    to="payments.monthlyfee",
                )),
                ("resident", models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="payments",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("marked_paid_by", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="payments_marked_paid",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
        migrations.CreateModel(
            name="Announcement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200)),
                ("body", models.TextField()),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="announcements",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
    ]
