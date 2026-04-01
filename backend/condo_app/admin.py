from django.contrib import admin



from .models import (
    Complaint,
    ComplaintAssignment,
    ComplaintComment,
    ComplaintPhoto,
    ComplaintStatusHistory,
    ResidentProfile,
    StaffProfile,
)


@admin.register(ResidentProfile)
class ResidentProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "unit", "is_approved", "created_at"]
    list_filter = ["is_approved"]
    search_fields = ["user__username", "unit"]


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "is_active_staff", "created_at"]
    list_filter = ["is_active_staff"]
    search_fields = ["user__username"]


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "resident", "status", "created_at", "updated_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["title", "description", "resident__username"]


admin.site.register(ComplaintAssignment)
admin.site.register(ComplaintPhoto)
admin.site.register(ComplaintComment)
admin.site.register(ComplaintStatusHistory)


