-- Bus alerts for parents
CREATE TABLE IF NOT EXISTS "bus_notifications" (
  "id"        TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "parentId"  TEXT NOT NULL,
  "studentId" TEXT,
  "schoolId"  TEXT NOT NULL,
  "vehicleId" TEXT,
  "routeId"   TEXT,
  "stopId"    TEXT,
  "type"      TEXT NOT NULL,
  "session"   TEXT,
  "title"     TEXT NOT NULL,
  "message"   TEXT NOT NULL,
  "etaMin"    INTEGER,
  "dedupeKey" TEXT NOT NULL,
  "readAt"    TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "bus_notifications_dedupeKey_key" ON "bus_notifications"("dedupeKey");
CREATE INDEX IF NOT EXISTS "bus_notifications_parentId_createdAt_idx" ON "bus_notifications"("parentId", "createdAt");
CREATE INDEX IF NOT EXISTS "bus_notifications_schoolId_createdAt_idx" ON "bus_notifications"("schoolId", "createdAt");