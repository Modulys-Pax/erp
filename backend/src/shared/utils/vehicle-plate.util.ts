/**
 * Retorna a placa do veículo (1:1 - cada Vehicle tem exatamente uma placa).
 * Usado para exibição, pastas de documento e relatórios.
 */
export function getPrimaryPlate(vehicle: { plate?: { type: string; plate: string } | null }): string {
  return vehicle.plate?.plate ?? '';
}
