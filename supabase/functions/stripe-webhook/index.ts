// Follow this setup guide to integrate the Stripe helper library:
// https://supabase.com/docs/guides/functions/examples/stripe-webhooks

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (request) => {
  const signature = request.headers.get("Stripe-Signature")
  
  const body = await request.text()
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') as string,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`)
    return new Response(err.message, { status: 400 })
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // We expect the client_reference_id to be passed from the React App containing the user's Supabase UUID.
    const userId = session.client_reference_id; 

    if (userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
      
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

      // Mark the user as Pro!
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .update({ is_pro: true })
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating user profile:', error)
        return new Response('Database Error', { status: 500 })
      }
      
      console.log(`Successfully upgraded User ${userId} to Pro!`)
    }
  }

  return new Response(JSON.stringify({ received: true }), { 
    status: 200, 
    headers: { "Content-Type": "application/json" } 
  })
})
