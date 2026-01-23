import { loadStripe, type Stripe } from '@stripe/stripe-js';
import Constants from 'expo-constants';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = Constants.expoConfig?.extra?.stripePublishableKey ||
                process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!key) {
      console.error('Missing Stripe publishable key');
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(key);
  }

  return stripePromise;
}

export async function redirectToCheckout(priceId: string, customerId?: string) {
  const stripe = await getStripe();

  if (!stripe) {
    throw new Error('Stripe not initialized');
  }

  // For now, we'll redirect to Stripe Checkout
  // In production, you'd create a checkout session via your backend
  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    successUrl: `${window.location.origin}/dashboard?success=true`,
    cancelUrl: `${window.location.origin}/pricing?canceled=true`,
    customerEmail: customerId, // Use email if no customer ID
  });

  if (error) {
    throw error;
  }
}
