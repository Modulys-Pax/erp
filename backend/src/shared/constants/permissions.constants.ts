/**
 * Lista completa de permissões do sistema.
 * Cada permissão é identificada pelo padrão: modulo.acao
 *
 * Módulos disponíveis:
 * - vehicles: Veículos
 * - vehicle-brands: Marcas de veículos
 * - vehicle-models: Modelos de veículos
 * - vehicle-documents: Documentos de veículos
 * - vehicle-markings: Marcações de veículos
 * - maintenance: Ordens de manutenção
 * - maintenance-labels: Etiquetas/Registros de troca
 * - employees: Funcionários
 * - employee-benefits: Benefícios de funcionários
 * - benefits: Benefícios
 * - vacations: Férias
 * - payroll: Folha de pagamento
 * - expenses: Despesas/Reembolsos
 * - products: Produtos
 * - stock: Estoque e movimentações
 * - accounts-payable: Contas a pagar
 * - accounts-receivable: Contas a receber
 * - wallet: Carteira da empresa
 * - branches: Filiais
 * - roles: Cargos
 * - users: Usuários
 * - units: Unidades de medida
 * - audit: Auditoria
 */

export interface PermissionDefinition {
  name: string;
  description: string;
  module: string;
  action: string;
}

export interface PermissionModule {
  module: string;
  moduleName: string;
  permissions: PermissionDefinition[];
}

// ============================================
// DEFINIÇÃO DE TODAS AS PERMISSÕES DO SISTEMA
// ============================================

export const PERMISSIONS: PermissionModule[] = [
  // ============================================
  // VEÍCULOS
  // ============================================
  {
    module: 'vehicles',
    moduleName: 'Veículos',
    permissions: [
      {
        name: 'vehicles.view',
        description: 'Visualizar lista de veículos e detalhes',
        module: 'vehicles',
        action: 'view',
      },
      {
        name: 'vehicles.create',
        description: 'Cadastrar novos veículos',
        module: 'vehicles',
        action: 'create',
      },
      {
        name: 'vehicles.update',
        description: 'Editar informações de veículos',
        module: 'vehicles',
        action: 'update',
      },
      {
        name: 'vehicles.delete',
        description: 'Excluir veículos',
        module: 'vehicles',
        action: 'delete',
      },
      {
        name: 'vehicles.update-status',
        description: 'Alterar status de veículos (ativo, manutenção, etc)',
        module: 'vehicles',
        action: 'update-status',
      },
      {
        name: 'vehicles.update-km',
        description: 'Atualizar quilometragem de veículos',
        module: 'vehicles',
        action: 'update-km',
      },
      {
        name: 'vehicles.view-costs',
        description: 'Visualizar custos de manutenção dos veículos',
        module: 'vehicles',
        action: 'view-costs',
      },
    ],
  },

  // ============================================
  // MARCAS DE VEÍCULOS
  // ============================================
  {
    module: 'vehicle-brands',
    moduleName: 'Marcas de Veículos',
    permissions: [
      {
        name: 'vehicle-brands.view',
        description: 'Visualizar marcas de veículos',
        module: 'vehicle-brands',
        action: 'view',
      },
      {
        name: 'vehicle-brands.create',
        description: 'Cadastrar novas marcas',
        module: 'vehicle-brands',
        action: 'create',
      },
      {
        name: 'vehicle-brands.update',
        description: 'Editar marcas de veículos',
        module: 'vehicle-brands',
        action: 'update',
      },
      {
        name: 'vehicle-brands.delete',
        description: 'Excluir marcas de veículos',
        module: 'vehicle-brands',
        action: 'delete',
      },
    ],
  },

  // ============================================
  // MODELOS DE VEÍCULOS
  // ============================================
  {
    module: 'vehicle-models',
    moduleName: 'Modelos de Veículos',
    permissions: [
      {
        name: 'vehicle-models.view',
        description: 'Visualizar modelos de veículos',
        module: 'vehicle-models',
        action: 'view',
      },
      {
        name: 'vehicle-models.create',
        description: 'Cadastrar novos modelos',
        module: 'vehicle-models',
        action: 'create',
      },
      {
        name: 'vehicle-models.update',
        description: 'Editar modelos de veículos',
        module: 'vehicle-models',
        action: 'update',
      },
      {
        name: 'vehicle-models.delete',
        description: 'Excluir modelos de veículos',
        module: 'vehicle-models',
        action: 'delete',
      },
    ],
  },

  // ============================================
  // DOCUMENTOS DE VEÍCULOS
  // ============================================
  {
    module: 'vehicle-documents',
    moduleName: 'Documentos de Veículos',
    permissions: [
      {
        name: 'vehicle-documents.view',
        description: 'Visualizar documentos de veículos',
        module: 'vehicle-documents',
        action: 'view',
      },
      {
        name: 'vehicle-documents.create',
        description: 'Enviar documentos de veículos',
        module: 'vehicle-documents',
        action: 'create',
      },
      {
        name: 'vehicle-documents.update',
        description: 'Editar documentos de veículos',
        module: 'vehicle-documents',
        action: 'update',
      },
      {
        name: 'vehicle-documents.delete',
        description: 'Excluir documentos de veículos',
        module: 'vehicle-documents',
        action: 'delete',
      },
      {
        name: 'vehicle-documents.download',
        description: 'Baixar documentos de veículos',
        module: 'vehicle-documents',
        action: 'download',
      },
    ],
  },

  // ============================================
  // MARCAÇÕES DE VEÍCULOS
  // ============================================
  {
    module: 'vehicle-markings',
    moduleName: 'Marcações de Veículos',
    permissions: [
      {
        name: 'vehicle-markings.view',
        description: 'Visualizar marcações de chegada de veículos',
        module: 'vehicle-markings',
        action: 'view',
      },
      {
        name: 'vehicle-markings.create',
        description: 'Registrar chegada de veículos',
        module: 'vehicle-markings',
        action: 'create',
      },
      {
        name: 'vehicle-markings.delete',
        description: 'Excluir marcações de veículos',
        module: 'vehicle-markings',
        action: 'delete',
      },
    ],
  },

  // ============================================
  // MANUTENÇÃO
  // ============================================
  {
    module: 'maintenance',
    moduleName: 'Manutenção',
    permissions: [
      {
        name: 'maintenance.view',
        description: 'Visualizar ordens de serviço',
        module: 'maintenance',
        action: 'view',
      },
      {
        name: 'maintenance.create',
        description: 'Criar ordens de serviço',
        module: 'maintenance',
        action: 'create',
      },
      {
        name: 'maintenance.update',
        description: 'Editar ordens de serviço',
        module: 'maintenance',
        action: 'update',
      },
      {
        name: 'maintenance.delete',
        description: 'Excluir ordens de serviço',
        module: 'maintenance',
        action: 'delete',
      },
      {
        name: 'maintenance.complete',
        description: 'Finalizar ordens de serviço',
        module: 'maintenance',
        action: 'complete',
      },
      {
        name: 'maintenance.cancel',
        description: 'Cancelar ordens de serviço',
        module: 'maintenance',
        action: 'cancel',
      },
      {
        name: 'maintenance.manage-materials',
        description: 'Adicionar/remover materiais em ordens',
        module: 'maintenance',
        action: 'manage-materials',
      },
      {
        name: 'maintenance.manage-services',
        description: 'Adicionar/remover serviços em ordens',
        module: 'maintenance',
        action: 'manage-services',
      },
      {
        name: 'maintenance.upload-attachment',
        description: 'Enviar anexos em ordens de serviço',
        module: 'maintenance',
        action: 'upload-attachment',
      },
    ],
  },

  // ============================================
  // ETIQUETAS / REGISTROS DE TROCA
  // ============================================
  {
    module: 'maintenance-labels',
    moduleName: 'Etiquetas e Registros na Estrada',
    permissions: [
      {
        name: 'maintenance-labels.view',
        description: 'Visualizar etiquetas e registros de troca',
        module: 'maintenance-labels',
        action: 'view',
      },
      {
        name: 'maintenance-labels.create',
        description: 'Criar etiquetas de manutenção',
        module: 'maintenance-labels',
        action: 'create',
      },
      {
        name: 'maintenance-labels.delete',
        description: 'Excluir etiquetas',
        module: 'maintenance-labels',
        action: 'delete',
      },
      {
        name: 'maintenance-labels.register-change',
        description: 'Registrar trocas na estrada',
        module: 'maintenance-labels',
        action: 'register-change',
      },
    ],
  },

  // ============================================
  // FUNCIONÁRIOS
  // ============================================
  {
    module: 'employees',
    moduleName: 'Funcionários',
    permissions: [
      {
        name: 'employees.view',
        description: 'Visualizar funcionários e dados pessoais',
        module: 'employees',
        action: 'view',
      },
      {
        name: 'employees.create',
        description: 'Cadastrar novos funcionários',
        module: 'employees',
        action: 'create',
      },
      {
        name: 'employees.update',
        description: 'Editar dados de funcionários',
        module: 'employees',
        action: 'update',
      },
      {
        name: 'employees.delete',
        description: 'Excluir/desativar funcionários',
        module: 'employees',
        action: 'delete',
      },
      {
        name: 'employees.view-costs',
        description: 'Visualizar custos e salários de funcionários',
        module: 'employees',
        action: 'view-costs',
      },
    ],
  },

  // ============================================
  // BENEFÍCIOS DE FUNCIONÁRIOS
  // ============================================
  {
    module: 'employee-benefits',
    moduleName: 'Benefícios de Funcionários',
    permissions: [
      {
        name: 'employee-benefits.view',
        description: 'Visualizar benefícios atribuídos a funcionários',
        module: 'employee-benefits',
        action: 'view',
      },
      {
        name: 'employee-benefits.manage',
        description: 'Atribuir/remover benefícios de funcionários',
        module: 'employee-benefits',
        action: 'manage',
      },
    ],
  },

  // ============================================
  // BENEFÍCIOS (CADASTRO)
  // ============================================
  {
    module: 'benefits',
    moduleName: 'Cadastro de Benefícios',
    permissions: [
      {
        name: 'benefits.view',
        description: 'Visualizar benefícios cadastrados',
        module: 'benefits',
        action: 'view',
      },
      {
        name: 'benefits.create',
        description: 'Cadastrar novos benefícios',
        module: 'benefits',
        action: 'create',
      },
      {
        name: 'benefits.update',
        description: 'Editar benefícios',
        module: 'benefits',
        action: 'update',
      },
      {
        name: 'benefits.delete',
        description: 'Excluir benefícios',
        module: 'benefits',
        action: 'delete',
      },
    ],
  },

  // ============================================
  // FÉRIAS
  // ============================================
  {
    module: 'vacations',
    moduleName: 'Férias',
    permissions: [
      {
        name: 'vacations.view',
        description: 'Visualizar férias de funcionários',
        module: 'vacations',
        action: 'view',
      },
      {
        name: 'vacations.create',
        description: 'Registrar férias de funcionários',
        module: 'vacations',
        action: 'create',
      },
      {
        name: 'vacations.update',
        description: 'Editar registros de férias',
        module: 'vacations',
        action: 'update',
      },
      {
        name: 'vacations.delete',
        description: 'Excluir/cancelar férias',
        module: 'vacations',
        action: 'delete',
      },
      {
        name: 'vacations.calculate',
        description: 'Calcular valores de férias',
        module: 'vacations',
        action: 'calculate',
      },
    ],
  },

  // ============================================
  // FOLHA DE PAGAMENTO
  // ============================================
  {
    module: 'payroll',
    moduleName: 'Folha de Pagamento',
    permissions: [
      {
        name: 'payroll.view',
        description: 'Visualizar folha de pagamento',
        module: 'payroll',
        action: 'view',
      },
      {
        name: 'payroll.process',
        description: 'Processar folha de pagamento',
        module: 'payroll',
        action: 'process',
      },
    ],
  },

  // ============================================
  // DESPESAS / REEMBOLSOS
  // ============================================
  {
    module: 'expenses',
    moduleName: 'Despesas e Reembolsos',
    permissions: [
      {
        name: 'expenses.view',
        description: 'Visualizar despesas e reembolsos',
        module: 'expenses',
        action: 'view',
      },
      {
        name: 'expenses.create',
        description: 'Registrar despesas/reembolsos',
        module: 'expenses',
        action: 'create',
      },
      {
        name: 'expenses.update',
        description: 'Editar despesas/reembolsos',
        module: 'expenses',
        action: 'update',
      },
      {
        name: 'expenses.delete',
        description: 'Excluir despesas/reembolsos',
        module: 'expenses',
        action: 'delete',
      },
      {
        name: 'expenses.approve',
        description: 'Aprovar/rejeitar reembolsos',
        module: 'expenses',
        action: 'approve',
      },
    ],
  },

  // ============================================
  // PRODUTOS
  // ============================================
  {
    module: 'products',
    moduleName: 'Produtos',
    permissions: [
      {
        name: 'products.view',
        description: 'Visualizar produtos cadastrados',
        module: 'products',
        action: 'view',
      },
      {
        name: 'products.create',
        description: 'Cadastrar novos produtos',
        module: 'products',
        action: 'create',
      },
      {
        name: 'products.update',
        description: 'Editar produtos',
        module: 'products',
        action: 'update',
      },
      {
        name: 'products.delete',
        description: 'Excluir produtos',
        module: 'products',
        action: 'delete',
      },
    ],
  },

  // ============================================
  // ESTOQUE
  // ============================================
  {
    module: 'stock',
    moduleName: 'Estoque',
    permissions: [
      {
        name: 'stock.view',
        description: 'Visualizar estoque e movimentações',
        module: 'stock',
        action: 'view',
      },
      {
        name: 'stock.create-movement',
        description: 'Registrar movimentações de estoque (entrada/saída)',
        module: 'stock',
        action: 'create-movement',
      },
      {
        name: 'stock.adjust',
        description: 'Ajustar quantidades de estoque',
        module: 'stock',
        action: 'adjust',
      },
    ],
  },

  // ============================================
  // CONTAS A PAGAR
  // ============================================
  {
    module: 'accounts-payable',
    moduleName: 'Contas a Pagar',
    permissions: [
      {
        name: 'accounts-payable.view',
        description: 'Visualizar contas a pagar',
        module: 'accounts-payable',
        action: 'view',
      },
      {
        name: 'accounts-payable.create',
        description: 'Cadastrar contas a pagar',
        module: 'accounts-payable',
        action: 'create',
      },
      {
        name: 'accounts-payable.update',
        description: 'Editar contas a pagar',
        module: 'accounts-payable',
        action: 'update',
      },
      {
        name: 'accounts-payable.delete',
        description: 'Excluir contas a pagar',
        module: 'accounts-payable',
        action: 'delete',
      },
      {
        name: 'accounts-payable.pay',
        description: 'Marcar contas como pagas',
        module: 'accounts-payable',
        action: 'pay',
      },
      {
        name: 'accounts-payable.view-summary',
        description: 'Visualizar resumo financeiro',
        module: 'accounts-payable',
        action: 'view-summary',
      },
    ],
  },

  // ============================================
  // CONTAS A RECEBER
  // ============================================
  {
    module: 'accounts-receivable',
    moduleName: 'Contas a Receber',
    permissions: [
      {
        name: 'accounts-receivable.view',
        description: 'Visualizar contas a receber',
        module: 'accounts-receivable',
        action: 'view',
      },
      {
        name: 'accounts-receivable.create',
        description: 'Cadastrar contas a receber',
        module: 'accounts-receivable',
        action: 'create',
      },
      {
        name: 'accounts-receivable.update',
        description: 'Editar contas a receber',
        module: 'accounts-receivable',
        action: 'update',
      },
      {
        name: 'accounts-receivable.delete',
        description: 'Excluir contas a receber',
        module: 'accounts-receivable',
        action: 'delete',
      },
      {
        name: 'accounts-receivable.receive',
        description: 'Marcar contas como recebidas',
        module: 'accounts-receivable',
        action: 'receive',
      },
    ],
  },

  // ============================================
  // PEDIDOS DE COMPRA
  // ============================================
  {
    module: 'purchase-orders',
    moduleName: 'Pedidos de Compra',
    permissions: [
      {
        name: 'purchase-orders.view',
        description: 'Visualizar pedidos de compra',
        module: 'purchase-orders',
        action: 'view',
      },
      {
        name: 'purchase-orders.create',
        description: 'Criar pedidos de compra',
        module: 'purchase-orders',
        action: 'create',
      },
      {
        name: 'purchase-orders.update',
        description: 'Editar pedidos de compra',
        module: 'purchase-orders',
        action: 'update',
      },
      {
        name: 'purchase-orders.delete',
        description: 'Excluir pedidos de compra',
        module: 'purchase-orders',
        action: 'delete',
      },
      {
        name: 'purchase-orders.receive',
        description: 'Registrar recebimento de pedido',
        module: 'purchase-orders',
        action: 'receive',
      },
    ],
  },

  // ============================================
  // PEDIDOS DE VENDA
  // ============================================
  {
    module: 'sales-orders',
    moduleName: 'Pedidos de Venda',
    permissions: [
      {
        name: 'sales-orders.view',
        description: 'Visualizar pedidos de venda',
        module: 'sales-orders',
        action: 'view',
      },
      {
        name: 'sales-orders.create',
        description: 'Criar pedidos de venda',
        module: 'sales-orders',
        action: 'create',
      },
      {
        name: 'sales-orders.update',
        description: 'Editar pedidos de venda',
        module: 'sales-orders',
        action: 'update',
      },
      {
        name: 'sales-orders.delete',
        description: 'Excluir pedidos de venda',
        module: 'sales-orders',
        action: 'delete',
      },
      {
        name: 'sales-orders.invoice',
        description: 'Faturar pedido (gerar CR e baixa de estoque)',
        module: 'sales-orders',
        action: 'invoice',
      },
    ],
  },

  // ============================================
  // CARTEIRA DA EMPRESA
  // ============================================
  {
    module: 'wallet',
    moduleName: 'Carteira da Empresa',
    permissions: [
      {
        name: 'wallet.view',
        description: 'Visualizar saldo e movimentações da carteira',
        module: 'wallet',
        action: 'view',
      },
      {
        name: 'wallet.adjust',
        description: 'Ajustar saldo manualmente',
        module: 'wallet',
        action: 'adjust',
      },
      {
        name: 'wallet.view-history',
        description: 'Visualizar histórico de ajustes',
        module: 'wallet',
        action: 'view-history',
      },
    ],
  },

  // ============================================
  // FORNECEDORES
  // ============================================
  {
    module: 'suppliers',
    moduleName: 'Fornecedores',
    permissions: [
      {
        name: 'suppliers.view',
        description: 'Visualizar fornecedores',
        module: 'suppliers',
        action: 'view',
      },
      {
        name: 'suppliers.create',
        description: 'Cadastrar fornecedores',
        module: 'suppliers',
        action: 'create',
      },
      {
        name: 'suppliers.update',
        description: 'Editar fornecedores',
        module: 'suppliers',
        action: 'update',
      },
      {
        name: 'suppliers.delete',
        description: 'Excluir fornecedores',
        module: 'suppliers',
        action: 'delete',
      },
    ],
  },

  // ============================================
  // CLIENTES
  // ============================================
  {
    module: 'customers',
    moduleName: 'Clientes',
    permissions: [
      {
        name: 'customers.view',
        description: 'Visualizar clientes',
        module: 'customers',
        action: 'view',
      },
      {
        name: 'customers.create',
        description: 'Cadastrar clientes',
        module: 'customers',
        action: 'create',
      },
      {
        name: 'customers.update',
        description: 'Editar clientes',
        module: 'customers',
        action: 'update',
      },
      {
        name: 'customers.delete',
        description: 'Excluir clientes',
        module: 'customers',
        action: 'delete',
      },
    ],
  },

  // ============================================
  // CENTROS DE CUSTO
  // ============================================
  {
    module: 'cost-centers',
    moduleName: 'Centros de Custo',
    permissions: [
      {
        name: 'cost-centers.view',
        description: 'Visualizar centros de custo',
        module: 'cost-centers',
        action: 'view',
      },
      {
        name: 'cost-centers.create',
        description: 'Cadastrar centros de custo',
        module: 'cost-centers',
        action: 'create',
      },
      {
        name: 'cost-centers.update',
        description: 'Editar centros de custo',
        module: 'cost-centers',
        action: 'update',
      },
      {
        name: 'cost-centers.delete',
        description: 'Excluir centros de custo',
        module: 'cost-centers',
        action: 'delete',
      },
    ],
  },

  // ============================================
  // DOCUMENTOS FISCAIS (Fase 2 - rastreabilidade)
  // ============================================
  {
    module: 'fiscal-documents',
    moduleName: 'Documentos Fiscais',
    permissions: [
      {
        name: 'fiscal-documents.view',
        description: 'Visualizar documentos fiscais',
        module: 'fiscal-documents',
        action: 'view',
      },
      {
        name: 'fiscal-documents.create',
        description: 'Cadastrar documentos fiscais',
        module: 'fiscal-documents',
        action: 'create',
      },
      {
        name: 'fiscal-documents.update',
        description: 'Editar documentos fiscais',
        module: 'fiscal-documents',
        action: 'update',
      },
      {
        name: 'fiscal-documents.delete',
        description: 'Excluir documentos fiscais',
        module: 'fiscal-documents',
        action: 'delete',
      },
    ],
  },

  // ============================================
  // CONCILIAÇÃO BANCÁRIA (Fase 3)
  // ============================================
  {
    module: 'bank-reconciliation',
    moduleName: 'Conciliação Bancária',
    permissions: [
      {
        name: 'bank-reconciliation.view',
        description: 'Visualizar extratos e itens de conciliação',
        module: 'bank-reconciliation',
        action: 'view',
      },
      {
        name: 'bank-reconciliation.manage',
        description: 'Criar extrato, lançar itens e conciliar',
        module: 'bank-reconciliation',
        action: 'manage',
      },
    ],
  },

  // ============================================
  // FILIAIS
  // ============================================
  {
    module: 'branches',
    moduleName: 'Filiais',
    permissions: [
      {
        name: 'branches.view',
        description: 'Visualizar filiais',
        module: 'branches',
        action: 'view',
      },
      {
        name: 'branches.create',
        description: 'Cadastrar novas filiais',
        module: 'branches',
        action: 'create',
      },
      {
        name: 'branches.update',
        description: 'Editar filiais',
        module: 'branches',
        action: 'update',
      },
      {
        name: 'branches.delete',
        description: 'Excluir filiais',
        module: 'branches',
        action: 'delete',
      },
    ],
  },

  // ============================================
  // CARGOS
  // ============================================
  {
    module: 'roles',
    moduleName: 'Cargos',
    permissions: [
      {
        name: 'roles.view',
        description: 'Visualizar cargos',
        module: 'roles',
        action: 'view',
      },
      {
        name: 'roles.create',
        description: 'Cadastrar novos cargos',
        module: 'roles',
        action: 'create',
      },
      {
        name: 'roles.update',
        description: 'Editar cargos e permissões',
        module: 'roles',
        action: 'update',
      },
      {
        name: 'roles.delete',
        description: 'Excluir cargos',
        module: 'roles',
        action: 'delete',
      },
    ],
  },

  // ============================================
  // USUÁRIOS
  // ============================================
  {
    module: 'users',
    moduleName: 'Usuários',
    permissions: [
      {
        name: 'users.view',
        description: 'Visualizar usuários do sistema',
        module: 'users',
        action: 'view',
      },
      {
        name: 'users.create',
        description: 'Criar novos usuários',
        module: 'users',
        action: 'create',
      },
      {
        name: 'users.update',
        description: 'Editar usuários',
        module: 'users',
        action: 'update',
      },
      {
        name: 'users.delete',
        description: 'Excluir/desativar usuários',
        module: 'users',
        action: 'delete',
      },
    ],
  },

  // ============================================
  // UNIDADES DE MEDIDA
  // ============================================
  {
    module: 'units',
    moduleName: 'Unidades de Medida',
    permissions: [
      {
        name: 'units.view',
        description: 'Visualizar unidades de medida',
        module: 'units',
        action: 'view',
      },
      {
        name: 'units.create',
        description: 'Cadastrar unidades de medida',
        module: 'units',
        action: 'create',
      },
      {
        name: 'units.update',
        description: 'Editar unidades de medida',
        module: 'units',
        action: 'update',
      },
      {
        name: 'units.delete',
        description: 'Excluir unidades de medida',
        module: 'units',
        action: 'delete',
      },
    ],
  },

  // ============================================
  // AUDITORIA
  // ============================================
  {
    module: 'audit',
    moduleName: 'Auditoria',
    permissions: [
      {
        name: 'audit.view',
        description: 'Visualizar logs de auditoria',
        module: 'audit',
        action: 'view',
      },
    ],
  },

  // ============================================
  // DASHBOARD
  // ============================================
  {
    module: 'dashboard',
    moduleName: 'Dashboard',
    permissions: [
      {
        name: 'dashboard.view',
        description: 'Visualizar dashboard e métricas',
        module: 'dashboard',
        action: 'view',
      },
    ],
  },
];

/**
 * Lista flat de todas as permissões para facilitar operações
 */
export const ALL_PERMISSIONS: PermissionDefinition[] = PERMISSIONS.flatMap(
  (module) => module.permissions,
);

/**
 * Obter permissão por nome
 */
export function getPermissionByName(name: string): PermissionDefinition | undefined {
  return ALL_PERMISSIONS.find((p) => p.name === name);
}

/**
 * Obter todas as permissões de um módulo
 */
export function getPermissionsByModule(module: string): PermissionDefinition[] {
  return ALL_PERMISSIONS.filter((p) => p.module === module);
}
