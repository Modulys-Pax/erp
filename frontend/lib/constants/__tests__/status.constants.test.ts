import {
  VEHICLE_STATUS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_COLORS,
  MAINTENANCE_STATUS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_COLORS,
  MAINTENANCE_TYPE,
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_DUE_STATUS,
  MAINTENANCE_DUE_STATUS_LABELS,
  STOCK_LEVEL,
  STOCK_LEVEL_LABELS,
  getStockLevel,
  STOCK_MOVEMENT_TYPE,
  STOCK_MOVEMENT_TYPE_LABELS,
  MAINTENANCE_EVENT,
  MAINTENANCE_EVENT_LABELS,
  ACCOUNT_PAYABLE_STATUS,
  ACCOUNT_PAYABLE_STATUS_LABELS,
  ACCOUNT_RECEIVABLE_STATUS,
  ACCOUNT_RECEIVABLE_STATUS_LABELS,
  VACATION_STATUS,
  VACATION_STATUS_LABELS,
  EXPENSE_TYPE,
  EXPENSE_TYPE_LABELS,
  ACTIVE_STATUS_COLORS,
} from '../status.constants';

describe('status.constants', () => {
  describe('VEHICLE_STATUS', () => {
    it('deve ter todos os status', () => {
      expect(VEHICLE_STATUS.ACTIVE).toBe('ACTIVE');
      expect(VEHICLE_STATUS.MAINTENANCE).toBe('MAINTENANCE');
      expect(VEHICLE_STATUS.STOPPED).toBe('STOPPED');
    });

    it('deve ter labels para todos os status', () => {
      expect(VEHICLE_STATUS_LABELS.ACTIVE).toBe('Em Operação');
      expect(VEHICLE_STATUS_LABELS.MAINTENANCE).toBe('Manutenção');
      expect(VEHICLE_STATUS_LABELS.STOPPED).toBe('Parado');
    });

    it('deve ter cores para todos os status', () => {
      expect(VEHICLE_STATUS_COLORS.ACTIVE).toBeDefined();
      expect(VEHICLE_STATUS_COLORS.MAINTENANCE).toBeDefined();
      expect(VEHICLE_STATUS_COLORS.STOPPED).toBeDefined();
    });
  });

  describe('MAINTENANCE_STATUS', () => {
    it('deve ter todos os status', () => {
      expect(MAINTENANCE_STATUS.OPEN).toBe('OPEN');
      expect(MAINTENANCE_STATUS.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(MAINTENANCE_STATUS.PAUSED).toBe('PAUSED');
      expect(MAINTENANCE_STATUS.COMPLETED).toBe('COMPLETED');
      expect(MAINTENANCE_STATUS.CANCELLED).toBe('CANCELLED');
    });

    it('deve ter labels para todos os status', () => {
      expect(MAINTENANCE_STATUS_LABELS.OPEN).toBe('Aberta');
      expect(MAINTENANCE_STATUS_LABELS.IN_PROGRESS).toBe('Em Execução');
      expect(MAINTENANCE_STATUS_LABELS.PAUSED).toBe('Pausada');
      expect(MAINTENANCE_STATUS_LABELS.COMPLETED).toBe('Concluída');
      expect(MAINTENANCE_STATUS_LABELS.CANCELLED).toBe('Cancelada');
    });

    it('deve ter cores para todos os status', () => {
      Object.keys(MAINTENANCE_STATUS).forEach((status) => {
        expect(MAINTENANCE_STATUS_COLORS[status as keyof typeof MAINTENANCE_STATUS_COLORS]).toBeDefined();
      });
    });
  });

  describe('MAINTENANCE_TYPE', () => {
    it('deve ter tipos corretos', () => {
      expect(MAINTENANCE_TYPE.PREVENTIVE).toBe('PREVENTIVE');
      expect(MAINTENANCE_TYPE.CORRECTIVE).toBe('CORRECTIVE');
    });

    it('deve ter labels corretos', () => {
      expect(MAINTENANCE_TYPE_LABELS.PREVENTIVE).toBe('Preventiva');
      expect(MAINTENANCE_TYPE_LABELS.CORRECTIVE).toBe('Corretiva');
    });
  });

  describe('MAINTENANCE_DUE_STATUS', () => {
    it('deve ter status corretos', () => {
      expect(MAINTENANCE_DUE_STATUS.OK).toBe('ok');
      expect(MAINTENANCE_DUE_STATUS.WARNING).toBe('warning');
      expect(MAINTENANCE_DUE_STATUS.DUE).toBe('due');
    });

    it('deve ter labels corretos', () => {
      expect(MAINTENANCE_DUE_STATUS_LABELS.ok).toBe('No prazo');
      expect(MAINTENANCE_DUE_STATUS_LABELS.warning).toBe('Próximo de trocar');
      expect(MAINTENANCE_DUE_STATUS_LABELS.due).toBe('Trocar agora');
    });
  });

  describe('STOCK_LEVEL', () => {
    it('deve ter níveis corretos', () => {
      expect(STOCK_LEVEL.OK).toBe('ok');
      expect(STOCK_LEVEL.LOW).toBe('low');
      expect(STOCK_LEVEL.CRITICAL).toBe('critical');
    });

    it('deve ter labels corretos', () => {
      expect(STOCK_LEVEL_LABELS.ok).toBe('Normal');
      expect(STOCK_LEVEL_LABELS.low).toBe('Baixo');
      expect(STOCK_LEVEL_LABELS.critical).toBe('Crítico');
    });
  });

  describe('getStockLevel', () => {
    it('deve retornar OK quando quantidade >= mínimo', () => {
      expect(getStockLevel(100, 50)).toBe('ok');
      expect(getStockLevel(50, 50)).toBe('ok');
    });

    it('deve retornar LOW quando quantidade < mínimo e >= 50%', () => {
      expect(getStockLevel(40, 50)).toBe('low');
      expect(getStockLevel(25, 50)).toBe('low');
    });

    it('deve retornar CRITICAL quando quantidade < 50% do mínimo', () => {
      expect(getStockLevel(10, 50)).toBe('critical');
      expect(getStockLevel(0, 50)).toBe('critical');
    });

    it('deve retornar OK quando mínimo é 0 ou negativo', () => {
      expect(getStockLevel(10, 0)).toBe('ok');
      expect(getStockLevel(10, -5)).toBe('ok');
    });
  });

  describe('STOCK_MOVEMENT_TYPE', () => {
    it('deve ter tipos corretos', () => {
      expect(STOCK_MOVEMENT_TYPE.ENTRY).toBe('ENTRY');
      expect(STOCK_MOVEMENT_TYPE.EXIT).toBe('EXIT');
    });

    it('deve ter labels corretos', () => {
      expect(STOCK_MOVEMENT_TYPE_LABELS.ENTRY).toBe('Entrada');
      expect(STOCK_MOVEMENT_TYPE_LABELS.EXIT).toBe('Saída');
    });
  });

  describe('MAINTENANCE_EVENT', () => {
    it('deve ter todos os eventos', () => {
      expect(MAINTENANCE_EVENT.STARTED).toBe('STARTED');
      expect(MAINTENANCE_EVENT.PAUSED).toBe('PAUSED');
      expect(MAINTENANCE_EVENT.RESUMED).toBe('RESUMED');
      expect(MAINTENANCE_EVENT.COMPLETED).toBe('COMPLETED');
      expect(MAINTENANCE_EVENT.CANCELLED).toBe('CANCELLED');
    });

    it('deve ter labels corretos', () => {
      expect(MAINTENANCE_EVENT_LABELS.STARTED).toBe('Iniciada');
      expect(MAINTENANCE_EVENT_LABELS.PAUSED).toBe('Pausada');
      expect(MAINTENANCE_EVENT_LABELS.RESUMED).toBe('Retomada');
      expect(MAINTENANCE_EVENT_LABELS.COMPLETED).toBe('Concluída');
      expect(MAINTENANCE_EVENT_LABELS.CANCELLED).toBe('Cancelada');
    });
  });

  describe('ACCOUNT_PAYABLE_STATUS', () => {
    it('deve ter status corretos', () => {
      expect(ACCOUNT_PAYABLE_STATUS.PENDING).toBe('PENDING');
      expect(ACCOUNT_PAYABLE_STATUS.OVERDUE).toBe('OVERDUE');
      expect(ACCOUNT_PAYABLE_STATUS.PAID).toBe('PAID');
      expect(ACCOUNT_PAYABLE_STATUS.CANCELLED).toBe('CANCELLED');
    });

    it('deve ter labels corretos', () => {
      expect(ACCOUNT_PAYABLE_STATUS_LABELS.PENDING).toBe('Pendente');
      expect(ACCOUNT_PAYABLE_STATUS_LABELS.OVERDUE).toBe('Vencido');
      expect(ACCOUNT_PAYABLE_STATUS_LABELS.PAID).toBe('Paga');
      expect(ACCOUNT_PAYABLE_STATUS_LABELS.CANCELLED).toBe('Cancelada');
    });
  });

  describe('ACCOUNT_RECEIVABLE_STATUS', () => {
    it('deve ter status corretos', () => {
      expect(ACCOUNT_RECEIVABLE_STATUS.PENDING).toBe('PENDING');
      expect(ACCOUNT_RECEIVABLE_STATUS.RECEIVED).toBe('RECEIVED');
      expect(ACCOUNT_RECEIVABLE_STATUS.CANCELLED).toBe('CANCELLED');
    });

    it('deve ter labels corretos', () => {
      expect(ACCOUNT_RECEIVABLE_STATUS_LABELS.PENDING).toBe('Pendente');
      expect(ACCOUNT_RECEIVABLE_STATUS_LABELS.RECEIVED).toBe('Recebida');
      expect(ACCOUNT_RECEIVABLE_STATUS_LABELS.CANCELLED).toBe('Cancelada');
    });
  });

  describe('VACATION_STATUS', () => {
    it('deve ter status corretos', () => {
      expect(VACATION_STATUS.PLANNED).toBe('PLANNED');
      expect(VACATION_STATUS.APPROVED).toBe('APPROVED');
      expect(VACATION_STATUS.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(VACATION_STATUS.COMPLETED).toBe('COMPLETED');
      expect(VACATION_STATUS.CANCELLED).toBe('CANCELLED');
    });

    it('deve ter labels corretos', () => {
      expect(VACATION_STATUS_LABELS.PLANNED).toBe('Planejada');
      expect(VACATION_STATUS_LABELS.APPROVED).toBe('Aprovada');
      expect(VACATION_STATUS_LABELS.IN_PROGRESS).toBe('Em Andamento');
      expect(VACATION_STATUS_LABELS.COMPLETED).toBe('Concluída');
      expect(VACATION_STATUS_LABELS.CANCELLED).toBe('Cancelada');
    });
  });

  describe('EXPENSE_TYPE', () => {
    it('deve ter tipos corretos', () => {
      expect(EXPENSE_TYPE.TRANSPORT).toBe('TRANSPORT');
      expect(EXPENSE_TYPE.MEAL).toBe('MEAL');
      expect(EXPENSE_TYPE.ACCOMMODATION).toBe('ACCOMMODATION');
      expect(EXPENSE_TYPE.OTHER).toBe('OTHER');
    });

    it('deve ter labels corretos', () => {
      expect(EXPENSE_TYPE_LABELS.TRANSPORT).toBe('Transporte');
      expect(EXPENSE_TYPE_LABELS.MEAL).toBe('Refeição');
      expect(EXPENSE_TYPE_LABELS.ACCOMMODATION).toBe('Hospedagem');
      expect(EXPENSE_TYPE_LABELS.OTHER).toBe('Outros');
    });
  });

  describe('ACTIVE_STATUS_COLORS', () => {
    it('deve ter cores para ativo e inativo', () => {
      expect(ACTIVE_STATUS_COLORS.active).toBeDefined();
      expect(ACTIVE_STATUS_COLORS.inactive).toBeDefined();
    });
  });
});
