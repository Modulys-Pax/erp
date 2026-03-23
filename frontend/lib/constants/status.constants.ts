/**
 * Constantes centralizadas de cores e labels de status
 * Usado em todo o sistema para garantir consistência visual
 */

// =============================================================================
// STATUS DE VEÍCULOS
// =============================================================================

// Padronização das cores de status (sem fundos claros)
const STATUS_BLUE =
  'bg-blue-500 !text-blue-800 dark:!bg-blue-900 dark:!text-blue-200';
const STATUS_YELLOW =
  'bg-yellow-500 !text-yellow-800 dark:!bg-amber-900 dark:!text-amber-200';
const STATUS_AMBER =
  'bg-amber-500 !text-amber-800 dark:!bg-amber-900 dark:!text-amber-200';
const STATUS_GREEN =
  'bg-green-500 !text-green-800 dark:!bg-green-900 dark:!text-green-200';
const STATUS_RED =
  'bg-red-500 !text-red-800 dark:!bg-red-900 dark:!text-red-200';
const STATUS_SLATE =
  'bg-slate-500 !text-slate-800 dark:!bg-slate-700 dark:!text-slate-100';
const STATUS_ORANGE =
  'bg-orange-500 !text-orange-800 dark:!bg-orange-900 dark:!text-orange-200';
const STATUS_PURPLE =
  'bg-purple-500 !text-purple-800 dark:!bg-purple-900 dark:!text-purple-200';

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
  ACTIVE: STATUS_BLUE,
  MAINTENANCE: STATUS_YELLOW,
  STOPPED: STATUS_SLATE,
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
  OPEN: STATUS_BLUE,
  IN_PROGRESS: STATUS_YELLOW,
  PAUSED: STATUS_AMBER,
  COMPLETED: STATUS_GREEN,
  CANCELLED: STATUS_RED,
};

export const MAINTENANCE_STATUS_ICON_COLORS: Record<MaintenanceStatus, string> = {
  OPEN: 'text-blue-600 dark:text-blue-400',
  IN_PROGRESS: 'text-yellow-600 dark:text-yellow-400',
  PAUSED: 'text-amber-600 dark:text-amber-400',
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
  PREVENTIVE: 'bg-green-500 dark:bg-green-900/90',
  CORRECTIVE: 'bg-amber-500 dark:bg-amber-900/90',
};

/** Cor do texto em hex + !important para nunca ser sobrescrita por tema/pai */
export const MAINTENANCE_TYPE_TEXT_COLORS: Record<MaintenanceType, string> = {
  PREVENTIVE: '!text-[#065f46] dark:!text-[#a7f3d0]',
  CORRECTIVE: '!text-[#111111] dark:!text-[#fde68a]',
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
  ok: STATUS_GREEN,
  warning: STATUS_YELLOW,
  due: STATUS_RED,
};

// =============================================================================
// STATUS ATIVO/INATIVO (GENÉRICO)
// =============================================================================

export const ACTIVE_STATUS_COLORS = {
  active: STATUS_GREEN,
  inactive: STATUS_RED,
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
  ok: 'bg-green-500 dark:bg-green-900/30',
  low: 'bg-yellow-500 dark:bg-yellow-900/30',
  critical: 'bg-red-500 dark:bg-red-900/30',
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
  ENTRY: STATUS_GREEN,
  EXIT: STATUS_RED,
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
  OVERDUE: 'OVERDUE',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;

export type AccountPayableStatus = (typeof ACCOUNT_PAYABLE_STATUS)[keyof typeof ACCOUNT_PAYABLE_STATUS];

export const ACCOUNT_PAYABLE_STATUS_LABELS: Record<AccountPayableStatus, string> = {
  PENDING: 'Pendente',
  OVERDUE: 'Vencido',
  PAID: 'Paga',
  CANCELLED: 'Cancelada',
};

export const ACCOUNT_PAYABLE_STATUS_COLORS: Record<AccountPayableStatus, string> = {
  PENDING: STATUS_YELLOW,
  OVERDUE: STATUS_RED,
  PAID: STATUS_GREEN,
  CANCELLED: STATUS_RED,
};

// =============================================================================
// STATUS DE CONTAS A RECEBER
// =============================================================================

export const ACCOUNT_RECEIVABLE_STATUS = {
  PENDING: 'PENDING',
  RECEIVED: 'RECEIVED',
  PLANNED: 'PLANNED',
  CANCELLED: 'CANCELLED',
} as const;

export type AccountReceivableStatus = (typeof ACCOUNT_RECEIVABLE_STATUS)[keyof typeof ACCOUNT_RECEIVABLE_STATUS];

export const ACCOUNT_RECEIVABLE_STATUS_LABELS: Record<AccountReceivableStatus, string> = {
  PENDING: 'Pendente',
  RECEIVED: 'Recebida',
  CANCELLED: 'Cancelada',
  PLANNED: 'Planejada',
};

export const ACCOUNT_RECEIVABLE_STATUS_COLORS: Record<AccountReceivableStatus, string> = {
  PENDING: STATUS_YELLOW,
  RECEIVED: STATUS_GREEN,
  CANCELLED: STATUS_RED,
  PLANNED: STATUS_BLUE,
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
  PLANNED: STATUS_BLUE,
  APPROVED: STATUS_GREEN,
  IN_PROGRESS: STATUS_YELLOW,
  COMPLETED: STATUS_SLATE,
  CANCELLED: STATUS_RED,
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
  TRANSPORT: STATUS_BLUE,
  MEAL: STATUS_ORANGE,
  ACCOMMODATION: STATUS_PURPLE,
  OTHER: STATUS_SLATE,
};

// =============================================================================
// STATUS DE FOLHA DE PAGAMENTO
// =============================================================================

export const PAYROLL_STATUS_COLORS: Record<string, string> = {
  PENDING: STATUS_YELLOW,
  PAID: STATUS_GREEN,
  CANCELLED: STATUS_RED,
  created: STATUS_BLUE,
  already_exists: STATUS_GREEN,
  skipped_no_salary: STATUS_SLATE,
};

// =============================================================================
// STATUS DE PEDIDO DE COMPRA
// =============================================================================

export const PURCHASE_ORDER_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUS)[keyof typeof PURCHASE_ORDER_STATUS];

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  PARTIALLY_RECEIVED: 'Parcialmente recebido',
  RECEIVED: 'Recebido',
  CANCELLED: 'Cancelado',
};

export const PURCHASE_ORDER_STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  DRAFT: STATUS_SLATE,
  SENT: STATUS_BLUE,
  PARTIALLY_RECEIVED: STATUS_YELLOW,
  RECEIVED: STATUS_GREEN,
  CANCELLED: STATUS_RED,
};

// =============================================================================
// STATUS DE PEDIDO DE VENDA
// =============================================================================

export const SALES_ORDER_STATUS = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  PARTIALLY_DELIVERED: 'PARTIALLY_DELIVERED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export type SalesOrderStatus = (typeof SALES_ORDER_STATUS)[keyof typeof SALES_ORDER_STATUS];

export const SALES_ORDER_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  DRAFT: 'Rascunho',
  CONFIRMED: 'Confirmado',
  PARTIALLY_DELIVERED: 'Parcialmente entregue',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export const SALES_ORDER_STATUS_COLORS: Record<SalesOrderStatus, string> = {
  DRAFT: STATUS_SLATE,
  CONFIRMED: STATUS_BLUE,
  PARTIALLY_DELIVERED: STATUS_YELLOW,
  DELIVERED: STATUS_GREEN,
  CANCELLED: STATUS_RED,
};

// =============================================================================
// STATUS DE VIAGEM
// =============================================================================

export const TRIP_STATUS_COLORS: Record<string, string> = {
  DRAFT: STATUS_SLATE,
  SCHEDULED: STATUS_BLUE,
  IN_PROGRESS: STATUS_YELLOW,
  COMPLETED: STATUS_GREEN,
  CANCELLED: STATUS_RED,
};

// =============================================================================
// AÇÕES DE AUDITORIA
// =============================================================================

export const AUDIT_ACTION_COLORS: Record<string, string> = {
  // Alto contraste para legibilidade consistente em light/dark no Badge (auditoria).
  CREATE: 'bg-green-900 text-green-50 dark:bg-green-900 dark:text-green-50 border border-transparent',
  UPDATE: 'bg-blue-900 text-blue-50 dark:bg-blue-900 dark:text-blue-50 border border-transparent',
  DELETE: 'bg-red-900 text-red-50 dark:bg-red-900 dark:text-red-50 border border-transparent',
  RESTORE: 'bg-purple-900 text-purple-50 dark:bg-purple-900 dark:text-purple-50 border border-transparent',
  LOGIN: 'bg-amber-900 text-amber-50 dark:bg-amber-900 dark:text-amber-50 border border-transparent',
  LOGOUT: 'bg-amber-900 text-amber-50 dark:bg-amber-900 dark:text-amber-50 border border-transparent',
};

