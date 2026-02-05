import { getPrimaryPlate } from './vehicle-plate.util';

describe('vehicle-plate.util', () => {
  describe('getPrimaryPlate', () => {
    it('deve retornar placa quando existir', () => {
      const vehicle = {
        plate: { type: 'CAVALO', plate: 'AAA-1234' },
      };

      expect(getPrimaryPlate(vehicle)).toBe('AAA-1234');
    });

    it('deve retornar placa de qualquer tipo', () => {
      const vehicle = {
        plate: { type: 'CARRETA', plate: 'CCC-1234' },
      };

      expect(getPrimaryPlate(vehicle)).toBe('CCC-1234');
    });

    it('deve retornar string vazia quando não há placas', () => {
      const vehicle = { plate: null };
      expect(getPrimaryPlate(vehicle)).toBe('');
    });

    it('deve retornar string vazia quando plate é undefined', () => {
      const vehicle = {};
      expect(getPrimaryPlate(vehicle)).toBe('');
    });

    it('deve funcionar com apenas uma placa', () => {
      const vehicle = {
        plate: { type: 'TRATOR', plate: 'XYZ-9876' },
      };

      expect(getPrimaryPlate(vehicle)).toBe('XYZ-9876');
    });
  });
});
