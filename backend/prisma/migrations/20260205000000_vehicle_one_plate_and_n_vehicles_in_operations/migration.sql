-- ============================================
-- Vehicle: 1 placa por veículo
-- MaintenanceOrder, VehicleMarking, MaintenanceLabel: N veículos (1 a 4 placas)
-- ============================================

-- 1. Criar tabelas de junção (N veículos por operação)
CREATE TABLE "maintenance_order_vehicles" (
    "id" TEXT NOT NULL,
    "maintenanceOrderId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,

    CONSTRAINT "maintenance_order_vehicles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vehicle_marking_vehicles" (
    "id" TEXT NOT NULL,
    "vehicleMarkingId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,

    CONSTRAINT "vehicle_marking_vehicles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maintenance_label_vehicles" (
    "id" TEXT NOT NULL,
    "maintenanceLabelId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,

    CONSTRAINT "maintenance_label_vehicles_pkey" PRIMARY KEY ("id")
);

-- 2. Migrar dados existentes (vehicleId -> junção)
INSERT INTO "maintenance_order_vehicles" ("id", "maintenanceOrderId", "vehicleId")
SELECT gen_random_uuid(), "id", "vehicleId" FROM "maintenance_orders" WHERE "vehicleId" IS NOT NULL;

INSERT INTO "vehicle_marking_vehicles" ("id", "vehicleMarkingId", "vehicleId")
SELECT gen_random_uuid(), "id", "vehicleId" FROM "vehicle_markings";

INSERT INTO "maintenance_label_vehicles" ("id", "maintenanceLabelId", "vehicleId")
SELECT gen_random_uuid(), "id", "vehicleId" FROM "maintenance_labels";

-- 3. Remover vehicleId das tabelas
ALTER TABLE "maintenance_orders" DROP CONSTRAINT "maintenance_orders_vehicleId_fkey";
ALTER TABLE "maintenance_orders" DROP COLUMN "vehicleId";

ALTER TABLE "vehicle_markings" DROP CONSTRAINT "vehicle_markings_vehicleId_fkey";
ALTER TABLE "vehicle_markings" DROP COLUMN "vehicleId";

ALTER TABLE "maintenance_labels" DROP CONSTRAINT "maintenance_labels_vehicleId_fkey";
ALTER TABLE "maintenance_labels" DROP COLUMN "vehicleId";

-- 4. Adicionar FKs e índices
CREATE UNIQUE INDEX "maintenance_order_vehicles_maintenanceOrderId_vehicleId_key" ON "maintenance_order_vehicles"("maintenanceOrderId", "vehicleId");
CREATE INDEX "maintenance_order_vehicles_maintenanceOrderId_idx" ON "maintenance_order_vehicles"("maintenanceOrderId");
CREATE INDEX "maintenance_order_vehicles_vehicleId_idx" ON "maintenance_order_vehicles"("vehicleId");
ALTER TABLE "maintenance_order_vehicles" ADD CONSTRAINT "maintenance_order_vehicles_maintenanceOrderId_fkey" FOREIGN KEY ("maintenanceOrderId") REFERENCES "maintenance_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_order_vehicles" ADD CONSTRAINT "maintenance_order_vehicles_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "vehicle_marking_vehicles_vehicleMarkingId_vehicleId_key" ON "vehicle_marking_vehicles"("vehicleMarkingId", "vehicleId");
CREATE INDEX "vehicle_marking_vehicles_vehicleMarkingId_idx" ON "vehicle_marking_vehicles"("vehicleMarkingId");
CREATE INDEX "vehicle_marking_vehicles_vehicleId_idx" ON "vehicle_marking_vehicles"("vehicleId");
ALTER TABLE "vehicle_marking_vehicles" ADD CONSTRAINT "vehicle_marking_vehicles_vehicleMarkingId_fkey" FOREIGN KEY ("vehicleMarkingId") REFERENCES "vehicle_markings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_marking_vehicles" ADD CONSTRAINT "vehicle_marking_vehicles_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "maintenance_label_vehicles_maintenanceLabelId_vehicleId_key" ON "maintenance_label_vehicles"("maintenanceLabelId", "vehicleId");
CREATE INDEX "maintenance_label_vehicles_maintenanceLabelId_idx" ON "maintenance_label_vehicles"("maintenanceLabelId");
CREATE INDEX "maintenance_label_vehicles_vehicleId_idx" ON "maintenance_label_vehicles"("vehicleId");
ALTER TABLE "maintenance_label_vehicles" ADD CONSTRAINT "maintenance_label_vehicles_maintenanceLabelId_fkey" FOREIGN KEY ("maintenanceLabelId") REFERENCES "maintenance_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenance_label_vehicles" ADD CONSTRAINT "maintenance_label_vehicles_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
