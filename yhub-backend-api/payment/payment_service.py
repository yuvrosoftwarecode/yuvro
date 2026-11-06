import uuid
from typing import Any, Dict

from .gateways.factory import PaymentGatewayFactory
from .models import Payment, Refund, PaymentStatus


class PaymentService:
    def __init__(self):
        self.gateway_factory = PaymentGatewayFactory()

    def create_payment(
        self,
        user,
        amount: float,
        currency: str,
        purpose: str,
        description: str = "",
        metadata: Dict[str, Any] | None = None,
        gateway_name: str = "razorpay",
        product: str = "",
        payment: Payment | None = None,
    ) -> Payment:
        if metadata is None:
            metadata = {}

        gateway = self.gateway_factory.get_gateway(gateway_name)

        payment_id = payment.id if payment else None

        payment, created = Payment.objects.update_or_create(
            id=payment_id,
            defaults={
                "user": user,
                "gateway": gateway_name,
                "amount": amount,
                "currency": currency,
                "purpose": purpose,
                "description": description,
                "product": product,
                "metadata": metadata,
                "status": PaymentStatus.CREATED,
            },
        )

        customer_id = None
        try:
            customer_response = gateway.create_customer({
                "email": user.email,
                "name": user.get_full_name() or user.email,
                "metadata": metadata,
            })
            customer_id = customer_response.get("customer_id")
            payment.gateway_customer_reference_id = customer_id
            payment.gateway_response = {"customer_response": customer_response}
            payment.save(update_fields=["gateway_customer_reference_id", "gateway_response"])
        except Exception as cust_err:
            import logging
            logging.warning(f"Non-blocking: Failed to create gateway customer for user {user.id}: {cust_err}")

        if not (payment and payment.gateway_order_or_intent_id):
            payment_response = gateway.create_payment({
                "amount": amount,
                "currency": currency,
                "customer_id": payment.gateway_customer_reference_id,
                "metadata": metadata,
                "description": description,
                "payment_id": str(payment.id),
            })

            payment.gateway_order_or_intent_id = payment_response.get("order_id") or payment_response.get("payment_id")
            payment.gateway_session_reference_id = payment_response.get("session_id")
            payment.gateway_response["payment_response"] = payment_response
            
            raw_status = payment_response.get("status")
            if raw_status and hasattr(gateway, 'map_status'):
                payment.status = gateway.map_status(raw_status)
            else:
                payment.status = PaymentStatus.PENDING
                
            payment.save(
                update_fields=[
                    "gateway_order_or_intent_id",
                    "gateway_session_reference_id",
                    "gateway_response",
                    "status",
                ]
            )

        return payment

    def get_payment(self, payment: Payment) -> Dict[str, Any]:
        gateway = self.gateway_factory.get_gateway(payment.gateway)
        gateway_response = gateway.get_payment({"payment_id": payment.gateway_payment_or_charge_id or str(payment.id)})
        payment.gateway_response["get_payment"] = gateway_response
        payment.save(update_fields=["gateway_response"])
        return gateway_response

    def capture_payment(self, payment: Payment) -> Dict[str, Any]:
        gateway = self.gateway_factory.get_gateway(payment.gateway)
        response = gateway.capture_payment({"payment_id": payment.gateway_payment_or_charge_id})
        payment.gateway_response["capture_payment"] = response
        payment.save(update_fields=["gateway_response"])
        return response

    def cancel_payment(self, payment: Payment) -> Dict[str, Any]:
        gateway = self.gateway_factory.get_gateway(payment.gateway)
        response = gateway.cancel_payment({"payment_id": payment.gateway_payment_or_charge_id})
        payment.gateway_response["cancel_payment"] = response
        payment.status = PaymentStatus.CANCELLED
        payment.save(update_fields=["gateway_response", "status"])
        return response

    def create_refund(self, payment: Payment, amount: float) -> Refund:
        gateway = self.gateway_factory.get_gateway(payment.gateway)
        response = gateway.create_refund({"payment_id": payment.gateway_payment_or_charge_id}, amount)

        refund = Refund.objects.create(
            payment=payment,
            refund_id=response.get("id") or response.get("refund_id") or str(uuid.uuid4()),
            amount=amount,
            status=PaymentStatus.REFUNDED,
            gateway_response=response,
        )

        payment.gateway_response["refund"] = response
        payment.status = PaymentStatus.REFUNDED
        payment.save(update_fields=["gateway_response", "status"])
        return refund

    def verify_webhook(self, request) -> bool:
        gateway = self.gateway_factory.get_gateway(request.headers.get("X-Payment-Gateway", "razorpay"))
        return gateway.verify_webhook(request)

    def parse_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        gateway_name = payload.get("gateway", "razorpay")
        gateway = self.gateway_factory.get_gateway(gateway_name)
        return gateway.parse_webhook(payload)

    def sync_payment_status(self, payment: Payment) -> Payment:
        gateway = self.gateway_factory.get_gateway(payment.gateway)
        if not hasattr(gateway, 'map_status'):
            return payment
            
        if payment.gateway_payment_or_charge_id:
            gateway_response = self.get_payment(payment)
        elif payment.gateway_order_or_intent_id and hasattr(gateway, 'get_order'):
            gateway_response = gateway.get_order(payment.gateway_order_or_intent_id)
        else:
            return payment
            
        gateway_status = gateway_response.get("status")
        
        if gateway_status:
            mapped_status = gateway.map_status(gateway_status)
            if payment.status != mapped_status:
                payment.status = mapped_status
                payment.save(update_fields=["status"])
                
        return payment
