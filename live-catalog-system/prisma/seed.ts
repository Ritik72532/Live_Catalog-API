import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CATEGORIES = ['Electronics', 'Clothing', 'Home', 'Books', 'Sports'];

async function main() {
  console.log('🔍 Checking database for existing products to calculate starting index...');
  
  // 1. Look for the absolute newest item currently in the database to find its name number
  const latestProduct = await prisma.product.findFirst({
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' }
    ]
  });

  let startingId = 0;
  
  if (latestProduct) {
    // Extract the number from names like "Pro Edition Item #199999"
    const match = latestProduct.name.match(/#(\d+)/);
    if (match && match[1]) {
      // Set the start number to be exactly ONE higher than the maximum found
      startingId = parseInt(match[1], 10) + 1;
      console.log(`ℹ️ Found existing data. Continuing sequence from Item #${startingId}`);
    }
  } else {
    console.log('ℹ️ Database is empty. Starting fresh from Item #0');
  }

  // 2. Define the size of the batch you want to add EVERY time you run the script
  const itemsToAdd = 20000; // You can change this to 5000, 50000, etc.
  const batch = [];
  
  // Use the exact current real-world clock time right now
  const now = new Date();
  let baseTime = now.getTime();

  console.log(`🚀 Injecting ${itemsToAdd} new products into the existing catalog...`);

  for (let j = 0; j < itemsToAdd; j++) {
    const currentGlobalId = startingId + j;
    
    /**
     * Incremental time: Each new item gets a slightly newer timestamp (+10ms)
     * than the previous one, so they sit perfectly at the top of your feed.
     */
    const itemTimestamp = new Date(baseTime + (j * 10));
    
    batch.push({
      name: `Pro Edition Item #${currentGlobalId}`,
      category: CATEGORIES[currentGlobalId % CATEGORIES.length]!,
      price: parseFloat((Math.random() * 750 + 25).toFixed(2)),
      createdAt: itemTimestamp,
      updatedAt: itemTimestamp,
    });
  }
  
  // 3. Insert the fresh incremental records cleanly alongside your old records
  await prisma.product.createMany({ data: batch });
  console.log(`✅ Successfully appended items from #${startingId} to #${startingId + itemsToAdd - 1}!`);
}

main()
  .catch((err) => {
    console.error('❌ Incremental data injection failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
