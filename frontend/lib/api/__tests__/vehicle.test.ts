import { vehicleApi, Vehicle, CreateVehicleDto, VehicleCostsResponse } from '../vehicle';
import api from '../../axios';

jest.mock('../../axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('vehicleApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockVehicle: Vehicle = {
    id: 'vehicle-123',
    plate: 'ABC-1234',
    plates: [{ type: 'CAVALO', plate: 'ABC-1234' }],
    replacementItems: [],
    status: 'ACTIVE',
    companyId: 'company-123',
    branchId: 'branch-123',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('getAll', () => {
    it('deve buscar todos os veículos', async () => {
      const mockResponse = {
        data: [mockVehicle],
        total: 1,
        page: 1,
        limit: 15,
        totalPages: 1,
      };
      (mockApi.get as jest.Mock).mockResolvedValueOnce({ data: mockResponse });

      const result = await vehicleApi.getAll();

      expect(mockApi.get).toHaveBeenCalledWith('/vehicles', {
        params: { branchId: undefined, includeDeleted: undefined, page: 1, limit: 15 },
      });
      expect(result).toEqual(mockResponse);
    });

    it('deve filtrar por branchId', async () => {
      (mockApi.get as jest.Mock).mockResolvedValueOnce({ data: { data: [] } });

      await vehicleApi.getAll('branch-123');

      expect(mockApi.get).toHaveBeenCalledWith('/vehicles', {
        params: { branchId: 'branch-123', includeDeleted: undefined, page: 1, limit: 15 },
      });
    });

    it('deve incluir deletados quando solicitado', async () => {
      (mockApi.get as jest.Mock).mockResolvedValueOnce({ data: { data: [] } });

      await vehicleApi.getAll(undefined, true);

      expect(mockApi.get).toHaveBeenCalledWith('/vehicles', {
        params: { branchId: undefined, includeDeleted: true, page: 1, limit: 15 },
      });
    });

    it('deve aceitar paginação personalizada', async () => {
      (mockApi.get as jest.Mock).mockResolvedValueOnce({ data: { data: [] } });

      await vehicleApi.getAll(undefined, false, 2, 30);

      expect(mockApi.get).toHaveBeenCalledWith('/vehicles', {
        params: { branchId: undefined, includeDeleted: false, page: 2, limit: 30 },
      });
    });
  });

  describe('getById', () => {
    it('deve buscar veículo por ID', async () => {
      (mockApi.get as jest.Mock).mockResolvedValueOnce({ data: mockVehicle });

      const result = await vehicleApi.getById('vehicle-123');

      expect(mockApi.get).toHaveBeenCalledWith('/vehicles/vehicle-123');
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('create', () => {
    it('deve criar veículo', async () => {
      const createDto: CreateVehicleDto = {
        plate: { type: 'CAVALO', plate: 'XYZ-9999' },
        companyId: 'company-123',
        branchId: 'branch-123',
      };
      (mockApi.post as jest.Mock).mockResolvedValueOnce({ data: mockVehicle });

      const result = await vehicleApi.create(createDto);

      expect(mockApi.post).toHaveBeenCalledWith('/vehicles', createDto);
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('update', () => {
    it('deve atualizar veículo', async () => {
      const updateData = { color: 'Azul' };
      (mockApi.patch as jest.Mock).mockResolvedValueOnce({ data: { ...mockVehicle, color: 'Azul' } });

      const result = await vehicleApi.update('vehicle-123', updateData);

      expect(mockApi.patch).toHaveBeenCalledWith('/vehicles/vehicle-123', updateData);
      expect(result.color).toBe('Azul');
    });
  });

  describe('delete', () => {
    it('deve deletar veículo', async () => {
      (mockApi.delete as jest.Mock).mockResolvedValueOnce({});

      await vehicleApi.delete('vehicle-123');

      expect(mockApi.delete).toHaveBeenCalledWith('/vehicles/vehicle-123');
    });
  });

  describe('updateKm', () => {
    it('deve atualizar KM do veículo', async () => {
      const kmData = { currentKm: 50000, notes: 'Revisão' };
      (mockApi.patch as jest.Mock).mockResolvedValueOnce({ data: { ...mockVehicle, currentKm: 50000 } });

      const result = await vehicleApi.updateKm('vehicle-123', kmData);

      expect(mockApi.patch).toHaveBeenCalledWith('/vehicles/vehicle-123/km', kmData);
      expect(result.currentKm).toBe(50000);
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar status do veículo', async () => {
      const statusData = { status: 'MAINTENANCE' as const, notes: 'Manutenção preventiva' };
      (mockApi.patch as jest.Mock).mockResolvedValueOnce({ data: { ...mockVehicle, status: 'MAINTENANCE' } });

      const result = await vehicleApi.updateStatus('vehicle-123', statusData);

      expect(mockApi.patch).toHaveBeenCalledWith('/vehicles/vehicle-123/status', statusData);
      expect(result.status).toBe('MAINTENANCE');
    });
  });

  describe('getStatusHistory', () => {
    it('deve buscar histórico de status', async () => {
      const mockHistory = [
        { id: '1', vehicleId: 'vehicle-123', status: 'ACTIVE', createdAt: new Date() },
      ];
      (mockApi.get as jest.Mock).mockResolvedValueOnce({ data: mockHistory });

      const result = await vehicleApi.getStatusHistory('vehicle-123');

      expect(mockApi.get).toHaveBeenCalledWith('/vehicles/vehicle-123/history');
      expect(result).toEqual(mockHistory);
    });
  });

  describe('getCosts', () => {
    it('deve buscar custos dos veículos', async () => {
      const mockCosts: VehicleCostsResponse = {
        summary: {
          totalVehicles: 10,
          totalMaintenanceCost: 5000,
          totalMaterialsCost: 3000,
          totalServicesCost: 2000,
          totalMaintenanceOrders: 15,
          averageCostPerVehicle: 500,
        },
        vehicles: {
          data: [],
          total: 0,
          page: 1,
          limit: 15,
          totalPages: 0,
        },
      };
      (mockApi.get as jest.Mock).mockResolvedValueOnce({ data: mockCosts });

      const result = await vehicleApi.getCosts('branch-123', '2024-01-01', '2024-12-31');

      expect(mockApi.get).toHaveBeenCalledWith('/vehicles/costs/summary', {
        params: { branchId: 'branch-123', startDate: '2024-01-01', endDate: '2024-12-31', page: 1, limit: 15 },
      });
      expect(result.summary.totalVehicles).toBe(10);
    });
  });
});
