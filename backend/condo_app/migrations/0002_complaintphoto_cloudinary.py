from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("condo_app", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="complaintphoto",
            name="image",
        ),
        migrations.AddField(
            model_name="complaintphoto",
            name="image_url",
            field=models.URLField(default="", max_length=500),
            preserve_default=False,
        ),
    ]
