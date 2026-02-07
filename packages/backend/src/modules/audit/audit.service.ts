import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(entityType: string, entityId: number, action: string, changes?: string) {
    return this.prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        changes,
      },
    });
  }

  computeDiff(
    previous: Record<string, any>,
    current: Record<string, any>,
  ): string | null {
    const excludeFields = new Set(['updatedAt', 'createdAt']);
    const diff: Record<string, { from: any; to: any }> = {};

    const allKeys = new Set([
      ...Object.keys(previous),
      ...Object.keys(current),
    ]);

    for (const key of allKeys) {
      if (excludeFields.has(key)) continue;

      const fromVal = previous[key];
      const toVal = current[key];

      if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
        diff[key] = { from: fromVal, to: toVal };
      }
    }

    if (Object.keys(diff).length === 0) {
      return null;
    }

    return JSON.stringify(diff);
  }

  async getHistory(entityType: string, entityId: number) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getRecentActivity(limit: number) {
    return this.prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
