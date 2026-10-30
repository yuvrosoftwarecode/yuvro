from decimal import Decimal
from django.core.management.base import BaseCommand
from ai_credits.models import CreditPack
from payment.models import PurchasableItem, PurchasableType

PACKS_DATA = [
    {
        "id": "free_signup_bonus",
        "name": "Free Signup Bonus",
        "description": "50,000 free AI credits to get started with AI Mentor",
        "credits": 50_000,
        "price_inr": Decimal("0.00"),
        "price_paise": 0,
        "is_active": True,
        "is_signup_bonus": True,
        "sort_order": 0,
        "metadata": {"credits": 50_000, "badge": "Free"},
        "create_purchasable_item": False,
    },
    {
        "id": "starter",
        "name": "Starter Pack",
        "description": "500,000 AI credits for everyday coding help and guidance",
        "credits": 500_000,
        "price_inr": Decimal("199.00"),
        "price_paise": 19900,
        "is_active": True,
        "is_signup_bonus": False,
        "sort_order": 1,
        "metadata": {"credits": 500_000},
        "create_purchasable_item": True,
    },
    {
        "id": "pro",
        "name": "Pro Pack",
        "description": "1,500,000 AI credits for active builders and problem solvers",
        "credits": 1_500_000,
        "price_inr": Decimal("499.00"),
        "price_paise": 49900,
        "is_active": True,
        "is_signup_bonus": False,
        "sort_order": 2,
        "metadata": {"credits": 1_500_000, "popular": True},
        "create_purchasable_item": True,
    },
    {
        "id": "power",
        "name": "Power Pack",
        "description": "4,000,000 AI credits for intensive lab projects and deep debugging",
        "credits": 4_000_000,
        "price_inr": Decimal("999.00"),
        "price_paise": 99900,
        "is_active": True,
        "is_signup_bonus": False,
        "sort_order": 3,
        "metadata": {"credits": 4_000_000, "best_value": True},
        "create_purchasable_item": True,
    },
]


def seed_packs(stdout=None):
    for pack_info in PACKS_DATA:
        purchasable_item = None
        if pack_info["create_purchasable_item"]:
            purchasable_item, _ = PurchasableItem.objects.update_or_create(
                item_type=PurchasableType.AI_CREDIT,
                item_id=pack_info["id"],
                defaults={
                    "name": pack_info["name"],
                    "product": "ylabs",
                    "current_price": pack_info["price_inr"],
                    "is_active": pack_info["is_active"],
                    "metadata": {
                        "credits": pack_info["credits"],
                        "pack_id": pack_info["id"],
                    },
                },
            )

        pack, created = CreditPack.objects.update_or_create(
            id=pack_info["id"],
            defaults={
                "purchasable_item": purchasable_item,
                "name": pack_info["name"],
                "description": pack_info["description"],
                "credits": pack_info["credits"],
                "price_inr": pack_info["price_inr"],
                "price_paise": pack_info["price_paise"],
                "is_active": pack_info["is_active"],
                "is_signup_bonus": pack_info["is_signup_bonus"],
                "sort_order": pack_info["sort_order"],
                "metadata": pack_info["metadata"],
            },
        )
        action = "Created" if created else "Updated"
        msg = f"{action} CreditPack '{pack.name}' ({pack.credits:,} credits @ ₹{pack.price_inr})"
        if stdout:
            stdout.write(msg)


class Command(BaseCommand):
    help = "Seeds initial credit packs (Free Signup Bonus, Starter, Pro, Power) and creates corresponding PurchasableItems."

    def handle(self, *args, **options):
        seed_packs(self.stdout)
        self.stdout.write(self.style.SUCCESS("Successfully seeded credit packs!"))
