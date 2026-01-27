import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!key) {
      console.error('Missing Stripe publishable key');
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(key);
  }

  return stripePromise;
}

/**
 * Create a checkout session via the backend and redirect to Stripe Checkout.
 * This requires a Supabase Edge Function to create the checkout session.
 */
export async function createCheckoutSession(priceId: string, userEmail?: string): Promise<string> {
  // In production, this would call a Supabase Edge Function like:
  // const { data, error } = await supabase.functions.invoke('create-checkout-session', {
  //   body: { priceId, email: userEmail }
  // });
  // return data.url;

  // For now, throw an error indicating setup is needed
  throw new Error(
    'Stripe checkout requires setting up a Supabase Edge Function. ' +
    'See supabase/functions/create-checkout-session for implementation.'
  );
}

/**
 * Redirect to the Stripe Customer Portal for subscription management.
 * This also requires a backend endpoint.
 */
export async function createPortalSession(): Promise<string> {
  // In production, this would call a Supabase Edge Function
  throw new Error(
    'Customer portal requires setting up a Supabase Edge Function. ' +
    'See supabase/functions/create-portal-session for implementation.'
  );
}
