import { PrismaClient, Prisma, Company, Branch, Role, Permission, User, Product, Employee, Vehicle, Warehouse, Stock, MaintenanceOrder, StockMovement, FinancialTransaction, AccountPayable, AccountReceivable, Salary, Vacation, Expense, AuditLog, UnitOfMeasurement } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { ALL_PERMISSIONS } from '../src/shared/constants/permissions.constants';

const prisma = new PrismaClient();

/** Módulos para o perfil Financeiro (cargo financeiro) */
const FINANCEIRO_MODULES = new Set([
  'wallet', 'expenses', 'accounts-payable', 'accounts-receivable', 'purchase-orders',
  'sales-orders', 'fiscal-documents', 'bank-reconciliation', 'reports', 'dashboard',
  'cost-centers', 'suppliers', 'customers',
]);

/** Módulos para o perfil Operacional (cargo operacao) */
const OPERACIONAL_MODULES = new Set([
  'trips', 'vehicles', 'vehicle-brands', 'vehicle-models', 'vehicle-documents',
  'vehicle-markings', 'maintenance', 'maintenance-labels', 'products', 'stock',
  'dashboard', 'reports',
]);

// ID da empresa padrão (será preenchido após criação)
let DEFAULT_COMPANY_ID = 'a4771684-cd63-4ecd-8771-545ddb937278';

// Função auxiliar para gerar datas aleatórias
function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

// Função auxiliar para gerar números aleatórios
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Função auxiliar para gerar valores decimais
function randomDecimal(min: number, max: number, decimals = 2): Prisma.Decimal {
  const value = Math.random() * (max - min) + min;
  return new Prisma.Decimal(value.toFixed(decimals));
}

// Volume mínimo "grande" para a seed (pedido do usuário).
// Pode ser sobrescrito via env `SEED_VOLUME_MIN`.
const SEED_VOLUME_MIN = parseInt(process.env.SEED_VOLUME_MIN || '30', 10);

async function main() {
  console.log('🌱 Iniciando seed completo...\n');

  // Limpar dados existentes (cuidado em produção!)
  console.log('🧹 Limpando dados existentes...');
  await prisma.auditLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.vacation.deleteMany();
  await prisma.salary.deleteMany();
  await prisma.fiscalDocument.deleteMany();
  await prisma.tripExpense.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.tripExpenseType.deleteMany();
  await prisma.accountReceivable.deleteMany();
  await prisma.accountPayable.deleteMany();
  await prisma.financialTransaction.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.maintenanceTimeline.deleteMany();
  await prisma.maintenanceMaterial.deleteMany();
  await prisma.maintenanceService.deleteMany();
  await prisma.maintenanceWorker.deleteMany();
  await prisma.maintenanceOrder.deleteMany();
  // Módulos adicionais para "mega seed"
  await prisma.maintenanceLabelReplacementItem.deleteMany();
  await prisma.maintenanceLabelVehicle.deleteMany();
  await prisma.maintenanceLabel.deleteMany();
  await prisma.vehicleMarkingVehicle.deleteMany();
  await prisma.vehicleMarking.deleteMany();
  await prisma.vehicleReplacementItem.deleteMany();
  await prisma.vehicleDocument.deleteMany();
  await prisma.vehicleStatusHistory.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.costCenter.deleteMany();
  await prisma.bankStatementItem.deleteMany();
  await prisma.bankStatement.deleteMany();
  await prisma.balanceAdjustment.deleteMany();
  await prisma.branchBalance.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.company.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.unitOfMeasurement.deleteMany();
  console.log('✅ Dados limpos\n');

  // ============================================
  // ROLES E PERMISSÕES
  // ============================================
  console.log('👥 Criando roles e permissões...');

  const roles = [
    { name: 'admin', description: 'Administrador do sistema' },
    { name: 'gerente', description: 'Gerente geral' },
    { name: 'financeiro', description: 'Usuário do módulo financeiro' },
    { name: 'operacao', description: 'Usuário de operação' },
    { name: 'rh', description: 'Recursos humanos' },
    { name: 'manutencao', description: 'Mecânico/manutenção' },
  ];

  const createdRoles: Role[] = [];
  for (const roleData of roles) {
    const role = await prisma.role.create({
      data: roleData,
    });
    createdRoles.push(role);
  }
  console.log(`✅ ${createdRoles.length} roles criadas`);

  // Sincronizar permissões do sistema (permissions.constants) e associar aos cargos
  console.log('🔐 Sincronizando permissões e associando aos cargos...');
  for (const p of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description, module: p.module, action: p.action },
      create: {
        name: p.name,
        description: p.description,
        module: p.module,
        action: p.action,
      },
    });
  }
  const allPermissions: Permission[] = await prisma.permission.findMany();
  console.log(`✅ ${allPermissions.length} permissões sincronizadas`);

  const adminRole = createdRoles.find((r) => r.name === 'admin');
  const financeiroRole = createdRoles.find((r) => r.name === 'financeiro');
  const operacaoRole = createdRoles.find((r) => r.name === 'operacao');

  if (adminRole) {
    await prisma.rolePermission.createMany({
      data: allPermissions.map((perm) => ({
        roleId: adminRole.id,
        permissionId: perm.id,
      })),
    });
    console.log(`   Admin: ${allPermissions.length} permissões`);
  }
  if (financeiroRole) {
    const permIds = allPermissions
      .filter((perm) => FINANCEIRO_MODULES.has(perm.module))
      .map((perm) => ({ roleId: financeiroRole.id, permissionId: perm.id }));
    if (permIds.length > 0) {
      await prisma.rolePermission.createMany({ data: permIds });
    }
    console.log(`   Financeiro: ${permIds.length} permissões`);
  }
  if (operacaoRole) {
    const permIds = allPermissions
      .filter((perm) => OPERACIONAL_MODULES.has(perm.module))
      .map((perm) => ({ roleId: operacaoRole.id, permissionId: perm.id }));
    if (permIds.length > 0) {
      await prisma.rolePermission.createMany({ data: permIds });
    }
    console.log(`   Operação: ${permIds.length} permissões`);
  }
  console.log('');

  // ============================================
  // UNIDADES DE MEDIDA
  // ============================================
  console.log('📏 Criando unidades de medida...');

  const unitsOfMeasurement = [
    { code: 'L', name: 'Litros', description: 'Unidade de medida para líquidos' },
    { code: 'KG', name: 'Quilogramas', description: 'Unidade de medida para peso/massa' },
    { code: 'UN', name: 'Unidade', description: 'Unidade de medida padrão para contagem' },
  ];

  const createdUnitsOfMeasurement: UnitOfMeasurement[] = [];
  for (const unitData of unitsOfMeasurement) {
    const unit = await prisma.unitOfMeasurement.create({
      data: unitData,
    });
    createdUnitsOfMeasurement.push(unit);
  }
  console.log(`✅ ${createdUnitsOfMeasurement.length} unidades de medida criadas\n`);

  // ============================================
  // EMPRESA PADRÃO (SINGLE-TENANT)
  // ============================================
  console.log('🏢 Criando empresa padrão do sistema...');

  // Criar única empresa do sistema
  const defaultCompany = await prisma.company.upsert({
    where: { cnpj: '00000000000000' },
    update: {},
    create: {
      name: 'Empresa X',
      cnpj: '00000000000000',
      tradeName: 'Empresa X',
      email: 'contato@empresax.com.br',
      phone: '(11) 3456-7890',
      address: 'Endereço da Empresa X',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '00000-000',
    },
  });

  DEFAULT_COMPANY_ID = defaultCompany.id;
  console.log(`✅ Empresa padrão criada: ${defaultCompany.name} (ID: ${DEFAULT_COMPANY_ID})`);

  // Criar filiais para a empresa padrão
  const branchesData = [
    {
      name: 'Filial Matriz',
      code: 'MATRIZ',
      email: 'matriz@empresax.com.br',
      phone: '(11) 3456-7890',
      address: 'Endereço da Matriz',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '00000-000',
    },
    {
      name: 'Filial Norte',
      code: 'NORTE',
      email: 'norte@empresax.com.br',
      phone: '(11) 3456-7891',
      address: 'Endereço da Filial Norte',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '00000-001',
    },
    {
      name: 'Filial Sul',
      code: 'SUL',
      email: 'sul@empresax.com.br',
      phone: '(11) 3456-7892',
      address: 'Endereço da Filial Sul',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '00000-002',
    },
  ];

  const createdBranches: Branch[] = [];
  for (const branchData of branchesData) {
    const branch = await prisma.branch.create({
      data: {
        ...branchData,
        companyId: DEFAULT_COMPANY_ID,
      },
    });
    createdBranches.push(branch);
  }

  console.log(`✅ ${createdBranches.length} filiais criadas\n`);

  // Salvar DEFAULT_COMPANY_ID em arquivo de constantes
  const constantsPath = path.join(__dirname, '../src/shared/constants/company.constants.ts');
  const constantsContent = `/**
 * Constante da Empresa Padrão do Sistema
 * 
 * Esta constante armazena o ID da empresa única do sistema.
 * O sistema funciona como single-tenant, mas está preparado
 * para se tornar SaaS no futuro.
 * 
 * IMPORTANTE: Este ID é fixo e deve ser usado em todos os
 * services e repositories que precisam de empresa_id.
 * 
 * Este arquivo é gerado automaticamente pelo seed.
 * NÃO edite manualmente.
 */

export const DEFAULT_COMPANY_ID = '${DEFAULT_COMPANY_ID}';

/**
 * Valida se o DEFAULT_COMPANY_ID está configurado
 */
export function validateDefaultCompanyId(): void {
  if (!DEFAULT_COMPANY_ID) {
    throw new Error(
      'DEFAULT_COMPANY_ID não está configurado. Execute o seed primeiro.',
    );
  }
}
`;

  fs.writeFileSync(constantsPath, constantsContent, 'utf-8');
  console.log(`✅ Constante DEFAULT_COMPANY_ID salva: ${DEFAULT_COMPANY_ID}\n`);

  // ============================================
  // TIPOS DE DESPESA DE VIAGEM
  // ============================================
  console.log('🚛 Criando tipos de despesa de viagem...');
  const tripExpenseTypeNames = [
    'Combustível',
    'Pedágio',
    'Alimentação',
    'Hospedagem',
    'Manutenção emergencial',
    'Outros',
  ];
  for (const branch of createdBranches) {
    for (const name of tripExpenseTypeNames) {
      await prisma.tripExpenseType.create({
        data: {
          name,
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
        },
      });
    }
  }
  console.log(`✅ Tipos de despesa de viagem criados por filial\n`);

  // ============================================
  // USUÁRIOS
  // ============================================
  console.log('👤 Criando usuários...');

  const hashedPassword = await bcrypt.hash('senha123', 10);
  const usersData = [
    // Admin
    {
      email: 'admin@erp.com',
      password: hashedPassword,
      name: 'Administrador Sistema',
      role: 'admin',
      companyId: null,
      branchId: null,
    },
    // Gerentes
    {
      email: 'gerente1@empresax.com',
      password: hashedPassword,
      name: 'João Silva',
      role: 'gerente',
      companyId: DEFAULT_COMPANY_ID,
      branchId: createdBranches[0].id,
    },
    {
      email: 'gerente2@empresax.com',
      password: hashedPassword,
      name: 'Maria Santos',
      role: 'gerente',
      companyId: DEFAULT_COMPANY_ID,
      branchId: createdBranches[1]?.id || createdBranches[0].id,
    },
    // Financeiro
    {
      email: 'financeiro1@empresax.com',
      password: hashedPassword,
      name: 'Carlos Oliveira',
      role: 'financeiro',
      companyId: DEFAULT_COMPANY_ID,
      branchId: createdBranches[0].id,
    },
    {
      email: 'financeiro2@empresax.com',
      password: hashedPassword,
      name: 'Ana Costa',
      role: 'financeiro',
      companyId: DEFAULT_COMPANY_ID,
      branchId: createdBranches[1]?.id || createdBranches[0].id,
    },
    // Operação
    {
      email: 'operacao1@empresax.com',
      password: hashedPassword,
      name: 'Pedro Alves',
      role: 'operacao',
      companyId: DEFAULT_COMPANY_ID,
      branchId: createdBranches[0].id,
    },
    {
      email: 'operacao2@empresax.com',
      password: hashedPassword,
      name: 'Fernanda Lima',
      role: 'operacao',
      companyId: DEFAULT_COMPANY_ID,
      branchId: createdBranches[1]?.id || createdBranches[0].id,
    },
    // RH
    {
      email: 'rh1@empresax.com',
      password: hashedPassword,
      name: 'Juliana Ferreira',
      role: 'rh',
      companyId: DEFAULT_COMPANY_ID,
      branchId: createdBranches[0].id,
    },
    // Manutenção
    {
      email: 'manutencao1@empresax.com',
      password: hashedPassword,
      name: 'Marcos Souza',
      role: 'manutencao',
      companyId: DEFAULT_COMPANY_ID,
      branchId: createdBranches[0].id,
    },
    {
      email: 'manutencao2@empresax.com',
      password: hashedPassword,
      name: 'Lucas Pereira',
      role: 'manutencao',
      companyId: DEFAULT_COMPANY_ID,
      branchId: createdBranches[0].id,
    },
  ];

  const createdUsers: User[] = [];
  for (const userData of usersData) {
    const role = createdRoles.find((r) => r.name === userData.role);
    if (!role) continue;

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: userData.password,
        name: userData.name,
        roleId: role.id,
        companyId: userData.companyId || undefined,
        branchId: userData.branchId || undefined,
      },
    });
    createdUsers.push(user);
  }
  console.log(`✅ ${createdUsers.length} usuários criados`);
  console.log('📧 Todos os usuários têm senha: senha123\n');

  // ============================================
  // PRODUTOS
  // ============================================
  console.log('📦 Criando produtos...');

  const productsData = [
    { name: 'Óleo Motor 15W40', code: 'PROD001', unit: 'L', unitPrice: 28.50, description: 'Óleo lubrificante para motor' },
    { name: 'Filtro de Óleo', code: 'PROD002', unit: 'UN', unitPrice: 45.00, description: 'Filtro de óleo automotivo' },
    { name: 'Filtro de Ar', code: 'PROD003', unit: 'UN', unitPrice: 35.00, description: 'Filtro de ar para motor' },
    { name: 'Pastilha de Freio', code: 'PROD004', unit: 'UN', unitPrice: 120.00, description: 'Pastilha de freio dianteira' },
    { name: 'Disco de Freio', code: 'PROD005', unit: 'UN', unitPrice: 280.00, description: 'Disco de freio dianteiro' },
    { name: 'Pneu 275/80R22.5', code: 'PROD006', unit: 'UN', unitPrice: 850.00, description: 'Pneu para caminhão' },
    { name: 'Bateria 12V 200Ah', code: 'PROD007', unit: 'UN', unitPrice: 450.00, description: 'Bateria automotiva' },
    { name: 'Radiador', code: 'PROD008', unit: 'UN', unitPrice: 320.00, description: 'Radiador de água' },
    { name: 'Correia Dentada', code: 'PROD009', unit: 'UN', unitPrice: 95.00, description: 'Correia dentada do motor' },
    { name: 'Vela de Ignição', code: 'PROD010', unit: 'UN', unitPrice: 25.00, description: 'Vela de ignição' },
    { name: 'Fluido de Freio', code: 'PROD011', unit: 'L', unitPrice: 18.50, description: 'Fluido de freio DOT 4' },
    { name: 'Aditivo Radiador', code: 'PROD012', unit: 'L', unitPrice: 12.00, description: 'Aditivo para radiador' },
    { name: 'Limpador de Para-brisa', code: 'PROD013', unit: 'UN', unitPrice: 35.00, description: 'Palheta de limpador' },
    { name: 'Lâmpada H7', code: 'PROD014', unit: 'UN', unitPrice: 28.00, description: 'Lâmpada farol H7' },
    { name: 'Fusível 15A', code: 'PROD015', unit: 'UN', unitPrice: 3.50, description: 'Fusível automotivo 15A' },
    { name: 'Cabo de Vela', code: 'PROD016', unit: 'UN', unitPrice: 55.00, description: 'Cabo de vela de ignição' },
    { name: 'Bomba de Combustível', code: 'PROD017', unit: 'UN', unitPrice: 380.00, description: 'Bomba elétrica de combustível' },
    { name: 'Filtro de Combustível', code: 'PROD018', unit: 'UN', unitPrice: 65.00, description: 'Filtro de combustível' },
    { name: 'Amortecedor Dianteiro', code: 'PROD019', unit: 'UN', unitPrice: 420.00, description: 'Amortecedor dianteiro' },
    { name: 'Mola Suspensão', code: 'PROD020', unit: 'UN', unitPrice: 350.00, description: 'Mola de suspensão' },
  ];

  const createdProducts: Product[] = [];
  for (const branch of createdBranches) {
    for (const productData of productsData) {
      const product = await prisma.product.create({
        data: {
          ...productData,
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
        },
      });
      createdProducts.push(product);
    }
  }
  console.log(`✅ ${createdProducts.length} produtos criados\n`);

  // ============================================
  // FUNCIONÁRIOS
  // ============================================
  console.log('👷 Criando funcionários...');

  const employeesNames = [
    'José da Silva', 'Maria Oliveira', 'João Santos', 'Ana Costa', 'Pedro Alves',
    'Fernanda Lima', 'Carlos Souza', 'Juliana Ferreira', 'Roberto Martins', 'Marcos Pereira',
    'Luciana Rocha', 'Paulo Rodrigues', 'Cristina Nunes', 'Ricardo Barbosa', 'Patricia Gomes',
    'Felipe Araújo', 'Renata Dias', 'Bruno Carvalho', 'Camila Ribeiro', 'Thiago Monteiro',
  ];

  const positions = [
    'Motorista', 'Mecânico', 'Auxiliar de Mecânico', 'Supervisor de Frota',
    'Operador de Logística', 'Auxiliar Administrativo', 'Gerente de Operações',
  ];

  const departments = ['Operação', 'Manutenção', 'Administrativo', 'Logística', 'RH'];

  // Função para obter salário baseado no cargo
  function getSalaryByPosition(position: string): number {
    const salaryRanges: { [key: string]: [number, number] } = {
      'Motorista': [3500, 4500],
      'Mecânico': [4000, 5500],
      'Auxiliar de Mecânico': [2500, 3200],
      'Supervisor de Frota': [5500, 7000],
      'Operador de Logística': [2800, 3800],
      'Auxiliar Administrativo': [2200, 3000],
      'Gerente de Operações': [8000, 12000],
    };
    const range = salaryRanges[position] || [2500, 4000];
    const value = Math.random() * (range[1] - range[0]) + range[0];
    return Number(value.toFixed(2));
  }

  const createdEmployees: Employee[] = [];
  for (const branch of createdBranches) {
    const employeesPerBranch = randomInt(SEED_VOLUME_MIN, SEED_VOLUME_MIN + 5);
    for (let i = 0; i < employeesPerBranch; i++) {
      const name = employeesNames[Math.floor(Math.random() * employeesNames.length)];
      const cpf = `${randomInt(100, 999)}.${randomInt(100, 999)}.${randomInt(100, 999)}-${randomInt(10, 99)}`;
      const position = positions[Math.floor(Math.random() * positions.length)];
      const monthlySalary = getSalaryByPosition(position);
      
      const employeeData: any = {
        name,
        cpf,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@empresax.com.br`,
        phone: `(${randomInt(11, 99)}) ${randomInt(3000, 9999)}-${randomInt(1000, 9999)}`,
        position,
        department: departments[Math.floor(Math.random() * departments.length)],
        hireDate: randomDate(new Date(2020, 0, 1), new Date(2024, 11, 31)),
        companyId: DEFAULT_COMPANY_ID,
        branchId: branch.id,
      };

      if (monthlySalary > 0) {
        employeeData.monthlySalary = new Prisma.Decimal(monthlySalary);
      }

      const employee = await prisma.employee.create({
        data: employeeData,
      });
      createdEmployees.push(employee);
    }
  }
  console.log(`✅ ${createdEmployees.length} funcionários criados\n`);

  // ============================================
  // CATÁLOGO DE BENEFÍCIOS
  // ============================================
  console.log('🎁 Criando catálogo de benefícios...');

  const benefitTypes = ['TRANSPORT_VOUCHER', 'MEAL_VOUCHER', 'HEALTH_INSURANCE', 'DENTAL_INSURANCE', 'LIFE_INSURANCE'] as const;
  const benefitNames: { [key: string]: string[] } = {
    TRANSPORT_VOUCHER: ['Vale Transporte', 'VT Mensal'],
    MEAL_VOUCHER: ['Vale Refeição', 'VR Mensal', 'Vale Alimentação'],
    HEALTH_INSURANCE: ['Plano de Saúde Unimed', 'Plano de Saúde Bradesco', 'Plano de Saúde SulAmérica'],
    DENTAL_INSURANCE: ['Plano Odontológico', 'Dental Unimed'],
    LIFE_INSURANCE: ['Seguro de Vida', 'Seguro de Vida Grupo'],
  };

  // Custo diário e valor do funcionário por tipo de benefício
  const benefitDailyCosts: { [key: string]: [number, number] } = {
    TRANSPORT_VOUCHER: [5.0, 7.0], // R$ 5-7 por dia
    MEAL_VOUCHER: [12.0, 20.0], // R$ 12-20 por dia
    HEALTH_INSURANCE: [15.0, 30.0], // R$ 15-30 por dia
    DENTAL_INSURANCE: [2.0, 5.0], // R$ 2-5 por dia
    LIFE_INSURANCE: [1.0, 3.0], // R$ 1-3 por dia
  };

  const benefitEmployeeValues: { [key: string]: [number, number] } = {
    TRANSPORT_VOUCHER: [4.0, 6.0], // Funcionário recebe R$ 4-6 por dia
    MEAL_VOUCHER: [10.0, 18.0], // Funcionário recebe R$ 10-18 por dia
    HEALTH_INSURANCE: [0, 0], // Plano de saúde não tem valor direto para funcionário
    DENTAL_INSURANCE: [0, 0], // Plano odontológico não tem valor direto
    LIFE_INSURANCE: [0, 0], // Seguro de vida não tem valor direto
  };

  // Criar benefícios no catálogo por filial
  const createdCatalogBenefits: any[] = [];
  for (const branch of createdBranches) {
    // Criar 2-3 benefícios de cada tipo por filial
    for (const benefitType of benefitTypes) {
      const names = benefitNames[benefitType];
      const benefitsPerType = randomInt(2, 4);
      
      for (let i = 0; i < benefitsPerType; i++) {
        const name = names[Math.floor(Math.random() * names.length)];
        const costRange = benefitDailyCosts[benefitType];
        const employeeValueRange = benefitEmployeeValues[benefitType];
        
        const dailyCost = Math.random() * (costRange[1] - costRange[0]) + costRange[0];
        const employeeValue = employeeValueRange[0] === 0 && employeeValueRange[1] === 0
          ? 0
          : Math.random() * (employeeValueRange[1] - employeeValueRange[0]) + employeeValueRange[0];
        
        // Vale transporte e vale refeição não incluem fins de semana
        const includeWeekends = benefitType === 'HEALTH_INSURANCE' || benefitType === 'DENTAL_INSURANCE' || benefitType === 'LIFE_INSURANCE';

        const catalogBenefit = await prisma.benefit.create({
          data: {
            name,
            dailyCost: new Prisma.Decimal(dailyCost.toFixed(2)),
            employeeValue: new Prisma.Decimal(employeeValue.toFixed(2)),
            includeWeekends,
            description: `Benefício ${name} - ${branch.name}`,
            active: true,
            companyId: DEFAULT_COMPANY_ID,
            branchId: branch.id,
          },
        });
        createdCatalogBenefits.push(catalogBenefit);
      }
    }
  }
  console.log(`✅ ${createdCatalogBenefits.length} benefícios criados no catálogo\n`);

  // ============================================
  // ASSOCIAR BENEFÍCIOS AOS FUNCIONÁRIOS
  // ============================================
  console.log('👥 Associando benefícios aos funcionários...');

  const createdEmployeeBenefits: any[] = [];
  for (const employee of createdEmployees) {
    // Buscar benefícios disponíveis na filial do funcionário
    const availableBenefits = createdCatalogBenefits.filter(
      (b) => b.branchId === employee.branchId && b.active
    );

    if (availableBenefits.length === 0) continue;

    // Cada funcionário recebe 2-4 benefícios aleatórios
    const benefitsCount = randomInt(2, 5);
    const selectedBenefits = new Set<string>();
    
    while (selectedBenefits.size < benefitsCount && selectedBenefits.size < availableBenefits.length) {
      const randomBenefit = availableBenefits[Math.floor(Math.random() * availableBenefits.length)];
      selectedBenefits.add(randomBenefit.id);
    }

    for (const benefitId of selectedBenefits) {
      const startDate = randomDate(new Date(2023, 0, 1), new Date());

      const employeeBenefit = await prisma.employeeBenefit.create({
        data: {
          employeeId: employee.id,
          benefitId,
          active: true,
          startDate,
          companyId: DEFAULT_COMPANY_ID,
          branchId: employee.branchId,
        },
      });
      createdEmployeeBenefits.push(employeeBenefit);
    }
  }
  console.log(`✅ ${createdEmployeeBenefits.length} benefícios associados aos funcionários\n`);

  // ============================================
  // VEÍCULOS
  // ============================================
  console.log('🚛 Criando veículos...');

  // Buscar marcas e modelos do banco de dados (criados na migration)
  // IMPORTANTE: Execute 'npx prisma generate' antes de rodar o seed
  // para que os tipos VehicleBrand e VehicleModel estejam disponíveis
  type VehicleBrandType = { id: string; name: string; active: boolean };
  type VehicleModelType = { id: string; brandId: string; name: string; active: boolean; brand: { id: string; name: string } };
  
  const vehicleBrands = await (prisma as any).vehicleBrand.findMany({
    where: { active: true },
  }) as VehicleBrandType[];

  const vehicleModels = await (prisma as any).vehicleModel.findMany({
    where: { active: true },
    include: { brand: true },
  }) as VehicleModelType[];

  const createdVehicles: Vehicle[] = [];

  if (vehicleBrands.length === 0 || vehicleModels.length === 0) {
    console.log('⚠️  Nenhuma marca ou modelo encontrado. Pulando criação de veículos.');
  } else {
    const colors = ['Branco', 'Azul', 'Vermelho', 'Prata', 'Preto', 'Amarelo'];
    const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'MAINTENANCE', 'STOPPED'] as const; // Mais ativos
    for (const branch of createdBranches) {
      const vehiclesPerBranch = randomInt(SEED_VOLUME_MIN, SEED_VOLUME_MIN + 10);
      for (let i = 1; i <= vehiclesPerBranch; i++) {
        const plate = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${randomInt(1000, 9999)}`;
        
        // Selecionar uma marca aleatória
        const selectedBrand = vehicleBrands[Math.floor(Math.random() * vehicleBrands.length)];
        
        // Selecionar um modelo aleatório da marca selecionada
        const modelsForBrand = vehicleModels.filter((m) => m.brandId === selectedBrand.id);
        const selectedModel = modelsForBrand.length > 0
          ? modelsForBrand[Math.floor(Math.random() * modelsForBrand.length)]
          : null;
        
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        // Vehicle = 1 placa: criar Vehicle e depois VehiclePlate (tipo CAVALO)
        const vehicleData = {
          brandId: selectedBrand.id,
          modelId: selectedModel?.id || null,
          year: randomInt(2018, 2024),
          color: colors[Math.floor(Math.random() * colors.length)],
          chassis: `${randomInt(1000000, 9999999)}${randomInt(1000000, 9999999)}`,
          renavam: `${randomInt(100000000, 999999999)}`,
          currentKm: randomInt(50000, 500000),
          status,
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
        } as unknown as Prisma.VehicleUncheckedCreateInput;

        const vehicle = await prisma.vehicle.create({
          data: {
            ...vehicleData,
            plate: {
              create: { type: 'CAVALO', plate },
            },
          },
        });
        createdVehicles.push(vehicle);

        // Criar histórico de status
        await prisma.vehicleStatusHistory.create({
          data: {
            vehicleId: vehicle.id,
            status: vehicle.status,
            km: vehicle.currentKm,
            notes: 'Status inicial',
          },
        });
      }
    }
    console.log(`✅ ${createdVehicles.length} veículos criados\n`);
  }

  // ============================================
  // TROCA POR KM + MARCAÇÕES + ETIQUETAS
  // ============================================
  // Garante dados completos para as telas de manutenção por quilometragem.
  console.log('🧩 Criando itens de troca por KM, marcações e etiquetas...');

  const createdByUserId = createdUsers[0]?.id ?? undefined;

  const replacementItemNamePool = [
    'Óleo Motor 15W40',
    'Filtro de Óleo',
    'Filtro de Ar',
    'Pastilha de Freio',
    'Disco de Freio',
    'Pneu 275/80R22.5',
    'Bateria 12V 200Ah',
    'Radiador',
    'Correia Dentada',
    'Vela de Ignição',
    'Fluido de Freio',
  ];

  const vehicleReplacementItemsByVehicleId = new Map<
    string,
    Array<{ id: string; replaceEveryKm: number }>
  >();

  // 1) Itens configurados por veículo (troca por KM).
  for (const vehicle of createdVehicles) {
    const count = randomInt(3, 6);
    const selectedNames = new Set<string>();

    while (selectedNames.size < count) {
      const name = replacementItemNamePool[
        Math.floor(Math.random() * replacementItemNamePool.length)
      ];
      selectedNames.add(name);
    }

    for (const name of selectedNames) {
      const replaceEveryKm = randomInt(8000, 60000);
      const item = await prisma.vehicleReplacementItem.create({
        data: {
          vehicleId: vehicle.id,
          name,
          replaceEveryKm,
          createdAt: new Date(),
        },
      });

      const list = vehicleReplacementItemsByVehicleId.get(vehicle.id) ?? [];
      list.push({ id: item.id, replaceEveryKm });
      vehicleReplacementItemsByVehicleId.set(vehicle.id, list);
    }
  }

  // 2) Marcações de chegada (KM crescente) + histórico.
  const markingsPerVehicle = 2;
  for (const vehicle of createdVehicles) {
    let lastKm = vehicle.currentKm ?? 0;

    for (let i = 0; i < markingsPerVehicle; i++) {
      const nextKm = lastKm + randomInt(5000, 25000);

      await prisma.vehicleMarking.create({
        data: {
          km: nextKm,
          companyId: DEFAULT_COMPANY_ID,
          branchId: vehicle.branchId,
          createdBy: createdByUserId,
          vehicles: {
            create: [{ vehicleId: vehicle.id }],
          },
        },
      });

      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { currentKm: nextKm },
      });

      await prisma.vehicleStatusHistory.create({
        data: {
          vehicleId: vehicle.id,
          status: vehicle.status ?? 'ACTIVE',
          km: nextKm,
          notes: 'Atualizado via marcação (seed)',
          createdBy: createdByUserId,
        },
      });

      vehicle.currentKm = nextKm;
      lastKm = nextKm;
    }
  }

  // 3) Etiquetas de manutenção (uma por veículo) com lastChangeKm variado.
  let createdMaintenanceLabels = 0;
  let createdLabelReplacementItems = 0;

  for (const vehicle of createdVehicles) {
    const referenceKm = vehicle.currentKm ?? 0;
    const replacementItems =
      vehicleReplacementItemsByVehicleId.get(vehicle.id) ?? [];
    if (replacementItems.length === 0) continue;

    const label = await prisma.maintenanceLabel.create({
      data: {
        companyId: DEFAULT_COMPANY_ID,
        branchId: vehicle.branchId,
        createdBy: createdByUserId,
        vehicles: {
          create: { vehicleId: vehicle.id },
        },
      },
    });

    for (const ri of replacementItems) {
      const replaceEveryKm = ri.replaceEveryKm;
      const roll = Math.random();

      let lastChangeKm: number;
      if (roll < 0.18) {
        const delta = randomInt(100, Math.max(200, Math.floor(replaceEveryKm * 0.2)));
        // due: referenceKm >= lastChangeKm + replaceEveryKm
        lastChangeKm = referenceKm - replaceEveryKm - delta;
      } else if (roll < 0.50) {
        // warning
        const xMax = Math.max(1, Math.floor(replaceEveryKm * 0.1));
        const x = randomInt(1, xMax);
        lastChangeKm = referenceKm - replaceEveryKm + x;
      } else {
        // ok
        const xMin = Math.max(2, Math.floor(replaceEveryKm * 0.1) + 1);
        const xMax = Math.max(xMin + 1, Math.floor(replaceEveryKm * 0.6));
        const x = randomInt(xMin, xMax);
        lastChangeKm = referenceKm - replaceEveryKm + x;
      }

      if (!Number.isFinite(lastChangeKm)) lastChangeKm = referenceKm;
      lastChangeKm = Math.max(0, Math.floor(lastChangeKm));

      await prisma.maintenanceLabelReplacementItem.create({
        data: {
          maintenanceLabelId: label.id,
          vehicleReplacementItemId: ri.id,
          lastChangeKm,
          updatedInThisLabel: Math.random() < 0.4,
          createdBy: createdByUserId,
        },
      });

      createdLabelReplacementItems++;
    }

    createdMaintenanceLabels++;
  }

  console.log(
    `✅ Etiquetas criadas: ${createdMaintenanceLabels} (itens: ${createdLabelReplacementItems})\n`,
  );

  // ============================================
  // ALMOXARIFADOS E ESTOQUE
  // ============================================
  console.log('📦 Criando almoxarifados e estoque...');

  const createdWarehouses: Warehouse[] = [];
  for (const branch of createdBranches) {
    const warehousesPerBranch = randomInt(1, 2);
    for (let i = 1; i <= warehousesPerBranch; i++) {
      const warehouse = await prisma.warehouse.create({
        data: {
          code: `ALM${i}`,
          name: `Almoxarifado ${i} - ${branch.name}`,
          description: `Almoxarifado principal da ${branch.name}`,
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
        },
      });
      createdWarehouses.push(warehouse);
    }
  }
  console.log(`✅ ${createdWarehouses.length} almoxarifados criados`);

  // Criar estoque inicial
  const createdStocks: Stock[] = [];
  for (const warehouse of createdWarehouses) {
    const warehouseProducts = createdProducts.filter(
      (p) => p.companyId === warehouse.companyId && p.branchId === warehouse.branchId,
    );
    for (const product of warehouseProducts.slice(0, 15)) {
      // Estoque para 15 produtos por almoxarifado
      const quantity = randomInt(0, 100);
      // Usar unitPrice do produto, ou valor aleatório se não tiver
      const productUnitPrice = (product as any).unitPrice;
      const averageCost = productUnitPrice && Number(productUnitPrice) > 0
        ? new Prisma.Decimal(productUnitPrice)
        : randomDecimal(10, 500);
      const stock = await prisma.stock.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: new Prisma.Decimal(quantity),
          averageCost,
          companyId: DEFAULT_COMPANY_ID,
          branchId: warehouse.branchId,
        },
      });
      createdStocks.push(stock);
    }
  }
  console.log(`✅ ${createdStocks.length} registros de estoque criados\n`);

  // ============================================
  // ORDENS DE MANUTENÇÃO
  // ============================================
  console.log('🔧 Criando ordens de manutenção...');

  const seedCreatedBy = createdUsers[0]?.id ?? undefined;

  const maintenanceTypes = ['PREVENTIVE', 'CORRECTIVE'] as const;
  const maintenanceStatuses = [
    'OPEN',
    'IN_PROGRESS',
    'PAUSED',
    'COMPLETED',
    'CANCELLED',
  ] as const;

  const createdMaintenanceOrders: MaintenanceOrder[] = [];
  let orderNumber = 1;

  for (const branch of createdBranches) {
    const branchVehicles = createdVehicles.filter((v) => v.branchId === branch.id);
    const branchEmployees = createdEmployees.filter((e) => e.branchId === branch.id);

    const ordersPerBranch = randomInt(SEED_VOLUME_MIN, SEED_VOLUME_MIN + 10);
    for (let i = 0; i < ordersPerBranch; i++) {
        const vehicle = branchVehicles[Math.floor(Math.random() * branchVehicles.length)];
        if (!vehicle) continue;
        const type = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
        const status = maintenanceStatuses[Math.floor(Math.random() * maintenanceStatuses.length)];

        const kmAtEntry =
          vehicle.currentKm != null
            ? vehicle.currentKm + randomInt(500, 20000)
            : randomInt(50000, 400000);

        const maintenanceOrder = await prisma.maintenanceOrder.create({
          data: {
            orderNumber: `OM-${String(orderNumber).padStart(6, '0')}`,
            vehicles: { create: [{ vehicleId: vehicle.id }] },
            type,
            status,
            // KM não pode regredir (a OM entra com KM >= KM atual do veículo).
            kmAtEntry,
            description: type === 'PREVENTIVE' ? 'Manutenção preventiva programada' : 'Manutenção corretiva - reparo necessário',
            observations: 'Ordem de manutenção criada via seed',
            companyId: DEFAULT_COMPANY_ID,
            branchId: branch.id,
          },
        });
        createdMaintenanceOrders.push(maintenanceOrder);
        orderNumber++;

        // Adicionar funcionários à ordem
        const workersCount = randomInt(1, 3);
        const selectedWorkers = branchEmployees
          .filter((e) => e.department === 'Manutenção' || e.position?.includes('Mecânico'))
          .slice(0, workersCount);
        if (selectedWorkers.length === 0) {
          selectedWorkers.push(...branchEmployees.slice(0, workersCount));
        }

        for (let j = 0; j < selectedWorkers.length; j++) {
          await prisma.maintenanceWorker.create({
            data: {
              maintenanceOrderId: maintenanceOrder.id,
              employeeId: selectedWorkers[j].id,
              isResponsible: j === 0,
            },
          });
        }

        // Adicionar serviços
        if (status === 'COMPLETED' || status === 'IN_PROGRESS') {
          const servicesCount = randomInt(1, 3);
          for (let j = 0; j < servicesCount; j++) {
            await prisma.maintenanceService.create({
              data: {
                maintenanceOrderId: maintenanceOrder.id,
                description: `Serviço ${j + 1}: ${type === 'PREVENTIVE' ? 'Troca de óleo e filtros' : 'Reparo de sistema'}`,
              },
            });
          }
        }

        // Adicionar materiais consumidos
        const branchProducts = createdProducts.filter(
          (p) => p.branchId === branch.id,
        );
        let orderTotalCost = 0;
        if (branchProducts.length > 0 && (status === 'COMPLETED' || status === 'IN_PROGRESS')) {
          const materialsCount = randomInt(2, 5);
          const selectedProducts = branchProducts.slice(0, materialsCount);
          for (const product of selectedProducts) {
            // Buscar estoque do produto para obter averageCost, caso contrário usar unitPrice
            const stocks = await prisma.stock.findMany({
              where: {
                productId: product.id,
                branchId: branch.id,
                quantity: { gt: 0 },
              },
              orderBy: { updatedAt: 'desc' },
            });

            let unitCost = 0;
            if (stocks.length > 0 && Number(stocks[0].averageCost) > 0) {
              // Usar averageCost do estoque se disponível
              unitCost = Number(stocks[0].averageCost);
            } else {
              // Usar unitPrice do produto como fallback
              const productUnitPrice = (product as any).unitPrice;
              if (productUnitPrice && Number(productUnitPrice) > 0) {
                unitCost = Number(productUnitPrice);
              } else {
                // Fallback: valor aleatório (para produtos antigos sem unitPrice)
                unitCost = Number(randomDecimal(10, 200));
              }
            }

            const quantity = new Prisma.Decimal(randomInt(1, 5));
            const totalCost = new Prisma.Decimal(Number(quantity) * unitCost);

            await prisma.maintenanceMaterial.create({
              data: {
                maintenanceOrderId: maintenanceOrder.id,
                productId: product.id,
                quantity: quantity,
                unitCost: new Prisma.Decimal(unitCost),
                totalCost: totalCost,
              },
            });

            orderTotalCost += Number(totalCost);
          }
        }

        // Persistir totalCost no registro (usado por financeiro/relatórios).
        if (orderTotalCost > 0) {
          await prisma.maintenanceOrder.update({
            where: { id: maintenanceOrder.id },
            data: { totalCost: new Prisma.Decimal(orderTotalCost) },
          });
        }

        // Adicionar timeline
        if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
          await prisma.maintenanceTimeline.create({
            data: {
              maintenanceOrderId: maintenanceOrder.id,
              event: 'STARTED',
              notes: 'Ordem de manutenção iniciada',
            },
          });
        }
        if (status === 'PAUSED') {
          await prisma.maintenanceTimeline.create({
            data: {
              maintenanceOrderId: maintenanceOrder.id,
              event: 'PAUSED',
              notes: 'Ordem de manutenção pausada',
              createdBy: seedCreatedBy,
            },
          });
        }
        if (status === 'COMPLETED') {
          await prisma.maintenanceTimeline.create({
            data: {
              maintenanceOrderId: maintenanceOrder.id,
              event: 'COMPLETED',
              notes: 'Manutenção concluída com sucesso',
              createdBy: seedCreatedBy,
            },
          });
        }

        if (status === 'CANCELLED') {
          await prisma.maintenanceTimeline.create({
            data: {
              maintenanceOrderId: maintenanceOrder.id,
              event: 'CANCELLED',
              notes: 'Ordem de manutenção cancelada',
              createdBy: seedCreatedBy,
            },
          });
        }

        // COMPLETED/CANCELLED: impacto direto no veículo (KM e status).
        if (status === 'COMPLETED' || status === 'CANCELLED') {
          await prisma.vehicle.update({
            where: { id: vehicle.id },
            data: { status: 'ACTIVE', currentKm: kmAtEntry },
          });

          await prisma.vehicleStatusHistory.create({
            data: {
              vehicleId: vehicle.id,
              maintenanceOrderId: maintenanceOrder.id,
              status: 'ACTIVE',
              km: kmAtEntry,
              notes:
                status === 'COMPLETED'
                  ? `Ordem de manutenção ${maintenanceOrder.orderNumber} concluída`
                  : `Ordem de manutenção ${maintenanceOrder.orderNumber} cancelada`,
              createdBy: seedCreatedBy,
            },
          });

          // Mantém coerência mínima na memória para próximas OM do mesmo veículo.
          vehicle.currentKm = kmAtEntry;
          vehicle.status = 'ACTIVE';

          // Conta a pagar só quando concluído e com custo.
          if (status === 'COMPLETED' && orderTotalCost > 0) {
            await prisma.accountPayable.create({
              data: {
                description: `Manutenção ${maintenanceOrder.orderNumber} - Veículo`,
                amount: new Prisma.Decimal(orderTotalCost),
                dueDate: new Date(),
                originType: 'MAINTENANCE',
                originId: maintenanceOrder.id,
                vehicleId: vehicle.id,
                companyId: DEFAULT_COMPANY_ID,
                branchId: branch.id,
                status: 'PENDING',
                createdBy: seedCreatedBy,
              },
            });
          }
        }
      }
  }
  console.log(`✅ ${createdMaintenanceOrders.length} ordens de manutenção criadas\n`);

  // ============================================
  // MOVIMENTAÇÕES DE ESTOQUE
  // ============================================
  console.log('📊 Criando movimentações de estoque...');

  const createdMovements: StockMovement[] = [];

  for (const branch of createdBranches) {
    const branchProducts = createdProducts.filter((p) => p.branchId === branch.id);

    const movementsPerBranch = randomInt(SEED_VOLUME_MIN, SEED_VOLUME_MIN + 10);
    for (let i = 0; i < movementsPerBranch; i++) {
        const product = branchProducts[Math.floor(Math.random() * branchProducts.length)];
        const quantity = randomInt(1, 20);
        // Usar unitPrice do produto ou valor aleatório se não tiver
        const productUnitPrice = (product as any).unitPrice;
        const unitCostValue = productUnitPrice && Number(productUnitPrice) > 0
          ? Number(productUnitPrice)
          : Number(randomDecimal(10, 500));

        const movement = await prisma.stockMovement.create({
          data: {
            type: 'ENTRY',
            productId: product.id,
            quantity: new Prisma.Decimal(quantity),
            unitCost: new Prisma.Decimal(unitCostValue),
            totalCost: new Prisma.Decimal(quantity * unitCostValue),
            documentNumber: `NF-${randomInt(1000, 9999)}`,
            notes: 'Movimentação de estoque - Entrada',
            companyId: DEFAULT_COMPANY_ID,
            branchId: branch.id,
          },
        });
        createdMovements.push(movement);
      }
  }
  console.log(`✅ ${createdMovements.length} movimentações de estoque criadas\n`);

  // ============================================
  // TRIPS + CADASTROS (FORNECEDORES/CLIENTES/CENTROS) + DESPESAS
  // ============================================
  console.log('🧾 Criando fornecedores, clientes, centros de custo, trips e despesas...');

  const createdSuppliers: any[] = [];
  const createdCustomers: any[] = [];
  const createdCostCenters: any[] = [];

  const suppliersNamePool = [
    'Transportadora Alfa',
    'Logística Norte',
    'Comercial Sul',
    'Distribuição Central',
    'Auto Parts BR',
    'Serviços Rodoviários',
  ];

  const customersNamePool = [
    'Indústria Horizonte',
    'Comercial Aurora',
    'Empresa Atlântico',
    'Logix Soluções',
    'Alimentação Sabor',
    'Agro Verde',
  ];

  for (const branch of createdBranches) {
    const branchCodeSafe = (branch.code ?? branch.id).toLowerCase();
    const suppliersPerBranch = SEED_VOLUME_MIN;
    const customersPerBranch = SEED_VOLUME_MIN;
    const costCentersPerBranch = SEED_VOLUME_MIN;

    for (let i = 0; i < suppliersPerBranch; i++) {
      const name = `${suppliersNamePool[i % suppliersNamePool.length]} ${branch.code} ${i + 1}`;
      const supplier = await prisma.supplier.create({
        data: {
          name,
          document: `${randomInt(10, 99)}.${randomInt(100, 999)}.${randomInt(100, 999)}/${randomInt(
            10,
            99,
          )}-${randomInt(10, 99)}`,
          email: `supplier.${branchCodeSafe}.${i + 1}@example.com`,
          phone: `+55 ${randomInt(11, 99)} ${randomInt(9000, 9999)}-${randomInt(
            1000,
            9999,
          )}`,
          address: `Rua ${i + 1} - ${branch.name}`,
          city: 'São Paulo',
          state: 'SP',
          zipCode: `0${randomInt(10, 99)}.${randomInt(10, 99)}-${randomInt(10, 99)}`,
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
          active: true,
          createdBy: createdByUserId,
        },
      });
      createdSuppliers.push(supplier);
    }

    for (let i = 0; i < customersPerBranch; i++) {
      const name = `${customersNamePool[i % customersNamePool.length]} ${branch.code} ${i + 1}`;
      const customer = await prisma.customer.create({
        data: {
          name,
          document: `${randomInt(100, 999)}.${randomInt(100, 999)}.${randomInt(100, 999)}-${randomInt(
            10,
            99,
          )}`,
          email: `customer.${branchCodeSafe}.${i + 1}@example.com`,
          phone: `+55 ${randomInt(11, 99)} ${randomInt(9000, 9999)}-${randomInt(
            1000,
            9999,
          )}`,
          address: `Av. ${i + 1} - ${branch.name}`,
          city: 'São Paulo',
          state: 'SP',
          zipCode: `0${randomInt(10, 99)}.${randomInt(10, 99)}-${randomInt(10, 99)}`,
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
          active: true,
          createdBy: createdByUserId,
        },
      });
      createdCustomers.push(customer);
    }

    for (let i = 0; i < costCentersPerBranch; i++) {
      const code = `CC-${branch.code}-${String(i + 1).padStart(3, '0')}`;
      const cc = await prisma.costCenter.create({
        data: {
          code,
          name: `Centro de custo ${branch.code} ${i + 1}`,
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
          active: true,
          createdBy: createdByUserId,
        },
      });
      createdCostCenters.push(cc);
    }
  }

  console.log(
    `✅ Cadastros criados (Fornecedores: ${createdSuppliers.length}, Clientes: ${createdCustomers.length}, CC: ${createdCostCenters.length})`,
  );

  // Tipos de despesa de trip (já são criados antes; aqui apenas carregamos para usar).
  const createdTripExpenseTypes = await prisma.tripExpenseType.findMany({
    where: { companyId: DEFAULT_COMPANY_ID },
  });

  // Trips + despesas
  const createdTrips: any[] = [];
  for (const branch of createdBranches) {
    const branchVehicles = createdVehicles.filter((v) => v.branchId === branch.id);
    const branchEmployees = createdEmployees.filter((e) => e.branchId === branch.id);
    const branchCustomers = createdCustomers.filter((c) => c.branchId === branch.id);
    const branchTripTypes = createdTripExpenseTypes.filter((t) => t.branchId === branch.id);
    const branchCostCenters = createdCostCenters.filter((c) => c.branchId === branch.id);

    if (!branchVehicles.length || !branchEmployees.length || !branchCustomers.length) {
      continue;
    }

    const drivers = branchEmployees.filter((e) =>
      (e.position ?? '').toLowerCase().includes('motor'),
    );

    const tripsPerBranch = SEED_VOLUME_MIN;
    for (let i = 0; i < tripsPerBranch; i++) {
      const customer = branchCustomers[Math.floor(Math.random() * branchCustomers.length)];
      const selectedDrivers = drivers.length ? drivers : branchEmployees;
      const driver =
        selectedDrivers[
          Math.floor(Math.random() * selectedDrivers.length)
        ];
      if (!driver) continue;

      const comboSize = randomInt(1, Math.min(3, branchVehicles.length));
      const vehicleIds = new Set<string>();
      while (vehicleIds.size < comboSize) {
        vehicleIds.add(
          branchVehicles[Math.floor(Math.random() * branchVehicles.length)].id,
        );
      }
      const vehicleIdsList = Array.from(vehicleIds);
      const primaryVehicleId = vehicleIdsList[0];

      const origin = `Origem ${branch.code} ${randomInt(1, 2000)}`;
      const destination = `Destino ${branch.code} ${randomInt(1, 2000)}`;
      const freightValue = randomDecimal(8000, 45000);

      const status: any = Math.random() < 0.7 ? 'COMPLETED' : 'IN_PROGRESS';
      const scheduledDepartureAt = randomDate(new Date(2024, 0, 1), new Date());
      const scheduledArrivalAt = new Date(scheduledDepartureAt);
      scheduledArrivalAt.setHours(
        scheduledArrivalAt.getHours() + randomInt(4, 48),
      );

      const actualDepartureAt = status === 'COMPLETED' ? scheduledDepartureAt : null;
      const actualArrivalAt = status === 'COMPLETED' ? scheduledArrivalAt : null;

      const trip = await prisma.trip.create({
        data: {
          customerId: customer.id,
          vehicleId: primaryVehicleId,
          driverId: driver.id,
          origin,
          destination,
          freightValue,
          status,
          scheduledDepartureAt,
          scheduledArrivalAt,
          actualDepartureAt,
          actualArrivalAt,
          notes: 'Trip criada via seed',
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
          createdBy: createdByUserId,
        },
      });

      // CR (account receivable) prevista/realizada
      const arDueDate = scheduledArrivalAt;
      const arStatus: any = status === 'COMPLETED' ? 'RECEIVED' : 'PLANNED';

      const ar = await prisma.accountReceivable.create({
        data: {
          description: `Frete: ${origin} -> ${destination}`,
          amount: freightValue,
          dueDate: arDueDate,
          receiptDate: status === 'COMPLETED' ? scheduledArrivalAt : null,
          status: arStatus,
          originType: 'TRIP',
          originId: trip.id,
          documentNumber: `TR-${randomInt(1000, 9999)}`,
          notes: 'Conta a receber criada via seed (trip)',
          customerId: customer.id,
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
          createdBy: createdByUserId,
        },
      });

      await prisma.trip.update({
        where: { id: trip.id },
        data: { accountReceivableId: ar.id },
      });

      await (prisma as any).tripVehicle.createMany({
        data: vehicleIdsList.map((vehicleId: string) => ({
          tripId: trip.id,
          vehicleId,
        })),
      });

      const tripExpensesCount = randomInt(2, 5);
      for (let j = 0; j < tripExpensesCount; j++) {
        const type = branchTripTypes[Math.floor(Math.random() * branchTripTypes.length)];
        const expenseAmount = randomDecimal(150, 5000);
        const expenseDate = randomDate(new Date(2024, 0, 1), new Date());

        const maybeCc =
          branchCostCenters.length && Math.random() < 0.6
            ? branchCostCenters[
                Math.floor(Math.random() * branchCostCenters.length)
              ].id
            : null;

        const accountPayable = await prisma.accountPayable.create({
          data: {
            description: `Despesa viagem ${origin} -> ${destination} - ${type.name}`,
            amount: expenseAmount,
            dueDate: expenseDate,
            status: 'PENDING',
            originType: 'TRIP',
            originId: trip.id,
            documentNumber: `CP-${randomInt(1000, 9999)}`,
            notes: 'Conta a pagar criada via seed (trip expense)',
            vehicleId: primaryVehicleId,
            costCenterId: maybeCc ?? undefined,
            companyId: DEFAULT_COMPANY_ID,
            branchId: branch.id,
            createdBy: createdByUserId,
          },
        });

        await prisma.tripExpense.create({
          data: {
            tripId: trip.id,
            tripExpenseTypeId: type.id,
            amount: expenseAmount,
            description: `Despesa: ${type.name}`,
            expenseDate,
            vehicleId: primaryVehicleId,
            accountPayableId: accountPayable.id,
            costCenterId: maybeCc ?? undefined,
            companyId: DEFAULT_COMPANY_ID,
            branchId: branch.id,
            createdBy: createdByUserId,
          },
        });
      }

      createdTrips.push(trip);
    }
  }

  console.log(`✅ Trips criadas: ${createdTrips.length}`);

  // ============================================
  // PEDIDOS DE COMPRA/VENDA + DOCUMENTOS FISCAIS
  // ============================================
  console.log('📦 Criando pedidos de compra e pedidos de venda...');

  // PurchaseOrder (recebidos)
  const createdPurchaseOrders: any[] = [];
  for (const branch of createdBranches) {
    const branchSuppliers = createdSuppliers.filter((s) => s.branchId === branch.id);
    const branchProducts = createdProducts.filter((p) => p.branchId === branch.id);
    const defaultWarehouse = createdWarehouses.find((w) => w.branchId === branch.id);

    if (!branchSuppliers.length || !branchProducts.length || !defaultWarehouse) continue;

    let poSeq = 1;
    const purchaseOrdersPerBranch = SEED_VOLUME_MIN;
    for (let i = 0; i < purchaseOrdersPerBranch; i++) {
      const supplier = branchSuppliers[Math.floor(Math.random() * branchSuppliers.length)];
      const number = `PC-${String(poSeq).padStart(3, '0')}`;

      const itemsCount = randomInt(2, 3);
      const items: any[] = [];
      let receivedTotalValue = 0;

      for (let j = 0; j < itemsCount; j++) {
        const product = branchProducts[Math.floor(Math.random() * branchProducts.length)];
        const unitPriceNumber = Number((product as any).unitPrice ?? 0) || randomInt(10, 500);
        const quantity = randomInt(3, 12);

        const unitPrice = new Prisma.Decimal(unitPriceNumber);
        const total = new Prisma.Decimal(unitPriceNumber * quantity);
        receivedTotalValue += Number(total);

        items.push({
          productId: product.id,
          quantity: new Prisma.Decimal(quantity),
          quantityReceived: new Prisma.Decimal(quantity),
          unitPrice,
          total,
        });
      }

      const po = await prisma.purchaseOrder.create({
        data: {
          number,
          supplierId: supplier.id,
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
          expectedDeliveryDate: randomDate(new Date(), new Date(2026, 11, 31)),
          status: 'RECEIVED',
          notes: 'Pedido de compra via seed',
          createdBy: createdByUserId,
          items: {
            create: items.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              quantityReceived: it.quantityReceived,
              unitPrice: it.unitPrice,
              total: it.total,
            })),
          },
        },
      });

      // Estoque (ENTRY) + média custo + conta a pagar + documento fiscal
      for (const it of items) {
        await prisma.stockMovement.create({
          data: {
            type: 'ENTRY',
            productId: it.productId,
            quantity: it.quantity,
            unitCost: it.unitPrice,
            totalCost: it.total,
            documentNumber: po.number,
            notes: 'Recebimento pedido de compra via seed',
            purchaseOrderId: po.id,
            companyId: DEFAULT_COMPANY_ID,
            branchId: branch.id,
            createdBy: createdByUserId,
          },
        });

        const existingStock = await prisma.stock.findUnique({
          where: {
            productId_warehouseId: {
              productId: it.productId,
              warehouseId: defaultWarehouse.id,
            },
          },
        });

        if (existingStock) {
          const currentQty = Number(existingStock.quantity);
          const currentAvg = Number(existingStock.averageCost);
          const entryQty = Number(it.quantity);
          const entryTotal = Number(it.total);

          const newQty = currentQty + entryQty;
          const newAvg = newQty > 0 ? (currentQty * currentAvg + entryTotal) / newQty : 0;

          await prisma.stock.update({
            where: {
              productId_warehouseId: {
                productId: it.productId,
                warehouseId: defaultWarehouse.id,
              },
            },
            data: {
              quantity: new Prisma.Decimal(newQty),
              averageCost: new Prisma.Decimal(newAvg),
              updatedAt: new Date(),
              createdBy: createdByUserId,
            },
          });
        } else {
          await prisma.stock.create({
            data: {
              productId: it.productId,
              warehouseId: defaultWarehouse.id,
              quantity: it.quantity,
              averageCost: it.unitPrice,
              companyId: DEFAULT_COMPANY_ID,
              branchId: branch.id,
              createdBy: createdByUserId,
            },
          });
        }
      }

      const accountPayable = await prisma.accountPayable.create({
        data: {
          description: `Pedido de compra ${po.number} - ${supplier.name}`,
          amount: new Prisma.Decimal(receivedTotalValue),
          dueDate: randomDate(new Date(), new Date(2026, 11, 31)),
          status: 'PENDING',
          originType: 'PURCHASE_ORDER',
          originId: po.id,
          documentNumber: po.number,
          notes: 'Conta a pagar gerada via seed (PC recebida)',
          supplierId: supplier.id,
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
          createdBy: createdByUserId,
        },
      });

      if (Math.random() < 0.5) {
        await prisma.fiscalDocument.create({
          data: {
            type: 'ENTRY',
            number: `NF-${randomInt(1000, 9999)}-${branch.code ?? branch.id}`,
            series: '1',
            issueDate: randomDate(new Date(2024, 0, 1), new Date()),
            totalAmount: new Prisma.Decimal(receivedTotalValue),
            status: 'REGISTERED',
            companyId: DEFAULT_COMPANY_ID,
            branchId: branch.id,
            supplierId: supplier.id,
            accountPayableId: accountPayable.id,
            notes: 'Documento fiscal via seed',
            createdBy: createdByUserId,
          },
        });
      }

      createdPurchaseOrders.push(po);
      poSeq++;
    }
  }

  // SalesOrder (faturados/DELIVERED)
  const createdSalesOrders: any[] = [];
  for (const branch of createdBranches) {
    const branchCustomers = createdCustomers.filter((c) => c.branchId === branch.id);
    const branchProducts = createdProducts.filter((p) => p.branchId === branch.id);
    const defaultWarehouse = createdWarehouses.find((w) => w.branchId === branch.id);

    if (!branchCustomers.length || !branchProducts.length || !defaultWarehouse) continue;

    // Carrega estoque atual do almoxarifado padrão para evitar estoque negativo.
    const branchStockRows = await prisma.stock.findMany({
      where: {
        branchId: branch.id,
        warehouseId: defaultWarehouse.id,
        quantity: { gt: 0 },
      },
      include: { product: true },
    });

    let soSeq = 1;
    const salesOrdersPerBranch = SEED_VOLUME_MIN;
    for (let i = 0; i < salesOrdersPerBranch; i++) {
      const customer = branchCustomers[Math.floor(Math.random() * branchCustomers.length)];
      const number = `PV-${String(soSeq).padStart(3, '0')}`;
      const orderDate = randomDate(new Date(2024, 0, 1), new Date());

      const itemsCount = randomInt(2, 3);
      const items: any[] = [];
      let totalAmount = 0;

      // Trabalha com cópia dos estoques em memória (para reduzir chamadas).
      const stockPool = branchStockRows.filter((s) => Number(s.quantity) > 0);
      for (let j = 0; j < itemsCount; j++) {
        if (!stockPool.length) break;
        const rowIdx = Math.floor(Math.random() * stockPool.length);
        const stockRow = stockPool[rowIdx];
        const available = Number(stockRow.quantity);
        if (available <= 0) continue;

        const maxQty = Math.max(1, Math.min(5, available));
        const qty = randomInt(1, maxQty);

        const unitPriceNumber = Number((stockRow.product as any).unitPrice ?? 0) || Number(stockRow.averageCost) || randomInt(10, 500);
        const itemTotal = new Prisma.Decimal(unitPriceNumber * qty);
        totalAmount += Number(itemTotal);

        items.push({
          productId: stockRow.productId,
          quantity: new Prisma.Decimal(qty),
          unitPrice: new Prisma.Decimal(unitPriceNumber),
          total: itemTotal,
        });

        // Atualiza in-memory
        stockRow.quantity = new Prisma.Decimal(available - qty);
      }

      if (!items.length) continue;

      const so = await prisma.salesOrder.create({
        data: {
          number,
          customerId: customer.id,
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
          orderDate,
          status: 'DELIVERED',
          notes: 'Pedido de venda via seed',
          createdBy: createdByUserId,
          items: {
            create: items.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              total: it.total,
              quantityInvoiced: it.quantity,
            })),
          },
        },
      });

      // CR para o faturamento
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const accountReceivableStatus = Math.random() < 0.3 ? 'RECEIVED' : 'PENDING';

      const ar = await prisma.accountReceivable.create({
        data: {
          description: `Pedido de venda ${so.number} - ${customer.name}`,
          amount: new Prisma.Decimal(totalAmount),
          dueDate,
          receiptDate: accountReceivableStatus === 'RECEIVED' ? new Date() : null,
          status: accountReceivableStatus,
          originType: 'SALE_ORDER',
          originId: so.id,
          documentNumber: so.number,
          notes: 'Conta a receber gerada via seed (faturamento PV)',
          customerId: customer.id,
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
          createdBy: createdByUserId,
        },
      });

      // Movimentações de saída + baixa de estoque (EXIT)
      for (const it of items) {
        const qty = Number(it.quantity);
        await prisma.stockMovement.create({
          data: {
            type: 'EXIT',
            productId: it.productId,
            quantity: new Prisma.Decimal(qty),
            documentNumber: so.number,
            notes: 'Faturamento pedido de venda via seed',
            salesOrderId: so.id,
            companyId: DEFAULT_COMPANY_ID,
            branchId: branch.id,
            createdBy: createdByUserId,
          },
        });

        // Atualiza estoque a partir do valor atual no banco (evita inconsistência por estoque "em memória").
        const existingStock = await prisma.stock.findUnique({
          where: {
            productId_warehouseId: {
              productId: it.productId,
              warehouseId: defaultWarehouse.id,
            },
          },
        });

        if (existingStock) {
          const currentQty = Number(existingStock.quantity);
          const newQty = currentQty - qty;
          await prisma.stock.update({
            where: {
              productId_warehouseId: {
                productId: it.productId,
                warehouseId: defaultWarehouse.id,
              },
            },
            data: {
              quantity: new Prisma.Decimal(newQty),
              updatedAt: new Date(),
            },
          });
        }
      }

      if (Math.random() < 0.5) {
        await prisma.fiscalDocument.create({
          data: {
            type: 'EXIT',
            number: `NF-${randomInt(1000, 9999)}-${branch.code ?? branch.id}`,
            series: '1',
            issueDate: randomDate(new Date(2024, 0, 1), new Date()),
            totalAmount: new Prisma.Decimal(totalAmount),
            status: 'REGISTERED',
            companyId: DEFAULT_COMPANY_ID,
            branchId: branch.id,
            customerId: customer.id,
            accountReceivableId: ar.id,
            notes: 'Documento fiscal via seed',
            createdBy: createdByUserId,
          },
        });
      }

      createdSalesOrders.push(so);
      soSeq++;
    }
  }

  console.log(
    `✅ Pedidos criados (PC: ${createdPurchaseOrders.length}, PV: ${createdSalesOrders.length})`,
  );

  // ============================================
  // TRANSAÇÕES FINANCEIRAS
  // ============================================
  console.log('💵 Criando transações financeiras...');

  const transactionTypes = ['INCOME', 'EXPENSE'] as const;
  const originTypes = ['MAINTENANCE', 'STOCK', 'HR', 'MANUAL'] as const;

  const createdTransactions: FinancialTransaction[] = [];

  for (const branch of createdBranches) {
    const transactionsPerBranch = randomInt(SEED_VOLUME_MIN, SEED_VOLUME_MIN + 10);

    for (let i = 0; i < transactionsPerBranch; i++) {
      const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
      const originType = originTypes[Math.floor(Math.random() * originTypes.length)];

      const transaction = await prisma.financialTransaction.create({
        data: {
          type,
          amount: randomDecimal(100, 10000),
          description: `${type === 'INCOME' ? 'Receita' : 'Despesa'} - ${originType}`,
          transactionDate: randomDate(new Date(2024, 0, 1), new Date()),
          originType,
          documentNumber: `DOC-${randomInt(1000, 9999)}`,
          notes: 'Transação criada via seed',
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
        },
      });
      createdTransactions.push(transaction);
    }
  }
  console.log(`✅ ${createdTransactions.length} transações financeiras criadas\n`);

  // ============================================
  // CARTEIRA / SALDO DA FILIAL (BranchBalance) + EXTRATO (BankStatement)
  // ============================================
  console.log('🏦 Criando extratos bancários e saldo da filial...');

  for (const branch of createdBranches) {
    const balance = randomDecimal(50000, 250000);

    const branchBalance = await prisma.branchBalance.create({
      data: {
        branchId: branch.id,
        balance,
      },
    });

    // Saldo inicial
    await prisma.balanceAdjustment.create({
      data: {
        branchBalanceId: branchBalance.id,
        previousBalance: new Prisma.Decimal(0),
        newBalance: balance,
        adjustmentType: 'INITIAL_BALANCE',
        reason: 'Saldo inicial via seed',
        createdBy: createdByUserId,
      },
    });

    const adjustmentsCount = randomInt(2, 4);
    let lastBalance = Number(balance);

    for (let i = 0; i < adjustmentsCount; i++) {
      const delta = Number(randomDecimal(5000, 30000));
      const isIncrease = Math.random() < 0.55;
      const nextBalance = isIncrease ? lastBalance + delta : Math.max(0, lastBalance - delta);

      await prisma.balanceAdjustment.create({
        data: {
          branchBalanceId: branchBalance.id,
          previousBalance: new Prisma.Decimal(lastBalance),
          newBalance: new Prisma.Decimal(nextBalance),
          adjustmentType: isIncrease ? 'MANUAL_ADJUSTMENT' : 'CORRECTION',
          reason: 'Ajuste via seed',
          createdBy: createdByUserId,
        },
      });

      lastBalance = nextBalance;
    }

    await prisma.branchBalance.update({
      where: { branchId: branch.id },
      data: { balance: new Prisma.Decimal(lastBalance) },
    });

    const referenceMonth = randomInt(1, 12);
    const referenceYear = randomInt(2024, 2026);

    const statement = await prisma.bankStatement.create({
      data: {
        branchId: branch.id,
        description: `Extrato bancário ${branch.name}`,
        referenceMonth,
        referenceYear,
        createdBy: createdByUserId,
      },
    });

    const branchTx = createdTransactions.filter((t) => t.branchId === branch.id);
    if (!branchTx.length) continue;

    const itemsPerBranch = SEED_VOLUME_MIN;
    for (let i = 0; i < itemsPerBranch; i++) {
      const tx = branchTx[Math.floor(Math.random() * branchTx.length)];
      const type = tx.type === 'INCOME' ? 'CREDIT' : 'DEBIT';

      await prisma.bankStatementItem.create({
        data: {
          bankStatementId: statement.id,
          transactionDate: tx.transactionDate,
          amount: tx.amount,
          description: tx.description ?? undefined,
          type,
          financialTransactionId: tx.id,
        },
      });
    }
  }

  console.log('✅ Extratos e saldo criados.\n');

  // ============================================
  // CONTAS A PAGAR
  // ============================================
  console.log('📋 Criando contas a pagar...');

  const payableStatuses = ['PENDING', 'PAID', 'PENDING', 'PENDING'] as const; // Mais pendentes

  const createdAccountsPayable: AccountPayable[] = [];

  for (const branch of createdBranches) {
    const payablesPerBranch = randomInt(8, 12);
    for (let i = 0; i < payablesPerBranch; i++) {
      const status = payableStatuses[Math.floor(Math.random() * payableStatuses.length)];

      const dueDate = randomDate(new Date(), new Date(2025, 11, 31));
      const paymentDate = status === 'PAID' ? randomDate(new Date(2024, 0, 1), dueDate) : null;

      const accountPayable = await prisma.accountPayable.create({
        data: {
          description: `Conta a pagar #${randomInt(1000, 9999)}`,
          amount: randomDecimal(500, 5000),
          dueDate,
          paymentDate,
          status,
          documentNumber: `NF-${randomInt(1000, 9999)}`,
          notes: 'Conta a pagar criada via seed',
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
        },
      });
      createdAccountsPayable.push(accountPayable);
    }
  }
  console.log(`✅ ${createdAccountsPayable.length} contas a pagar criadas\n`);

  // ============================================
  // CONTAS A RECEBER
  // ============================================
  console.log('💰 Criando contas a receber...');

  const receivableStatuses = ['PENDING', 'RECEIVED', 'PENDING', 'PENDING'] as const;

  const createdAccountsReceivable: AccountReceivable[] = [];

  for (const branch of createdBranches) {
    const receivablesPerBranch = randomInt(8, 12);
    for (let i = 0; i < receivablesPerBranch; i++) {
      const status = receivableStatuses[Math.floor(Math.random() * receivableStatuses.length)];

      const dueDate = randomDate(new Date(), new Date(2025, 11, 31));
      const receiptDate = status === 'RECEIVED' ? randomDate(new Date(2024, 0, 1), dueDate) : null;

      const accountReceivable = await prisma.accountReceivable.create({
        data: {
          description: `Conta a receber #${randomInt(1000, 9999)}`,
          amount: randomDecimal(1000, 10000),
          dueDate,
          receiptDate,
          status,
          documentNumber: `NF-${randomInt(1000, 9999)}`,
          notes: 'Conta a receber criada via seed',
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
        },
      });
      createdAccountsReceivable.push(accountReceivable);
    }
  }
  console.log(`✅ ${createdAccountsReceivable.length} contas a receber criadas\n`);

  // ============================================
  // SALÁRIOS
  // ============================================
  console.log('💼 Criando salários...');

  const createdSalaries: Salary[] = [];

  for (const branch of createdBranches) {
    const branchEmployees = createdEmployees.filter((e) => e.branchId === branch.id);

    // Salários dos últimos 6 meses
    for (let month = 1; month <= 6; month++) {
      for (const employee of branchEmployees) {
        const salary = await prisma.salary.create({
          data: {
            employeeId: employee.id,
            amount: randomDecimal(2000, 8000),
            referenceMonth: month,
            referenceYear: 2024,
            paymentDate: new Date(2024, month - 1, 5),
            description: `Salário ${month}/2024`,
            companyId: DEFAULT_COMPANY_ID,
            branchId: branch.id,
          },
        });
        createdSalaries.push(salary);
      }
    }
  }
  console.log(`✅ ${createdSalaries.length} salários criados\n`);

  // ============================================
  // FÉRIAS
  // ============================================
  console.log('🏖️ Criando férias...');

  const vacationStatuses = ['PLANNED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED'] as const;

  const createdVacations: Vacation[] = [];

  for (const branch of createdBranches) {
    const branchEmployees = createdEmployees.filter((e) => e.branchId === branch.id);
    const vacationsPerBranch = randomInt(5, 10);

    for (let i = 0; i < vacationsPerBranch && i < branchEmployees.length; i++) {
      const employee = branchEmployees[i];
      const status = vacationStatuses[Math.floor(Math.random() * vacationStatuses.length)];
      const days = randomInt(10, 30);
      const startDate = randomDate(new Date(2024, 0, 1), new Date(2024, 11, 31));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);

      const vacation = await prisma.vacation.create({
        data: {
          employeeId: employee.id,
          startDate,
          endDate,
          days,
          status,
          observations: 'Férias criada via seed',
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
        },
      });
      createdVacations.push(vacation);
    }
  }
  console.log(`✅ ${createdVacations.length} registros de férias criados\n`);

  // ============================================
  // DESPESAS
  // ============================================
  console.log('💸 Criando despesas...');

  const expenseTypes = ['TRANSPORT', 'MEAL', 'ACCOMMODATION', 'OTHER'] as const;

  const createdExpenses: Expense[] = [];

  for (const branch of createdBranches) {
    const branchEmployees = createdEmployees.filter((e) => e.branchId === branch.id);

    const expensesPerBranch = randomInt(10, 15);
    for (let i = 0; i < expensesPerBranch; i++) {
      const type = expenseTypes[Math.floor(Math.random() * expenseTypes.length)];
      const employee = branchEmployees.length > 0
        ? branchEmployees[Math.floor(Math.random() * branchEmployees.length)]
        : null;

      const expense = await prisma.expense.create({
        data: {
          employeeId: employee?.id,
          type,
          amount: randomDecimal(50, 500),
          description: `Despesa de ${type.toLowerCase()}`,
          expenseDate: randomDate(new Date(2024, 0, 1), new Date()),
          documentNumber: `REC-${randomInt(1000, 9999)}`,
          companyId: DEFAULT_COMPANY_ID,
          branchId: branch.id,
        },
      });
      createdExpenses.push(expense);
    }
  }
  console.log(`✅ ${createdExpenses.length} despesas criadas\n`);

  // ============================================
  // LOGS DE AUDITORIA
  // ============================================
  console.log('📝 Criando logs de auditoria...');

  const auditActions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'] as const;
  const entityTypes = ['Product', 'Vehicle', 'Employee', 'MaintenanceOrder', 'FinancialTransaction', 'User'];

  const createdAuditLogs: AuditLog[] = [];
  for (let i = 0; i < 100; i++) {
    const action = auditActions[Math.floor(Math.random() * auditActions.length)];
    const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
    const user = createdUsers[Math.floor(Math.random() * createdUsers.length)];

    const auditLog = await prisma.auditLog.create({
      data: {
        entityType,
        entityId: `entity-${randomInt(1000, 9999)}`,
        action,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        companyId: user.companyId || undefined,
        branchId: user.branchId || undefined,
        description: `${entityType} ${action === 'CREATE' ? 'criado' : action === 'UPDATE' ? 'atualizado' : action === 'DELETE' ? 'excluído' : action}`,
        ipAddress: `${randomInt(192, 223)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: randomDate(new Date(2024, 0, 1), new Date()),
      },
    });
    createdAuditLogs.push(auditLog);
  }
  console.log(`✅ ${createdAuditLogs.length} logs de auditoria criados\n`);

  // ============================================
  // RESUMO FINAL
  // ============================================
  console.log('═══════════════════════════════════════════════════════');
  console.log('✨ SEED CONCLUÍDO COM SUCESSO! ✨');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('📊 RESUMO DOS DADOS CRIADOS:\n');
  console.log(`   👥 Roles: ${createdRoles.length}`);
  console.log(`   🔐 Permissões: ${allPermissions.length}`);
  console.log(`   👤 Usuários: ${createdUsers.length}`);
  console.log(`   🏢 Empresa Padrão: Empresa X (ID: ${DEFAULT_COMPANY_ID})`);
  console.log(`   🏪 Filiais: ${createdBranches.length}`);
  console.log(`   📦 Produtos: ${createdProducts.length}`);
  console.log(`   👷 Funcionários: ${createdEmployees.length}`);
  console.log(`   🚛 Veículos: ${createdVehicles.length}`);
  console.log(`   📦 Almoxarifados: ${createdWarehouses.length}`);
  console.log(`   📊 Estoque: ${createdStocks.length}`);
  console.log(`   🔧 Ordens de Manutenção: ${createdMaintenanceOrders.length}`);
  console.log(`   📦 Movimentações de Estoque: ${createdMovements.length}`);
  console.log(`   💵 Transações Financeiras: ${createdTransactions.length}`);
  console.log(`   📋 Contas a Pagar: ${createdAccountsPayable.length}`);
  console.log(`   💰 Contas a Receber: ${createdAccountsReceivable.length}`);
  console.log(`   💼 Salários: ${createdSalaries.length}`);
  console.log(`   🏖️ Férias: ${createdVacations.length}`);
  console.log(`   💸 Despesas: ${createdExpenses.length}`);
  console.log(`   📝 Logs de Auditoria: ${createdAuditLogs.length}`);
  console.log(`   📏 Unidades de Medida: ${createdUnitsOfMeasurement.length}\n`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔑 CREDENCIAIS DE ACESSO:\n');
  console.log('   Todos os usuários têm a senha: senha123');
  console.log('   Exemplos de emails:');
  createdUsers.slice(0, 5).forEach((user) => {
    console.log(`   - ${user.email} (${user.name})`);
  });
  console.log('\n═══════════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
