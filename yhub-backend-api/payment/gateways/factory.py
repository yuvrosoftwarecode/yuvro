from typing import Dict

from django.conf import settings

from .razorpay import RazorpayGateway
from .stripe import StripeGateway


class PaymentGatewayFactory:
    GATEWAYS: Dict[str, type] = {
        RazorpayGateway.name: RazorpayGateway,
        StripeGateway.name: StripeGateway,
    }

    def get_gateway(self, name: str):
        gateway_cls = self.GATEWAYS.get(name)
        if not gateway_cls:
            raise ValueError(f"Unsupported payment gateway: {name}")
        return gateway_cls()
