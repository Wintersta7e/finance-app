import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Default to dev.db for development; production sets DATABASE_URL via Electron main process
const databaseUrl = process.env.DATABASE_URL || `file:${path.join(__dirname, 'prisma', 'dev.db')}`;

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: databaseUrl,
  },
});
