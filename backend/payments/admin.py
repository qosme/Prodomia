from django.contrib import admin
from .models import Announcement, MonthlyFee, Payment


@admin.register(MonthlyFee)
class MonthlyFeeAdmin(admin.ModelAdmin):
    list_display = ["unit", "period_year", "period_month", "amount", "due_date"]
    list_filter = ["period_year", "period_month"]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "resident", "monthly_fee", "amount", "status", "created_at"]
    list_filter = ["status"]
    readonly_fields = ["id", "token", "buy_order", "session_id"]


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ["title", "created_by", "is_active", "created_at"]
    list_filter = ["is_active"]
