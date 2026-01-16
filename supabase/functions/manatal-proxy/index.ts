import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { method, path, body } = await req.json()
        const MANATAL_API_TOKEN = Deno.env.get('MANATAL_API_TOKEN')

        if (!MANATAL_API_TOKEN) {
            throw new Error('Server configuration error: Missing MANATAL_API_TOKEN')
        }

        const BASE_URL = 'https://api.manatal.com/open/v3'
        // Ensure path starts with / if not provided, and handle potential double slashes
        const cleanPath = path.startsWith('/') ? path : `/${path}`
        const url = `${BASE_URL}${cleanPath}`

        const headers = {
            'Authorization': `Token ${MANATAL_API_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

        const fetchOptions: RequestInit = {
            method: method || 'GET',
            headers: headers
        }

        if (body && method !== 'GET') {
            fetchOptions.body = JSON.stringify(body)
        }

        console.log(`[Manatal Proxy] ${method} ${url}`)
        const response = await fetch(url, fetchOptions)

        // Read response body as text first to safely parse or return as is
        const responseText = await response.text()
        let responseData
        try {
            responseData = JSON.parse(responseText)
        } catch {
            responseData = responseText
        }

        // Wrap the upstream response to preserve status code logic in frontend
        return new Response(JSON.stringify({
            ok: response.ok,
            status: response.status,
            data: responseData
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (error: any) {
        console.error('[Manatal Proxy Error]', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
