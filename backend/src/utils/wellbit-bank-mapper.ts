import { db } from '@/db';
import { BankType } from '@prisma/client';

// Cache for bank mappings
let bankMappingCache: Map<string, BankType> | null = null;
let cacheLastUpdated: Date | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Maps Wellbit bank code to our internal BankType
 * Uses database mappings with caching for performance
 */
export async function mapWellbitBankToOurs(wellbitBankCode: string | null): Promise<BankType> {
  // If no bank code provided, default to SBERBANK
  if (!wellbitBankCode) {
    return BankType.SBERBANK;
  }

  // Check if cache is valid
  if (
    bankMappingCache &&
    cacheLastUpdated &&
    Date.now() - cacheLastUpdated.getTime() < CACHE_TTL
  ) {
    const cachedMapping = bankMappingCache.get(wellbitBankCode);
    if (cachedMapping) {
      return cachedMapping;
    }
  }

  // Load mappings from database
  await refreshBankMappingCache();

  // Try to get mapping from refreshed cache
  const mapping = bankMappingCache?.get(wellbitBankCode);
  if (mapping) {
    return mapping;
  }

  // If no mapping found, try direct match by name
  const directMatch = Object.values(BankType).find(
    (bankType) => bankType === wellbitBankCode.toUpperCase()
  );
  if (directMatch) {
    return directMatch;
  }

  // Default to SBERBANK if no mapping found
  console.warn(`No mapping found for Wellbit bank code: ${wellbitBankCode}, defaulting to SBERBANK`);
  return BankType.SBERBANK;
}

/**
 * Refreshes the bank mapping cache from database
 */
async function refreshBankMappingCache(): Promise<void> {
  try {
    const mappings = await db.wellbitBankMapping.findMany();
    
    bankMappingCache = new Map();
    
    for (const mapping of mappings) {
      // Try to find matching BankType enum value
      const bankType = Object.values(BankType).find(
        (type) => type === mapping.ourBankName.toUpperCase()
      );
      
      if (bankType) {
        bankMappingCache.set(mapping.wellbitBankCode, bankType);
      } else {
        console.warn(`Invalid bank type in mapping: ${mapping.ourBankName}`);
      }
    }
    
    cacheLastUpdated = new Date();
  } catch (error) {
    console.error('Failed to refresh bank mapping cache:', error);
    // Keep existing cache if refresh fails
  }
}

/**
 * Get all Wellbit bank mappings
 */
export async function getAllWellbitBankMappings() {
  return await db.wellbitBankMapping.findMany({
    orderBy: { wellbitBankName: 'asc' }
  });
}

/**
 * Update Wellbit bank mapping
 */
export async function updateWellbitBankMapping(
  wellbitBankCode: string,
  ourBankName: string
): Promise<void> {
  await db.wellbitBankMapping.update({
    where: { wellbitBankCode },
    data: { ourBankName }
  });
  
  // Invalidate cache
  bankMappingCache = null;
  cacheLastUpdated = null;
}

/**
 * Maps our internal BankType to Wellbit bank code
 */
export async function mapOurBankToWellbit(ourBankType: BankType): Promise<string | null> {
  const mapping = await db.wellbitBankMapping.findFirst({
    where: { ourBankName: ourBankType }
  });
  
  return mapping?.wellbitBankCode || null;
}