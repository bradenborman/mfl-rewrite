import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return handleMFLRequest(request, 'GET')
}

export async function POST(request: NextRequest) {
  return handleMFLRequest(request, 'POST')
}

async function handleMFLRequest(request: NextRequest, method: 'GET' | 'POST') {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract MFL API parameters
    const host = searchParams.get('host') || 'api.myfantasyleague.com'
    const year = searchParams.get('year') || '2025'
    const command = searchParams.get('command')
    const cookie = searchParams.get('cookie')
    
    console.log(`[MFL API] ${method} request received:`)
    console.log(`  Host: ${host}`)
    console.log(`  Year: ${year}`)
    console.log(`  Command: ${command}`)
    console.log(`  Has Cookie: ${cookie ? 'Yes' : 'No'}`)
    
    if (!command) {
      console.log('[MFL API] ERROR: Missing command parameter')
      return NextResponse.json(
        { error: 'Command parameter is required' },
        { status: 400 }
      )
    }

    // Build MFL API URL
    const mflUrl = `https://${host}/${year}/${command}`
    
    // Prepare headers
    const headers: Record<string, string> = {
      'User-Agent': 'MFLREWRITE',
      'Accept': 'application/json'
    }

    // Add authentication cookie if provided
    if (cookie) {
      headers['Cookie'] = `MFL_USER_ID=${encodeURIComponent(cookie)}`
    }

    // Prepare request options
    const fetchOptions: RequestInit = {
      method,
      headers
    }

    // Add query parameters to URL for GET requests
    if (method === 'GET') {
      const mflParams = new URLSearchParams()
      searchParams.forEach((value, key) => {
        // Skip our proxy-specific parameters
        if (!['host', 'year', 'command', 'cookie'].includes(key)) {
          mflParams.append(key, value)
        }
      })
      
      const finalUrl = mflParams.toString() ? `${mflUrl}?${mflParams}` : mflUrl
      console.log(`[MFL API] Making request to: ${finalUrl}`)
      
      const startTime = Date.now()
      const response = await fetch(finalUrl, fetchOptions)
      const duration = Date.now() - startTime
      
      console.log(`[MFL API] Response received in ${duration}ms:`)
      console.log(`  Status: ${response.status} ${response.statusText}`)
      console.log(`  Content-Type: ${response.headers.get('content-type')}`)
      
      if (!response.ok) {
        console.log(`[MFL API] ERROR: ${response.status} ${response.statusText}`)
        return NextResponse.json(
          { error: `MFL API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        )
      }

      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        console.log(`[MFL API] JSON response size: ${JSON.stringify(data).length} characters`)
        
        // Log specific data types for debugging
        if (data.leagueStandings) {
          console.log(`[MFL API] Standings data: ${data.leagueStandings.franchise?.length || 0} franchises`)
        }
        if (data.league) {
          console.log(`[MFL API] League data: ${data.league.name || 'No name'}, ${data.league.franchises?.franchise?.length || 0} franchises`)
        }
        if (data.rosters) {
          console.log(`[MFL API] Roster data: ${data.rosters.franchise?.length || 0} franchises`)
        }
        
        return NextResponse.json(data)
      } else {
        const text = await response.text()
        console.log(`[MFL API] XML/Text response size: ${text.length} characters`)
        return new NextResponse(text, {
          headers: { 'Content-Type': 'text/xml' }
        })
      }
    }

    // Handle POST requests (for imports)
    if (method === 'POST') {
      const body = await request.text()
      fetchOptions.body = body
      const headers = fetchOptions.headers as Record<string, string>
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      headers['Content-Length'] = String(body.length)

      console.log(`[MFL API] POST request to: ${mflUrl}`)
      console.log(`[MFL API] POST body length: ${body.length}`)

      const startTime = Date.now()
      const response = await fetch(mflUrl, fetchOptions)
      const duration = Date.now() - startTime
      
      console.log(`[MFL API] POST response received in ${duration}ms:`)
      console.log(`  Status: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        console.log(`[MFL API] POST ERROR: ${response.status} ${response.statusText}`)
        return NextResponse.json(
          { error: `MFL API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        )
      }

      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        console.log(`[MFL API] POST JSON response size: ${JSON.stringify(data).length} characters`)
        return NextResponse.json(data)
      } else {
        const text = await response.text()
        console.log(`[MFL API] POST XML/Text response size: ${text.length} characters`)
        return new NextResponse(text, {
          headers: { 'Content-Type': 'text/xml' }
        })
      }
    }

  } catch (error) {
    console.error('[MFL API] Proxy error:', error)
    return NextResponse.json(
      { error: 'Network error occurred' },
      { status: 500 }
    )
  }
}