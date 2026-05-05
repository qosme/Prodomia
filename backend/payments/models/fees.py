from django.db import models


class MonthlyFee(models.Model):
    unit = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    period_year = models.PositiveIntegerField()
    period_month = models.PositiveIntegerField()
    due_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("unit", "period_year", "period_month")]

    def __str__(self):
        return f"MonthlyFee(unit={self.unit}, {self.period_year}-{self.period_month:02d}, ${self.amount})"
