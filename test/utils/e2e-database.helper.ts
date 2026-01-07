import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export class E2ETestDatabaseHelper {
  private prisma: PrismaClient;

  constructor() {
    const datasourceUrl = process.env.DATABASE_URL;

    if (!datasourceUrl) {
      throw new Error(
        'DATABASE_URL is required for E2E tests. Make sure .env.test is loaded.',
      );
    }

    const pool = new Pool({ connectionString: datasourceUrl });
    const adapter = new PrismaPg(pool);

    this.prisma = new PrismaClient({ adapter } as any);
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    await this.prisma.$connect();
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  /**
   * Clean all domain data from test database.
   * Discovers all tables in 'public' schema, excludes Prisma metadata tables.
   */
  async cleanDatabase(): Promise<void> {
    try {
      const tables: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT tablename::text
        FROM pg_catalog.pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE '_prisma_migrations';
      `);

      if (!tables || tables.length === 0) return;

      const tableNames = tables.map((t) => `"${t.tablename}"`).join(', ');

      await this.prisma.$executeRawUnsafe(
        'SET session_replication_role = replica;',
      );

      await this.prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`,
      );
      await this.prisma.$executeRawUnsafe(
        'SET session_replication_role = DEFAULT;',
      );
    } catch (error) {
      console.error('✓ Failed to clean test database:', error);
      throw error;
    }
  }

  getPrisma(): PrismaClient {
    return this.prisma;
  }
}
