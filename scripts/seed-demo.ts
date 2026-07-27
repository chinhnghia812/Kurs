/**
 * Demo seed — Rosa Dela Cruz's sari-sari store on Stellar testnet.
 * Run: npm run seed
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/server/db/schema';
import { fxRates, merchants, priceItems } from '../src/server/db/schema';

const pool = new Pool({
  connectionString: process.env.DRIZZLE_DATABASE_URL,
  max: 3,
});
const db = drizzle(pool, { schema });

async function seed() {
  console.log('🌱 Seeding Kurs demo data…');

  // Clean previous demo data
  await db.delete(priceItems);
  await db.delete(merchants);
  await db.delete(fxRates);

  // Merchant: Rosa Dela Cruz — sari-sari store, Quezon City PH
  const [rosa] = await db
    .insert(merchants)
    .values({
      name: "Rosa's Sari-Sari Store",
      stellarAddress: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
    })
    .returning();

  console.log('✅ Merchant created:', rosa.name);

  // Menu items (base price in USDC, 6-decimal bigint string)
  // 1.5 USDC → "1500000", 2.0 USDC → "2000000", 3.0 USDC → "3000000"
  const menuItems = [
    { name: 'Siopao', basePriceUsdc: '1500000' },
    { name: 'Lumpia', basePriceUsdc: '2000000' },
    { name: 'Halo-halo', basePriceUsdc: '3000000' },
  ];

  for (const item of menuItems) {
    const [row] = await db
      .insert(priceItems)
      .values({
        name: item.name,
        basePriceUsdc: item.basePriceUsdc,
        currencyCode: 'USDC',
        merchantId: rosa.id,
      })
      .returning();
    console.log(`✅ Item created: ${row.name} = ${Number(item.basePriceUsdc) / 1_000_000} USDC`);
  }

  // Seed initial FX rates
  const ratePairs = [
    { pair: 'USDC_PHP', rate: 58.3 },
    { pair: 'USDC_USD', rate: 1.0 },
    { pair: 'USDC_VND', rate: 25100 },
    { pair: 'USDC_IDR', rate: 16200 },
  ];

  for (const rp of ratePairs) {
    await db.insert(fxRates).values(rp);
  }
  console.log('✅ FX rates seeded');

  console.log("\n🎉 Done! Rosa's sari-sari store is ready.");
  console.log('   Run: npm run dev');
  console.log('   Open: http://localhost:3002\n');

  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
