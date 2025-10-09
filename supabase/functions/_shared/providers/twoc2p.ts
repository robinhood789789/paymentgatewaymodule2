import type { 
  PaymentProvider, 
  CheckoutSessionParams, 
  CheckoutSessionResponse,
  PaymentStatusResponse,
  RefundResponse 
} from "../paymentProvider.ts";

export class TwoC2PProvider implements PaymentProvider {
  name = "twoc2p";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResponse> {
    // TODO: Implement 2C2P checkout session creation
    // https://developer.2c2p.com/docs
    throw new Error("2C2P provider not yet implemented");
  }

  async getPaymentStatus(providerSessionId: string): Promise<PaymentStatusResponse> {
    // TODO: Implement 2C2P payment status check
    throw new Error("2C2P provider not yet implemented");
  }

  async refund(paymentId: string, amount: number, reason?: string): Promise<RefundResponse> {
    // TODO: Implement 2C2P refund
    throw new Error("2C2P provider not yet implemented");
  }
}
