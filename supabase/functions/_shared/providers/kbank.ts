import type { 
  PaymentProvider, 
  CheckoutSessionParams, 
  CheckoutSessionResponse,
  PaymentStatusResponse,
  RefundResponse 
} from "../paymentProvider.ts";

export class KBankProvider implements PaymentProvider {
  name = "kbank";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResponse> {
    // TODO: Implement KBank checkout session creation
    // Use KBank's payment gateway API
    throw new Error("KBank provider not yet implemented");
  }

  async getPaymentStatus(providerSessionId: string): Promise<PaymentStatusResponse> {
    // TODO: Implement KBank payment status check
    throw new Error("KBank provider not yet implemented");
  }

  async refund(paymentId: string, amount: number, reason?: string): Promise<RefundResponse> {
    // TODO: Implement KBank refund
    throw new Error("KBank provider not yet implemented");
  }
}
