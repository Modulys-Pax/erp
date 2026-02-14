import { PrismaClient, Prisma, Company, Branch, Role, Permission, User, Product, Employee, Vehicle, Warehouse, Stock, MaintenanceOrder, StockMovement, FinancialTransaction, AccountPayable, AccountReceivable, Salary, Vacation, Expense, AuditLog, UnitOfMeasurement } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ID da empresa padrão (será preenchido após criação)
let DEFAULT_COMPANY_ID = '9d8fb179-ede4-4ea5-98d2-6db222ba6f66';

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

async function main() {
  console.log('🌱 Iniciando seed completo...\n');

  // Limpar dados existentes (cuidado em produção!)
  console.log('🧹 Limpando dados existentes...');
  await prisma.auditLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.vacation.deleteMany();
  await prisma.salary.deleteMany();
  await prisma.fiscalDocument.deleteMany();
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
  await prisma.vehicleStatusHistory.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.costCenter.deleteMany();
  await prisma.bankStatementItem.deleteMany();
  await prisma.bankStatement.deleteMany();
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

  // Criar algumas permissões básicas
  const permissions = [
    { name: 'users.create', description: 'Criar usuários', module: 'users', action: 'create' },
    { name: 'users.read', description: 'Ler usuários', module: 'users', action: 'read' },
    { name: 'users.update', description: 'Atualizar usuários', module: 'users', action: 'update' },
    { name: 'users.delete', description: 'Excluir usuários', module: 'users', action: 'delete' },
    { name: 'vehicles.create', description: 'Criar veículos', module: 'vehicles', action: 'create' },
    { name: 'vehicles.read', description: 'Ler veículos', module: 'vehicles', action: 'read' },
    { name: 'maintenance.create', description: 'Criar ordens de manutenção', module: 'maintenance', action: 'create' },
    { name: 'financial.read', description: 'Ler dados financeiros', module: 'financial', action: 'read' },
    { name: 'financial.create', description: 'Criar transações financeiras', module: 'financial', action: 'create' },
  ];

  const createdPermissions: Permission[] = [];
  for (const permData of permissions) {
    const perm = await prisma.permission.create({
      data: permData,
    });
    createdPermissions.push(perm);
  }
  console.log(`✅ ${createdPermissions.length} permissões criadas\n`);

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
    const employeesPerBranch = randomInt(5, 8);
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
      const vehiclesPerBranch = randomInt(5, 8);
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

  const maintenanceTypes = ['PREVENTIVE', 'CORRECTIVE'] as const;
  const maintenanceStatuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'PAUSED'] as const;

  const createdMaintenanceOrders: MaintenanceOrder[] = [];
  let orderNumber = 1;

  for (const branch of createdBranches) {
    const branchVehicles = createdVehicles.filter((v) => v.branchId === branch.id);
    const branchEmployees = createdEmployees.filter((e) => e.branchId === branch.id);

    const ordersPerBranch = randomInt(8, 12);
    for (let i = 0; i < ordersPerBranch && i < branchVehicles.length; i++) {
        const vehicle = branchVehicles[i];
        const type = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
        const status = maintenanceStatuses[Math.floor(Math.random() * maintenanceStatuses.length)];

        const maintenanceOrder = await prisma.maintenanceOrder.create({
          data: {
            orderNumber: `OM-${String(orderNumber).padStart(6, '0')}`,
            vehicles: { create: [{ vehicleId: vehicle.id }] },
            type,
            status,
            kmAtEntry: vehicle.currentKm ? vehicle.currentKm - randomInt(1000, 10000) : randomInt(50000, 400000),
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
                cost: randomDecimal(100, 2000),
              },
            });
          }
        }

        // Adicionar materiais consumidos
        const branchProducts = createdProducts.filter(
          (p) => p.branchId === branch.id,
        );
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
          }
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
        if (status === 'COMPLETED') {
          await prisma.maintenanceTimeline.create({
            data: {
              maintenanceOrderId: maintenanceOrder.id,
              event: 'COMPLETED',
              notes: 'Manutenção concluída com sucesso',
            },
          });
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

    const movementsPerBranch = randomInt(20, 30);
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
  // TRANSAÇÕES FINANCEIRAS
  // ============================================
  console.log('💵 Criando transações financeiras...');

  const transactionTypes = ['INCOME', 'EXPENSE'] as const;
  const originTypes = ['MAINTENANCE', 'STOCK', 'HR', 'MANUAL'] as const;

  const createdTransactions: FinancialTransaction[] = [];

  for (const branch of createdBranches) {
    const transactionsPerBranch = randomInt(15, 25);

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
  console.log(`   🔐 Permissões: ${createdPermissions.length}`);
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
