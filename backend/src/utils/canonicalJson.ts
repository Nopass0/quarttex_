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
  return JSON.stringify(sort(obj))
}
