import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";

export interface CreditWallet {
  bonus_balance: number;
  purchased_balance: number;
  reserved_bonus: number;
  reserved_purchased: number;
  total_available: number;
  total_reserved: number;
  total_balance: number;
  signup_bonus_granted: boolean;
  uncollected_deficit: number;
  reconciliation_status: string;
}

export interface CreditPack {
  id: string;
  name: string;
  description: string;
  credits: number;
  price_inr: number;
  price_paise: number;
  currency: string;
  sort_order: number;
}

export interface CreateOrderResponse {
  order_id: string;
  payment_id: string;
  amount: number;
  currency: string;
  key_id: string;
  name: string;
  description: string;
  pack_id: string;
  credits: number;
}

export interface VerifyPaymentPayload {
  gateway_order_id: string;
  gateway_payment_id: string;
  signature: string;
}

export interface VerifyPaymentResponse {
  status: "SUCCESS" | "FAILED";
  payment_id: string;
  credits_credited: number;
  wallet_balance?: CreditWallet;
  was_already_credited: boolean;
}

export interface InsufficientCreditsInfo {
  available?: number | null;
  required?: number | null;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CreditLedgerEntry {
  id: string;
  transaction_type: string;
  amount: number;
  bucket: "BONUS" | "PURCHASED";
  balance_after_bonus: number;
  balance_after_purchased: number;
  created_at: string;
}

export interface CreditUsageEntry {
  id: string;
  session_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  credits_charged: number;
  credits_refunded: number;
  status: string;
  created_at: string;
}

export const creditService = {
  async getWallet(): Promise<CreditWallet> {
    return await yhubApiAuthUtil.get<CreditWallet>("/credits/wallet/");
  },

  async getPacks(): Promise<CreditPack[]> {
    const packs = await yhubApiAuthUtil.get<CreditPack[]>("/credits/packs/");
    if (Array.isArray(packs)) {
      return packs.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return [];
  },

  async createOrder(packId: string, clientRequestId?: string): Promise<CreateOrderResponse> {
    return await yhubApiAuthUtil.post<CreateOrderResponse>("/credits/orders/", {
      pack_id: packId,
      ...(clientRequestId ? { client_request_id: clientRequestId } : {}),
    });
  },

  async verifyPayment(payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> {
    return await yhubApiAuthUtil.post<VerifyPaymentResponse>("/credits/verify/", payload);
  },

  async getLedgerHistory(page = 1, pageSize = 20): Promise<PaginatedResponse<CreditLedgerEntry>> {
    return await yhubApiAuthUtil.get<PaginatedResponse<CreditLedgerEntry>>("/credits/history/", {
      params: { page: String(page), page_size: String(pageSize) },
    });
  },

  async getUsageHistory(page = 1, pageSize = 20): Promise<PaginatedResponse<CreditUsageEntry>> {
    return await yhubApiAuthUtil.get<PaginatedResponse<CreditUsageEntry>>("/credits/usage/", {
      params: { page: String(page), page_size: String(pageSize) },
    });
  },
};

export default creditService;
