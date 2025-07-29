export function canonicalJson(input: string | object): string {
  const obj = typeof input === 'string' ? JSON.parse(input) : input
  const sort = (value: any): any => {
    if (Array.isArray(value)) return value.map(sort)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
          acc[key] = sort(value[key])
          return acc
        }, {} as Record<string, any>)
    }
    return value
  }
  
  // Use custom stringify to match Wellbit requirements
  // PHP's JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE behavior
  const jsonString = JSON.stringify(sort(obj))
  
  // JSON.stringify in JavaScript already handles Unicode correctly (doesn't escape it)
  // and doesn't escape slashes by default, so we return as is
  return jsonString
}
