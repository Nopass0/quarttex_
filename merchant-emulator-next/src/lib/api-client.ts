const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/merchant'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export class ApiClient {
  static async logRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: any,
    transactionId?: string
  ) {
    // Log via internal API
    await fetch('/api/logs/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'request',
        method,
        url,
        headers: JSON.stringify(headers),
        body: body ? JSON.stringify(body) : null,
        transactionId
      })
    })
  }

  static async logResponse(
    method: string,
    url: string,
    statusCode: number,
    headers: Record<string, string>,
    body?: any,
    transactionId?: string
  ) {
    // Log via internal API
    await fetch('/api/logs/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'response',
        method,
        url,
        statusCode,
        headers: JSON.stringify(headers),
        body: body ? JSON.stringify(body) : null,
        transactionId
      })
    })
  }

  static async merchantRequest<T = any>(
    endpoint: string,
    options: RequestInit & { merchantApiKey?: string, transactionId?: string } = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(options.merchantApiKey ? { 'x-merchant-api-key': options.merchantApiKey } : {})
    }

    try {
      await this.logRequest(
        options.method || 'GET',
        url,
        headers as Record<string, string>,
        options.body,
        options.transactionId
      )

      const response = await fetch(url, {
        ...options,
        headers
      })

      const data = await response.json()

      await this.logResponse(
        options.method || 'GET',
        url,
        response.status,
        Object.fromEntries(response.headers.entries()),
        data,
        options.transactionId
      )

      if (!response.ok) {
        throw new Error(data.error || 'Request failed')
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}