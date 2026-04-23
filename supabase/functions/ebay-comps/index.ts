import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, imageBase64 } = await req.json()
    const clientId = Deno.env.get('EBAY_CLIENT_ID')
    const clientSecret = Deno.env.get('EBAY_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error("Missing eBay API credentials 'EBAY_CLIENT_ID' and 'EBAY_CLIENT_SECRET' in Edge Function secrets.")
    }

    if (!query && !imageBase64) {
      throw new Error("Missing search input")
    }

    let activeQuery = query;

    // --- PHASE A: OPEN AI VISION PRE-PROCESSING ---
    if (imageBase64) {
      const openAiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openAiKey) {
        throw new Error("Missing OpenAI API Key. Please configure 'OPENAI_API_KEY' in your Supabase secrets to process visual item matches.")
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

      const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
           "Content-Type": "application/json",
           "Authorization": `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
           model: "gpt-4o",
           messages: [
             {
               role: "system",
               content: "You are an expert appraiser. Identify the primary retail object in the photo for an eBay search. CRITICAL RULE: If the item is a complex product (like a laptop, TV, console, or computer) and you CANNOT clearly read a brand name or model number anywhere, return exactly 'GENERIC_ITEM_ERROR'. Otherwise, return 3-7 heavily specific keywords (e.g. 'Sony Playstation 1 Console' or 'Lenovo ThinkPad X1 Carbon laptop'). Output NOTHING else."
             },
             {
               role: "user",
               content: [
                 { type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanBase64}`, detail: "high" } }
               ]
             }
           ],
           max_tokens: 30
        })
      });

      if (!gptRes.ok) {
         throw new Error(`OpenAI Vision Error: ${await gptRes.text()}`)
      }

      const gptData = await gptRes.json();
      activeQuery = gptData.choices && gptData.choices[0] ? gptData.choices[0].message.content.trim() : "";
      
      if (!activeQuery) {
         throw new Error("OpenAI was unable to identify the object.");
      }

      if (activeQuery === "GENERIC_ITEM_ERROR" || activeQuery.includes("GENERIC_ITEM_ERROR")) {
         return new Response(JSON.stringify({ 
           price: "Missing Brand", 
           reason: "We can see the item, but we need a brand or model number to price it accurately! Try snapping a photo of the bottom label, barcode, or logo.", 
           tags: ["Photo Retake Required"],
           items: [],
           interpretedQuery: "Unbranded Electronics"
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // --- PHASE B: EBAY OAUTH & SEARCH ---
    const authHeader = `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    const tokenRes = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": authHeader,
      },
      body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
    })
    
    if (!tokenRes.ok) {
       throw new Error(`eBay Auth Error: ${await tokenRes.text()}`)
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    // Hit eBay's precise Text API with either the manual text query OR the OpenAI-generated query.
    // Removed '&sort=price' to default to 'Best Match' which gives highly relevant comp listings.
    // Added conditionIds filter to explicitly exclude 'For Parts/Not Working' (7000) and grab New (1000) to Used (3000).
    const searchUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(activeQuery)}&limit=10&filter=conditionIds:{1000|1500|2000|2500|2750|3000|4000|5000|6000}`;
    const searchRes = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"
      }
    });

    if (!searchRes.ok) {
       throw new Error(`eBay Search Error: ${await searchRes.text()}`)
    }

    const data = await searchRes.json()
    const items = data.itemSummaries || []
    
    if (items.length === 0) {
        return new Response(JSON.stringify({ 
           price: "No Comps Found", 
           reason: `We searched eBay for "${activeQuery}" but couldn't find a reliable match. Try refining your search.`, 
           tags: ["Try Refining Search"],
           items: [],
           interpretedQuery: activeQuery
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Calculate Price Metrics
    // Extract numerical prices from Best Match items to formulate a typical estimated range
    let prices = items.map((i: any) => parseFloat(i.price.value)).filter((p: number) => !isNaN(p))
    if (prices.length === 0) prices = [0]
    
    // Sort ascending for low/high analysis
    prices.sort((a: number, b: number) => a - b)
    
    // Since we are looking at Best Match (most relevant/popular), the prices are solid comp indicators.
    // We will drop extreme outliers on both ends if there are enough results.
    let lowEnd = prices[0];
    let highEnd = prices[prices.length - 1];
    
    if (prices.length >= 6) {
        lowEnd = prices[1]; // drop the absolute cheapest
        highEnd = prices[prices.length - 2]; // drop the absolute highest
    }

    // Prepare tags
    const tags = ["Live eBay Data"]
    if (items.length >= 8) tags.push("High Demand")
    else tags.push("Limited Inventory")

    return new Response(JSON.stringify({
      price: `$${lowEnd.toFixed(2)} - $${highEnd.toFixed(2)}`,
      reason: `Estimated from ${items.length} live eBay active market listings (excluding outliers).`,
      tags,
      items: items.map((i:any) => ({ id: i.itemId, title: i.title, price: i.price.value, url: i.itemWebUrl })),
      interpretedQuery: activeQuery
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
