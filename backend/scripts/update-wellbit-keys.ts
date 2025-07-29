import { db } from '../src/db';

async function updateWellbitKeys() {
  try {
    const publicKey = 'dc42391c8e504354b818622cee1d7069';
    const privateKey = '40ad418bc9534184a11bcd75f9582131';
    
    // Find merchant by name or by existing public key
    let merchant = await db.merchant.findFirst({
      where: {
        OR: [
          { name: 'Wellbit' },
          { apiKeyPublic: publicKey }
        ]
      }
    });

    if (merchant) {
      // Update with correct keys
      const updated = await db.merchant.update({
        where: { id: merchant.id },
        data: {
          apiKeyPublic: publicKey,
          apiKeyPrivate: privateKey,
        }
      });
      
      console.log('✅ Updated Wellbit merchant keys:', {
        id: updated.id,
        name: updated.name,
        apiKeyPublic: updated.apiKeyPublic,
        apiKeyPrivate: updated.apiKeyPrivate,
      });
    } else {
      // Create new Wellbit merchant with correct keys
      merchant = await db.merchant.create({
        data: {
          name: 'Wellbit',
          token: 'wellbit_' + Date.now(),
          apiKeyPublic: publicKey,
          apiKeyPrivate: privateKey,
          wellbitCallbackUrl: 'https://wellbit.pro/api/callback',
          balanceUsdt: 0,
          disabled: false,
          banned: false,
          countInRubEquivalent: false
        }
      });
      
      console.log('✅ Created Wellbit merchant with correct keys:', {
        id: merchant.id,
        name: merchant.name,
        apiKeyPublic: merchant.apiKeyPublic,
        apiKeyPrivate: merchant.apiKeyPrivate,
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

updateWellbitKeys();