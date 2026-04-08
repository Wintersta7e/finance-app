-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Transaction_date_deletedAt_idx" ON "Transaction"("date", "deletedAt");

-- CreateIndex
CREATE INDEX "Transaction_accountId_deletedAt_idx" ON "Transaction"("accountId", "deletedAt");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_deletedAt_idx" ON "Transaction"("categoryId", "deletedAt");
