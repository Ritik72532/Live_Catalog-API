import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';


// Initialize core fastify instance with strict logging patterns
const fastify = Fastify({
  logger:
    process.env.NODE_ENV === "production"
      ? true
      : {
          transport: {
            target: "pino-pretty",
          },
        },
});

const prisma = new PrismaClient();

// Enable secure cross-origin resource sharing
await fastify.register(cors, { origin: '*' });

/**
 * 1. HIGH-VALUE: Zod Validation Schema
 * This acts as an iron-clad security shield at the HTTP layer.
 * It validates, cleans, and converts parameters before they hit our database query.
 */
const GetProductsQuerySchema = z.object({
  category: z.string().optional(),
  limit: z.string()
    .default('20') // Set the string fallback default FIRST
    .transform((val: string) => parseInt(val, 10)) // Then convert down to a numeric int type safely
    .pipe(z.number().min(1).max(100)),
  nextCreatedAt: z.string().datetime({ message: "Invalid ISO timestamp string" }).optional(),
  nextId: z.string().uuid({ message: "Invalid unique asset identifier format" }).optional(),
});




// Root System Status Monitoring Endpoint
fastify.get('/', async (_request, reply) => {
  return reply.send({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Live Inventory Query Router Engine'
  });
});

// Main High-Speed Product Feed Route
fastify.get('/api/products', async (request, reply) => {
  // Validate incoming query values against our strict schema rules
  const parseResult = GetProductsQuerySchema.safeParse(request.query);
  
  if (!parseResult.success) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request Parameter Format',
      details: parseResult.error.format(),
    });
  }

  const { category, limit: takeAmount, nextCreatedAt, nextId } = parseResult.data;

  // Build programmatic filtering tree
  const whereClause: any = {};
  if (category && category !== 'All') {
    whereClause.category = category;
  }

  // The protective cursor-isolation window
  if (nextCreatedAt && nextId) {
    whereClause.OR = [
      { createdAt: { lt: new Date(nextCreatedAt) } },
      {
        createdAt: new Date(nextCreatedAt),
        id: { lt: nextId },
      },
    ];
  }

  /**
   * 2. HIGH-VALUE: Performance Diagnostics
   * We log precise processing times to measure index execution efficiency at scale.
   */
  const executionStart = performance.now();

  const products = await prisma.product.findMany({
    where: whereClause,
    take: takeAmount + 1, // Look ahead by one item to detect pagination trails
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
  });

  const executionEnd = performance.now();
  const dbLatencyMs = (executionEnd - executionStart).toFixed(2);
  
  // Custom headers are highly valued by frontend teams for monitoring telemetry
  reply.header('X-Database-Latency-Ms', dbLatencyMs);
  fastify.log.info(`[QUERY ENGINE] Fetched records over index tree in ${dbLatencyMs}ms`);

  const hasNextPage = products.length > takeAmount;
  const standardPageItems = hasNextPage ? products.slice(0, takeAmount) : products;
  const lastElementOnScreen = standardPageItems[standardPageItems.length - 1];

  const nextCursor = hasNextPage && lastElementOnScreen ? {
    createdAt: lastElementOnScreen.createdAt.toISOString(),
    id: lastElementOnScreen.id
  } : null;

  return reply.send({
    meta: {
      dbLatencyMs: parseFloat(dbLatencyMs),
      count: standardPageItems.length,
    },
    items: standardPageItems,
    nextCursor,
  });
});

/**
 * 3. HIGH-VALUE: Graceful Shutdown Lifecycle Handlers
 * When deploying updates to production, servers shut down constantly.
 * This prevents data corruption or abruptly severed user connections.
 */
const closeSystemConnections = async () => {
  fastify.log.warn('⚠️ Shutting down background server processes cleanly...');
  await fastify.close();
  await prisma.$disconnect();
  fastify.log.info('✅ All active infrastructure instances closed cleanly. Process exit clean.');
  process.exit(0);
};

process.on('SIGTERM', closeSystemConnections);
process.on('SIGINT', closeSystemConnections);

// Launch Backend Listener Engine
const startServer = async () => {
  try {
    // Read production port or fallback to 4000 for local development
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
    
    // In production, host MUST be '0.0.0.0' to accept public traffic routing
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`🚀 Production engine live on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};


startServer();
