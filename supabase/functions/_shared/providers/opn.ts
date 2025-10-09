import type { 
  PaymentProvider, 
  CheckoutSessionParams, 
  CheckoutSessionResponse,
  PaymentStatusResponse,
  RefundResponse 
} from "../paymentProvider.ts";

export class OpnProvider implements PaymentProvider {
  name = "opn";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResponse> {
    // TODO: Implement OPN (Omise) checkout session creation
    // https://docs.opn.ooo/charges-api
    throw new Error("OPN provider not yet implemented");
  }

  async getPaymentStatus(providerSessionId: string): Promise<PaymentStatusResponse> {
    // TODO: Implement OPN payment status check
    throw new Error("OPN provider not yet implemented");
  }

  async refund(paymentId: string, amount: number, reason?: string): Promise<RefundResponse> {
    // TODO: Implement OPN refund
    throw new Error("OPN provider not yet implemented");
  }
}
