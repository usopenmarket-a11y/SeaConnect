# Generated for Sprint 13E — adds catch_weight and rank to CompetitionEntry

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("competitions", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="competitionentry",
            name="catch_weight",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Total verified catch weight in kg for leaderboard ranking.",
                max_digits=6,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="competitionentry",
            name="rank",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Official final rank after competition ends.",
                null=True,
            ),
        ),
    ]
