# Node.js Backend Rewrite - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite finance-backend from Java/Spring to Node.js/NestJS with Prisma, making it professional and commercial-ready.

**Architecture:** Monorepo with `packages/backend` (NestJS + Prisma + SQLite) and `packages/desktop` (Electron + React). Backend runs as child process in production, standalone in dev.

**Tech Stack:** Node.js 20, NestJS 10, Prisma 5, SQLite, TypeScript 5, Jest

**Design Document:** `docs/plans/2025-02-05-backend-rewrite-design.md`

---

## Phase 1: Project Setup

### Task 1.1: Create Monorepo Structure

**Files:**
- Create: `packages/backend/` (directory)
- Create: `package.json` (root)

**Step 1: Create directory structure**

```bash
mkdir -p packages/backend
mkdir -p packages/shared
```

**Step 2: Create root package.json**

Create `package.json`:
```json
{
  "name": "finance-app",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:desktop\"",
    "dev:backend": "npm -w @finance/backend run start:dev",
    "dev:desktop": "npm -w @finance/desktop run dev:desktop",
    "build": "npm run build:backend && npm run build:desktop",
    "build:backend": "npm -w @finance/backend run build",
    "build:desktop": "npm -w @finance/desktop run build:desktop",
    "test": "npm -w @finance/backend run test:all",
    "lint": "npm -w @finance/backend run lint"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

**Step 3: Verify structure**

Run: `ls -la packages/`
Expected: `backend/` and `shared/` directories exist

**Step 4: Commit**

```bash
git add package.json packages/
git commit -m "chore: create monorepo structure with packages/"
```

---

### Task 1.2: Initialize NestJS Backend

**Files:**
- Create: `packages/backend/package.json`
- Create: `packages/backend/tsconfig.json`
- Create: `packages/backend/nest-cli.json`
- Create: `packages/backend/src/main.ts`
- Create: `packages/backend/src/app.module.ts`

**Step 1: Initialize NestJS project**

```bash
cd packages/backend
npm init -y
npm install @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs
npm install -D @nestjs/cli @nestjs/schematics @nestjs/testing typescript @types/node ts-node
```

**Step 2: Create tsconfig.json**

Create `packages/backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true
  }
}
```

**Step 3: Create nest-cli.json**

Create `packages/backend/nest-cli.json`:
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

**Step 4: Create app.module.ts**

Create `packages/backend/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

**Step 5: Create main.ts**

Create `packages/backend/src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();

  const port = process.env.PORT || 8080;
  await app.listen(port);

  console.log(`Backend running on http://localhost:${port}`);

  if (process.send) {
    process.send('ready');
  }
}

bootstrap();
```

**Step 6: Update package.json scripts**

Update `packages/backend/package.json` to include:
```json
{
  "name": "@finance/backend",
  "version": "1.0.0",
  "scripts": {
    "build": "nest build",
    "start": "node dist/main.js",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.config.js",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

**Step 7: Test that server starts**

Run: `cd packages/backend && npm run start:dev`
Expected: "Backend running on http://localhost:8080"

**Step 8: Commit**

```bash
git add packages/backend/
git commit -m "chore: initialize NestJS backend"
```

---

### Task 1.3: Set Up Prisma

**Files:**
- Create: `packages/backend/prisma/schema.prisma`
- Create: `packages/backend/src/prisma/prisma.module.ts`
- Create: `packages/backend/src/prisma/prisma.service.ts`
- Create: `packages/backend/.env`

**Step 1: Install Prisma**

```bash
cd packages/backend
npm install @prisma/client
npm install -D prisma
npx prisma init --datasource-provider sqlite
```

**Step 2: Create .env file**

Create `packages/backend/.env`:
```
DATABASE_URL="file:./dev.db"
```

**Step 3: Define Prisma schema**

Replace `packages/backend/prisma/schema.prisma` with:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Account {
  id             Int           @id @default(autoincrement())
  name           String
  type           String        @default("CHECKING")
  initialBalance Decimal       @default(0)
  archived       Boolean       @default(false)
  deletedAt      DateTime?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  transactions   Transaction[]
  recurringRules RecurringRule[]
}

model Category {
  id        Int       @id @default(autoincrement())
  name      String
  kind      String
  fixedCost Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  transactions   Transaction[]
  recurringRules RecurringRule[]
  budgets        Budget[]
}

model Transaction {
  id              Int       @id @default(autoincrement())
  date            DateTime
  amount          Decimal
  type            String
  notes           String?
  recurringRuleId Int?
  deletedAt       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  account    Account   @relation(fields: [accountId], references: [id])
  accountId  Int
  category   Category? @relation(fields: [categoryId], references: [id])
  categoryId Int?
  payee      Payee?    @relation(fields: [payeeId], references: [id])
  payeeId    Int?
  tags       TransactionTag[]
}

model RecurringRule {
  id             Int       @id @default(autoincrement())
  amount         Decimal
  direction      String
  period         String
  startDate      DateTime
  endDate        DateTime?
  nextOccurrence DateTime
  autoPost       Boolean   @default(true)
  note           String?
  deletedAt      DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  account    Account   @relation(fields: [accountId], references: [id])
  accountId  Int
  category   Category? @relation(fields: [categoryId], references: [id])
  categoryId Int?
  payee      Payee?    @relation(fields: [payeeId], references: [id])
  payeeId    Int?
}

model Budget {
  id            Int       @id @default(autoincrement())
  amount        Decimal
  period        String    @default("MONTHLY")
  effectiveFrom DateTime
  effectiveTo   DateTime?
  deletedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  category   Category @relation(fields: [categoryId], references: [id])
  categoryId Int
}

model AppSettings {
  id              Int      @id @default(1)
  currencyCode    String   @default("EUR")
  firstDayOfMonth Int      @default(1)
  firstDayOfWeek  Int      @default(1)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Tag {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  color     String?
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  transactions TransactionTag[]
}

model TransactionTag {
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  transactionId Int
  tag           Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)
  tagId         Int

  @@id([transactionId, tagId])
}

model Payee {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  notes     String?
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  transactions   Transaction[]
  recurringRules RecurringRule[]
}

model SavingsGoal {
  id            Int       @id @default(autoincrement())
  name          String
  targetAmount  Decimal
  currentAmount Decimal   @default(0)
  targetDate    DateTime?
  color         String?
  deletedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model AuditLog {
  id         Int      @id @default(autoincrement())
  entityType String
  entityId   Int
  action     String
  changes    String?
  timestamp  DateTime @default(now())
}
```

**Step 4: Generate Prisma client**

Run: `cd packages/backend && npx prisma generate`
Expected: "Generated Prisma Client"

**Step 5: Create initial migration**

Run: `cd packages/backend && npx prisma migrate dev --name init`
Expected: Migration created and applied

**Step 6: Create PrismaService**

Create `packages/backend/src/prisma/prisma.service.ts`:
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**Step 7: Create PrismaModule**

Create `packages/backend/src/prisma/prisma.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**Step 8: Add PrismaModule to AppModule**

Update `packages/backend/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

**Step 9: Verify Prisma works**

Run: `cd packages/backend && npx prisma studio`
Expected: Prisma Studio opens in browser

**Step 10: Commit**

```bash
git add packages/backend/prisma/ packages/backend/src/prisma/ packages/backend/.env
git commit -m "chore: set up Prisma with SQLite and schema"
```

---

### Task 1.4: Set Up Testing Infrastructure

**Files:**
- Create: `packages/backend/jest.config.js`
- Create: `packages/backend/test/jest-e2e.config.js`
- Create: `packages/backend/test/fixtures/factory.ts`

**Step 1: Install test dependencies**

```bash
cd packages/backend
npm install -D jest @types/jest ts-jest @faker-js/faker supertest @types/supertest
```

**Step 2: Create jest.config.js**

Create `packages/backend/jest.config.js`:
```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
```

**Step 3: Create jest-e2e.config.js**

Create `packages/backend/test/jest-e2e.config.js`:
```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
};
```

**Step 4: Create test fixtures factory**

Create `packages/backend/test/fixtures/factory.ts`:
```typescript
import { faker } from '@faker-js/faker';

export const Factory = {
  account(overrides?: Partial<any>) {
    return {
      name: faker.finance.accountName(),
      type: 'CHECKING',
      initialBalance: faker.number.float({ min: 0, max: 10000, fractionDigits: 2 }),
      archived: false,
      ...overrides,
    };
  },

  category(overrides?: Partial<any>) {
    return {
      name: faker.commerce.department(),
      kind: faker.helpers.arrayElement(['INCOME', 'EXPENSE']),
      fixedCost: faker.datatype.boolean(),
      ...overrides,
    };
  },

  transaction(overrides?: Partial<any>) {
    return {
      date: faker.date.recent({ days: 30 }),
      amount: faker.number.float({ min: -500, max: 500, fractionDigits: 2 }),
      type: faker.helpers.arrayElement(['INCOME', 'FIXED_COST', 'VARIABLE_EXPENSE']),
      notes: faker.lorem.sentence(),
      ...overrides,
    };
  },

  recurringRule(overrides?: Partial<any>) {
    const startDate = faker.date.past();
    return {
      amount: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
      direction: faker.helpers.arrayElement(['INCOME', 'EXPENSE']),
      period: faker.helpers.arrayElement(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
      startDate,
      nextOccurrence: startDate,
      autoPost: true,
      ...overrides,
    };
  },

  budget(overrides?: Partial<any>) {
    return {
      amount: faker.number.float({ min: 100, max: 2000, fractionDigits: 2 }),
      period: 'MONTHLY',
      effectiveFrom: faker.date.past(),
      ...overrides,
    };
  },

  tag(overrides?: Partial<any>) {
    return {
      name: faker.word.noun(),
      color: faker.color.rgb({ format: 'hex' }),
      ...overrides,
    };
  },

  payee(overrides?: Partial<any>) {
    return {
      name: faker.company.name(),
      notes: faker.lorem.sentence(),
      ...overrides,
    };
  },

  savingsGoal(overrides?: Partial<any>) {
    return {
      name: faker.lorem.words(3),
      targetAmount: faker.number.float({ min: 100, max: 5000, fractionDigits: 2 }),
      currentAmount: 0,
      targetDate: faker.date.future(),
      color: faker.color.rgb({ format: 'hex' }),
      ...overrides,
    };
  },
};
```

**Step 5: Verify test setup**

Create a simple test `packages/backend/src/app.module.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
```

Run: `cd packages/backend && npm test`
Expected: Test passes

**Step 6: Commit**

```bash
git add packages/backend/jest.config.js packages/backend/test/ packages/backend/src/app.module.spec.ts
git commit -m "chore: set up Jest testing infrastructure"
```

---

### Task 1.5: Set Up Common Infrastructure

**Files:**
- Create: `packages/backend/src/common/filters/http-exception.filter.ts`
- Create: `packages/backend/src/common/exceptions/business.exceptions.ts`
- Create: `packages/backend/src/common/dto/pagination.dto.ts`

**Step 1: Install validation dependencies**

```bash
cd packages/backend
npm install class-validator class-transformer
```

**Step 2: Create custom exceptions**

Create `packages/backend/src/common/exceptions/business.exceptions.ts`:
```typescript
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

export class EntityInUseException extends ConflictException {
  constructor(entity: string, dependency: string) {
    super(`Cannot delete ${entity} with existing ${dependency}`);
  }
}

export class EntityNotFoundException extends NotFoundException {
  constructor(entity: string, id: number | string) {
    super(`${entity} with id ${id} not found`);
  }
}

export class ValidationFailedException extends BadRequestException {
  constructor(errors: string[]) {
    super({ message: 'Validation failed', errors });
  }
}
```

**Step 3: Create global exception filter**

Create `packages/backend/src/common/filters/http-exception.filter.ts`:
```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message;
      error = HttpStatus[status] || 'Error';
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError
    ) {
      const prismaError = this.handlePrismaError(exception);
      status = prismaError.status;
      message = prismaError.message;
      error = prismaError.error;
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Record already exists',
          error: 'Conflict',
        };
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Referenced record does not exist',
          error: 'Conflict',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error',
          error: 'Internal Server Error',
        };
    }
  }
}
```

**Step 4: Create pagination DTO**

Create `packages/backend/src/common/dto/pagination.dto.ts`:
```typescript
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  get take(): number {
    return this.limit;
  }
}
```

**Step 5: Update main.ts to use global filter and validation**

Update `packages/backend/src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT || 8080;
  await app.listen(port);

  console.log(`Backend running on http://localhost:${port}`);

  if (process.send) {
    process.send('ready');
  }
}

bootstrap();
```

**Step 6: Test server still starts**

Run: `cd packages/backend && npm run start:dev`
Expected: Server starts without errors

**Step 7: Commit**

```bash
git add packages/backend/src/common/ packages/backend/src/main.ts
git commit -m "feat: add common infrastructure (exceptions, filters, pagination)"
```

---

## Phase 2: Core Modules

### Task 2.1: Health Module

**Files:**
- Create: `packages/backend/src/modules/health/health.module.ts`
- Create: `packages/backend/src/modules/health/health.controller.ts`

**Step 1: Create health controller**

Create `packages/backend/src/modules/health/health.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'OK' };
  }
}
```

**Step 2: Create health module**

Create `packages/backend/src/modules/health/health.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

**Step 3: Register in AppModule**

Update `packages/backend/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [PrismaModule, HealthModule],
})
export class AppModule {}
```

**Step 4: Test health endpoint**

Run: `curl http://localhost:8080/api/health`
Expected: `{"status":"OK"}`

**Step 5: Commit**

```bash
git add packages/backend/src/modules/health/ packages/backend/src/app.module.ts
git commit -m "feat: add health check endpoint"
```

---

### Task 2.2: Accounts Module

**Files:**
- Create: `packages/backend/src/modules/accounts/accounts.module.ts`
- Create: `packages/backend/src/modules/accounts/accounts.controller.ts`
- Create: `packages/backend/src/modules/accounts/accounts.service.ts`
- Create: `packages/backend/src/modules/accounts/dto/create-account.dto.ts`
- Create: `packages/backend/src/modules/accounts/dto/update-account.dto.ts`
- Test: `packages/backend/src/modules/accounts/accounts.service.spec.ts`

**Step 1: Write failing test for AccountsService.findAll**

Create `packages/backend/src/modules/accounts/accounts.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: PrismaService,
          useValue: {
            account: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            transaction: {
              count: jest.fn(),
            },
            recurringRule: {
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findAll', () => {
    it('should return accounts excluding soft-deleted', async () => {
      const mockAccounts = [
        { id: 1, name: 'Main', type: 'CHECKING', deletedAt: null },
      ];
      jest.spyOn(prisma.account, 'findMany').mockResolvedValue(mockAccounts as any);

      const result = await service.findAll();

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockAccounts);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/backend && npm test -- --testPathPattern=accounts`
Expected: FAIL - Cannot find module './accounts.service'

**Step 3: Create DTOs**

Create `packages/backend/src/modules/accounts/dto/create-account.dto.ts`:
```typescript
import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  type?: string = 'CHECKING';

  @IsOptional()
  @IsNumber()
  initialBalance?: number = 0;

  @IsOptional()
  @IsBoolean()
  archived?: boolean = false;
}
```

Create `packages/backend/src/modules/accounts/dto/update-account.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateAccountDto } from './create-account.dto';

export class UpdateAccountDto extends PartialType(CreateAccountDto) {}
```

**Step 4: Create AccountsService**

Create `packages/backend/src/modules/accounts/accounts.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import {
  EntityNotFoundException,
  EntityInUseException,
} from '../../common/exceptions/business.exceptions';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.account.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });
    if (!account || account.deletedAt) {
      throw new EntityNotFoundException('Account', id);
    }
    return account;
  }

  async create(dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: dto,
    });
  }

  async update(id: number, dto: UpdateAccountDto) {
    await this.findOne(id);
    return this.prisma.account.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const transactionCount = await this.prisma.transaction.count({
      where: { accountId: id, deletedAt: null },
    });
    if (transactionCount > 0) {
      throw new EntityInUseException('account', 'transactions');
    }

    const ruleCount = await this.prisma.recurringRule.count({
      where: { accountId: id, deletedAt: null },
    });
    if (ruleCount > 0) {
      throw new EntityInUseException('account', 'recurring rules');
    }

    return this.prisma.account.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd packages/backend && npm test -- --testPathPattern=accounts`
Expected: PASS

**Step 6: Create AccountsController**

Create `packages/backend/src/modules/accounts/accounts.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateAccountDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
```

**Step 7: Create AccountsModule**

Create `packages/backend/src/modules/accounts/accounts.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
```

**Step 8: Register in AppModule**

Update `packages/backend/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AccountsModule } from './modules/accounts/accounts.module';

@Module({
  imports: [PrismaModule, HealthModule, AccountsModule],
})
export class AppModule {}
```

**Step 9: Test API endpoints manually**

```bash
# Create account
curl -X POST http://localhost:8080/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"name":"Main Account","type":"CHECKING","initialBalance":1000}'

# List accounts
curl http://localhost:8080/api/accounts
```

Expected: Account created and returned in list

**Step 10: Commit**

```bash
git add packages/backend/src/modules/accounts/
git commit -m "feat: add accounts module with CRUD and soft delete"
```

---

### Task 2.3: Categories Module

**Files:**
- Create: `packages/backend/src/modules/categories/categories.module.ts`
- Create: `packages/backend/src/modules/categories/categories.controller.ts`
- Create: `packages/backend/src/modules/categories/categories.service.ts`
- Create: `packages/backend/src/modules/categories/dto/create-category.dto.ts`
- Create: `packages/backend/src/modules/categories/dto/update-category.dto.ts`

(Follow same TDD pattern as Task 2.2)

---

### Task 2.4: Settings Module

**Files:**
- Create: `packages/backend/src/modules/settings/settings.module.ts`
- Create: `packages/backend/src/modules/settings/settings.controller.ts`
- Create: `packages/backend/src/modules/settings/settings.service.ts`

(Follow same TDD pattern - singleton pattern, creates default on first GET)

---

## Phase 3: Transactions & Recurring Rules

### Task 3.1: Transactions Module

(Detailed steps similar to Task 2.2, with pagination support)

### Task 3.2: Recurring Rules Module

(Detailed steps including RecurringScheduleService)

### Task 3.3: Recurring Auto-Post Service

(Scheduled job implementation)

---

## Phase 4: Analytics & New Features

### Task 4.1: Analytics Module

### Task 4.2: Budgets Module

### Task 4.3: Tags Module

### Task 4.4: Payees Module

### Task 4.5: Savings Goals Module

### Task 4.6: Export/Import Module

---

## Phase 5: Infrastructure

### Task 5.1: Audit Module

### Task 5.2: Swagger Documentation

### Task 5.3: Data Seeding (DataInitializer)

---

## Phase 6: Electron Integration

### Task 6.1: Update Electron Main Process

### Task 6.2: Database Path Configuration

### Task 6.3: Backend Lifecycle Management

---

## Phase 7: Final Integration

### Task 7.1: E2E Test Suite

### Task 7.2: Build Scripts

### Task 7.3: Documentation Update

### Task 7.4: Cleanup Old Java Backend

---

## Execution Notes

- Each task should take 15-30 minutes
- Run tests after each step
- Commit after each completed task
- Use `npx prisma studio` to inspect database during development
- Keep backend running with `npm run start:dev` for hot reload
