import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Initialize Supabase Client (Service Role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // 3. API KEY CONFIGURATION
    const rocketReachKey = Deno.env.get('ROCKETREACH_API_KEY');

    if (!rocketReachKey) {
      throw new Error('Server configuration error: Missing ROCKETREACH_API_KEY')
    }

    // 6. Construct External API Request
    let endpoint = ''
    const queryParams = new URLSearchParams()

    if (action === 'lookup') {
      endpoint = 'https://api.rocketreach.co/api/v2/universal/person/lookup'
      if (params.linkedin_url) queryParams.append('linkedin_url', params.linkedin_url)
      queryParams.append('reveal_personal_email', 'true')
      queryParams.append('reveal_phone', 'true')
    } else if (action === 'check_status') {
      endpoint = 'https://api.rocketreach.co/api/v2/universal/person/check_status'
      if (params.id) queryParams.append('ids', String(params.id))
    } else {
      throw new Error('Invalid action')
    }

    const apiUrl = `${endpoint}?${queryParams.toString()}`
    console.log(`[Proxy] Calling: ${apiUrl}`)

    // 7. Call RocketReach API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Api-Key': rocketReachKey,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    // 8. Log to Database (Async, don't await blocking response)
    await supabase.from('rocketreach_logs').insert({
      user_id: userId || null,
      linkedin_url: params.linkedin_url || null,
      action_type: action,
      status: response.ok ? 'success' : 'error',
      response_payload: data
    })

    // 9. Return Data to Frontend
    if (!response.ok) {
      console.error(`[Proxy] RocketReach Error ${response.status}:`, JSON.stringify(data));
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})