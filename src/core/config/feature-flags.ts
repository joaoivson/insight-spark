import featureFlags from "@feature-flags";

type PaymentProvider = "cakto" | "kiwify";

interface FeatureFlags {
  payment_provider: PaymentProvider;
}

const flags = featureFlags as FeatureFlags;

export function getPaymentProvider(): PaymentProvider {
  return flags.payment_provider || "cakto";
}

export function isKiwify(): boolean {
  return getPaymentProvider() === "kiwify";
}

export function isCakto(): boolean {
  return getPaymentProvider() === "cakto";
}
