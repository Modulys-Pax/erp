-- AlterTable
ALTER TABLE "maintenance_materials" ADD COLUMN     "maintenanceServiceId" TEXT;

-- CreateTable
CREATE TABLE "maintenance_service_workers" (
    "id" TEXT NOT NULL,
    "maintenanceServiceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "maintenance_service_workers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_service_workers_maintenanceServiceId_employeeId_key" ON "maintenance_service_workers"("maintenanceServiceId", "employeeId");

-- AddForeignKey
ALTER TABLE "maintenance_service_workers" ADD CONSTRAINT "maintenance_service_workers_maintenanceServiceId_fkey" FOREIGN KEY ("maintenanceServiceId") REFERENCES "maintenance_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_service_workers" ADD CONSTRAINT "maintenance_service_workers_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_materials" ADD CONSTRAINT "maintenance_materials_maintenanceServiceId_fkey" FOREIGN KEY ("maintenanceServiceId") REFERENCES "maintenance_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
