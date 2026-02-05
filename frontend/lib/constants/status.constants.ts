/**
 * Constantes centralizadas de cores e labels de status
 * Usado em todo o sistema para garantir consistência visual
 */

// =============================================================================
// STATUS DE VEÍCULOS
// =============================================================================

export const VEHICLE_STATUS = {
  ACTIVE: 'ACTIVE',
  MAINTENANCE: 'MAINTENANCE',
  STOPPED: 'STOPPED',
} as const;

export type VehicleStatus = (typeof VEHICLE_STATUS)[keyof typeof VEHICLE_STATUS];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  ACTIVE: 'Em Operação',
  MAINTENANCE: 'Manutenção',
  STOPPED: 'Parado',
};

export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  STOPPED: 'bg-muted text-muted-foreground',
};

export const VEHICLE_STATUS_ICON_COLORS: Record<VehicleStatus, string> = {
  ACTIVE: 'text-blue-600 dark:text-blue-400',
  MAINTENANCE: 'text-yellow-600 dark:text-yellow-400',
  STOPPED: 'text-muted-foreground',
};

// =============================================================================
// STATUS DE ORDENS DE MANUTENÇÃO
// =============================================================================

export const MAINTENANCE_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUS)[keyof typeof MAINTENANCE_STATUS];

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em Execução',
  PAUSED: 'Pausada',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

export const MAINTENANCE_STATUS_COLORS: Record<MaintenanceStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  PAUSED: 'bg-muted text-muted-foreground',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const MAINTENANCE_STATUS_ICON_COLORS: Record<MaintenanceStatus, string> = {
  OPEN: 'text-blue-600 dark:text-blue-400',
  IN_PROGRESS: 'text-yellow-600 dark:text-yellow-400',
  PAUSED: 'text-muted-foreground',
  COMPLETED: 'text-green-600 dark:text-green-400',
  CANCELLED: 'text-red-600 dark:text-red-400',
};

// =============================================================================
// TIPOS DE MANUTENÇÃO
// =============================================================================

export const MAINTENANCE_TYPE = {
  PREVENTIVE: 'PREVENTIVE',
  CORRECTIVE: 'CORRECTIVE',
} as const;

export type MaintenanceType = (typeof MAINTENANCE_TYPE)[keyof typeof MAINTENANCE_TYPE];

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  PREVENTIVE: 'Preventiva',
  CORRECTIVE: 'Corretiva',
};

export const MAINTENANCE_TYPE_COLORS: Record<MaintenanceType, string> = {
  PREVENTIVE:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/90 dark:text-emerald-100',
  CORRECTIVE:
    'bg-amber-100 text-amber-900 dark:bg-amber-900/90 dark:text-amber-100',
};

/** Apenas cor de texto (para uso fora de badge, ex.: página de detalhe) */
export const MAINTENANCE_TYPE_TEXT_COLORS: Record<MaintenanceType, string> = {
  PREVENTIVE: 'text-emerald-800 dark:text-emerald-100',
  CORRECTIVE: 'text-amber-800 dark:text-amber-100',
};

// =============================================================================
// STATUS DE TROCA POR KM (MAINTENANCE DUE)
// =============================================================================

export const MAINTENANCE_DUE_STATUS = {
  OK: 'ok',
  WARNING: 'warning',
  DUE: 'due',
} as const;

export type MaintenanceDueStatus = (typeof MAINTENANCE_DUE_STATUS)[keyof typeof MAINTENANCE_DUE_STATUS];

export const MAINTENANCE_DUE_STATUS_LABELS: Record<MaintenanceDueStatus, string> = {
  ok: 'No prazo',
  warning: 'Próximo de trocar',
  due: 'Trocar agora',
};

export const MAINTENANCE_DUE_STATUS_COLORS: Record<MaintenanceDueStatus, string> = {
  ok: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  due: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

// =============================================================================
// STATUS ATIVO/INATIVO (GENÉRICO)
// =============================================================================

export const ACTIVE_STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  inactive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

// =============================================================================
// INDICADORES DE ESTOQUE
// =============================================================================

export const STOCK_LEVEL = {
  OK: 'ok',
  LOW: 'low',
  CRITICAL: 'critical',
} as const;

export type StockLevel = (typeof STOCK_LEVEL)[keyof typeof STOCK_LEVEL];

export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  ok: 'Normal',
  low: 'Baixo',
  critical: 'Crítico',
};

export const STOCK_LEVEL_COLORS: Record<StockLevel, string> = {
  ok: 'text-green-600 dark:text-green-400',
  low: 'text-yellow-600 dark:text-yellow-400',
  critical: 'text-red-600 dark:text-red-400',
};

export const STOCK_LEVEL_BG_COLORS: Record<StockLevel, string> = {
  ok: 'bg-green-100 dark:bg-green-900/30',
  low: 'bg-yellow-100 dark:bg-yellow-900/30',
  critical: 'bg-red-100 dark:bg-red-900/30',
};

/**
 * Calcula o nível de estoque baseado na quantidade atual e mínima
 */
export function getStockLevel(quantity: number, minQuantity: number): StockLevel {
  if (minQuantity <= 0) return STOCK_LEVEL.OK;
  if (quantity < minQuantity * 0.5) return STOCK_LEVEL.CRITICAL;
  if (quantity < minQuantity) return STOCK_LEVEL.LOW;
  return STOCK_LEVEL.OK;
}

// =============================================================================
// TIPOS DE MOVIMENTAÇÃO DE ESTOQUE
// =============================================================================

export const STOCK_MOVEMENT_TYPE = {
  ENTRY: 'ENTRY',
  EXIT: 'EXIT',
} as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPE)[keyof typeof STOCK_MOVEMENT_TYPE];

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  ENTRY: 'Entrada',
  EXIT: 'Saída',
};

export const STOCK_MOVEMENT_TYPE_COLORS: Record<StockMovementType, string> = {
  ENTRY: 'text-green-600 dark:text-green-400',
  EXIT: 'text-red-600 dark:text-red-400',
};

export const STOCK_MOVEMENT_TYPE_BG_COLORS: Record<StockMovementType, string> = {
  ENTRY: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  EXIT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

// =============================================================================
// EVENTOS DE MANUTENÇÃO (TIMELINE)
// =============================================================================

export const MAINTENANCE_EVENT = {
  STARTED: 'STARTED',
  PAUSED: 'PAUSED',
  RESUMED: 'RESUMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type MaintenanceEvent = (typeof MAINTENANCE_EVENT)[keyof typeof MAINTENANCE_EVENT];

export const MAINTENANCE_EVENT_LABELS: Record<MaintenanceEvent, string> = {
  STARTED: 'Iniciada',
  PAUSED: 'Pausada',
  RESUMED: 'Retomada',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

// =============================================================================
// STATUS DE CONTAS A PAGAR
// =============================================================================

export const ACCOUNT_PAYABLE_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;

export type AccountPayableStatus = (typeof ACCOUNT_PAYABLE_STATUS)[keyof typeof ACCOUNT_PAYABLE_STATUS];

export const ACCOUNT_PAYABLE_STATUS_LABELS: Record<AccountPayableStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Paga',
  CANCELLED: 'Cancelada',
};

export const ACCOUNT_PAYABLE_STATUS_COLORS: Record<AccountPayableStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

// =============================================================================
// STATUS DE CONTAS A RECEBER
// =============================================================================

export const ACCOUNT_RECEIVABLE_STATUS = {
  PENDING: 'PENDING',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;

export type AccountReceivableStatus = (typeof ACCOUNT_RECEIVABLE_STATUS)[keyof typeof ACCOUNT_RECEIVABLE_STATUS];

export const ACCOUNT_RECEIVABLE_STATUS_LABELS: Record<AccountReceivableStatus, string> = {
  PENDING: 'Pendente',
  RECEIVED: 'Recebida',
  CANCELLED: 'Cancelada',
};

export const ACCOUNT_RECEIVABLE_STATUS_COLORS: Record<AccountReceivableStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

// =============================================================================
// STATUS DE FÉRIAS
// =============================================================================

export const VACATION_STATUS = {
  PLANNED: 'PLANNED',
  APPROVED: 'APPROVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type VacationStatus = (typeof VACATION_STATUS)[keyof typeof VACATION_STATUS];

export const VACATION_STATUS_LABELS: Record<VacationStatus, string> = {
  PLANNED: 'Planejada',
  APPROVED: 'Aprovada',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

export const VACATION_STATUS_COLORS: Record<VacationStatus, string> = {
  PLANNED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  COMPLETED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

// =============================================================================
// TIPOS DE DESPESA
// =============================================================================

export const EXPENSE_TYPE = {
  TRANSPORT: 'TRANSPORT',
  MEAL: 'MEAL',
  ACCOMMODATION: 'ACCOMMODATION',
  OTHER: 'OTHER',
} as const;

export type ExpenseTypeEnum = (typeof EXPENSE_TYPE)[keyof typeof EXPENSE_TYPE];

export const EXPENSE_TYPE_LABELS: Record<ExpenseTypeEnum, string> = {
  TRANSPORT: 'Transporte',
  MEAL: 'Refeição',
  ACCOMMODATION: 'Hospedagem',
  OTHER: 'Outros',
};

export const EXPENSE_TYPE_COLORS: Record<ExpenseTypeEnum, string> = {
  TRANSPORT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  MEAL: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  ACCOMMODATION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

