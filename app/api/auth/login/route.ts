import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Make the login request to MFL API from the server side (no CORS issues)
    const loginUrl = `https://api.myfantasyleague.com/2025/login`
    const body = `USERNAME=${encodeURIComponent(username)}&PASSWORD=${encodeURIComponent(password)}&XML=1`

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'MFLREWRITE',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': String(body.length),
        'Accept': 'application/json'
      },
      body
    })

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `HTTP ${response.status}: ${response.statusText}` },
        { status: response.status }
      )
    }

    const responseText = await response.text()

    // Parse XML response from MFL
    // Check for successful login: <status cookie_name="cookie_value"...>OK</status>
    const successMatch = responseText.match(/<status[^>]*MFL_USER_ID="([^"]*)"[^>]*>OK<\/status>/)
    if (successMatch) {
      const cookieValue = successMatch[1]
      return NextResponse.json({
        success: true,
        cookie: cookieValue
      })
    }

    // Check for error response: <error>error message</error>
    const errorMatch = responseText.match(/<error[^>]*>([^<]*)<\/error>/)
    if (errorMatch) {
      return NextResponse.json({
        success: false,
        error: errorMatch[1]
      })
    }

    // Check for alternative error format
    const statusErrorMatch = responseText.match(/<status[^>]*>([^<]*)<\/status>/)
    if (statusErrorMatch && statusErrorMatch[1] !== 'OK') {
      return NextResponse.json({
        success: false,
        error: statusErrorMatch[1]
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid response from MFL server'
    })

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { success: false, error: 'Network error occurred' },
      { status: 500 }
    )
  }
}