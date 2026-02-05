-- ============================================
-- Vehicle = 1 placa por registro
-- Cada Vehicle terá exatamente uma VehiclePlate
-- ============================================

-- 1. Dividir veículos com múltiplas placas em registros separados
-- Para cada Vehicle com >1 placa: manter primeira placa no veículo original,
-- criar novos Vehicles para as demais placas e atualizar as tabelas de junção.

DO $$
DECLARE
  v_vehicle RECORD;
  v_plate RECORD;
  v_new_vehicle_id TEXT;
  v_original_id TEXT;
  v_plate_count INT;
  v_plate_ord INT;
  v_type_order INT;
BEGIN
  -- Ordem de prioridade para qual placa fica no veículo original: CAVALO > PRIMEIRA_CARRETA > DOLLY > SEGUNDA_CARRETA
  FOR v_vehicle IN
    SELECT vp."vehicleId" AS vid
    FROM "vehicle_plates" vp
    WHERE vp."vehicleId" IN (SELECT "vehicleId" FROM "vehicle_plates" GROUP BY "vehicleId" HAVING COUNT(*) > 1)
    GROUP BY vp."vehicleId"
  LOOP
    v_original_id := v_vehicle.vid;
    v_plate_count := 0;
    
    -- Para cada placa adicional (excluindo a primeira por tipo)
    FOR v_plate IN
      SELECT vp.id AS plate_id, vp.type, vp.plate,
        CASE vp.type
          WHEN 'CAVALO' THEN 1
          WHEN 'PRIMEIRA_CARRETA' THEN 2
          WHEN 'DOLLY' THEN 3
          WHEN 'SEGUNDA_CARRETA' THEN 4
          ELSE 5
        END AS type_ord
      FROM "vehicle_plates" vp
      WHERE vp."vehicleId" = v_original_id
      ORDER BY type_ord
    LOOP
      v_plate_count := v_plate_count + 1;
      
      -- Primeira placa: mantém no veículo original
      IF v_plate_count = 1 THEN
        CONTINUE;
      END IF;
      
      -- Placas 2..n: criar novo Vehicle e mover a placa
      v_new_vehicle_id := gen_random_uuid()::TEXT;
      
      -- Inserir novo Vehicle (cópia do original)
      INSERT INTO "vehicles" (
        "id", "brandId", "modelId", "year", "color", "chassis", "renavam",
        "currentKm", "status", "companyId", "branchId", "active",
        "createdAt", "updatedAt", "createdBy", "deletedAt"
      )
      SELECT
        v_new_vehicle_id, v."brandId", v."modelId", v."year", v."color", v."chassis", v."renavam",
        v."currentKm", v."status", v."companyId", v."branchId", v."active",
        v."createdAt", v."updatedAt", v."createdBy", v."deletedAt"
      FROM "vehicles" v
      WHERE v.id = v_original_id;
      
      -- Mover a placa para o novo veículo
      UPDATE "vehicle_plates"
      SET "vehicleId" = v_new_vehicle_id
      WHERE id = v_plate.plate_id;
      
      -- Atualizar maintenance_order_vehicles
      INSERT INTO "maintenance_order_vehicles" ("id", "maintenanceOrderId", "vehicleId")
      SELECT gen_random_uuid(), mov."maintenanceOrderId", v_new_vehicle_id
      FROM "maintenance_order_vehicles" mov
      WHERE mov."vehicleId" = v_original_id;
      
      -- Atualizar vehicle_marking_vehicles
      INSERT INTO "vehicle_marking_vehicles" ("id", "vehicleMarkingId", "vehicleId")
      SELECT gen_random_uuid(), vmv."vehicleMarkingId", v_new_vehicle_id
      FROM "vehicle_marking_vehicles" vmv
      WHERE vmv."vehicleId" = v_original_id;
      
      -- Atualizar maintenance_label_vehicles
      INSERT INTO "maintenance_label_vehicles" ("id", "maintenanceLabelId", "vehicleId")
      SELECT gen_random_uuid(), mlv."maintenanceLabelId", v_new_vehicle_id
      FROM "maintenance_label_vehicles" mlv
      WHERE mlv."vehicleId" = v_original_id;
      
    END LOOP;
  END LOOP;
END $$;

-- 2. Garantir que veículos sem placa recebam uma (caso edge: não deve existir após migração anterior)
-- Não fazemos nada aqui - assumimos que todo Vehicle tem ao menos 1 placa

-- 3. Trocar constraint: de (vehicleId, type) para (vehicleId) - 1 placa por veículo
DROP INDEX IF EXISTS "vehicle_plates_vehicleId_type_key";
CREATE UNIQUE INDEX "vehicle_plates_vehicleId_key" ON "vehicle_plates"("vehicleId");
