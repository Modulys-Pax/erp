import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { ALL_PERMISSIONS } from '../src/shared/constants/permissions.constants';

const prisma = new PrismaClient();

/**
 * Script para criar o usuário admin e a empresa padrão do sistema
 * 
 * Este script:
 * 1. Cria a empresa padrão (single-tenant)
 * 2. Cria o role 'admin' se não existir
 * 3. Cria o usuário admin
 * 4. Atualiza o arquivo de constantes com o DEFAULT_COMPANY_ID
 * 
 * Uso:
 *   npx ts-node prisma/setup-admin.ts
 * 
 * ou
 * 
 *   npm run setup:admin (se configurado no package.json)
 */

async function main() {
  console.log('🚀 Iniciando setup do admin e empresa...\n');

  try {
    // ============================================
    // 1. CRIAR ROLE ADMIN (se não existir)
    // ============================================
    console.log('👥 Verificando role admin...');
    
    let adminRole = await prisma.role.findFirst({
      where: { 
        OR: [
          { name: 'admin' },
          { name: 'ADMIN' },
        ],
      },
    });

    if (!adminRole) {
      console.log('   Criando role admin...');
      adminRole = await prisma.role.create({
        data: {
          name: 'ADMIN',
          description: 'Administrador do sistema - Acesso total',
          active: true,
        },
      });
      console.log(`   ✅ Role admin criada (ID: ${adminRole.id})`);
    } else {
      // Atualizar nome para ADMIN maiúsculo se necessário
      if (adminRole.name !== 'ADMIN') {
        adminRole = await prisma.role.update({
          where: { id: adminRole.id },
          data: { name: 'ADMIN' },
        });
      }
      console.log(`   ✅ Role admin já existe (ID: ${adminRole.id})`);
    }

    // ============================================
    // 1.1 SINCRONIZAR PERMISSÕES DO SISTEMA
    // ============================================
    console.log('\n🔐 Sincronizando permissões do sistema...');

    let permissionsCreated = 0;
    let permissionsUpdated = 0;

    for (const permission of ALL_PERMISSIONS) {
      const existingPermission = await prisma.permission.findUnique({
        where: { name: permission.name },
      });

      if (!existingPermission) {
        await prisma.permission.create({
          data: {
            name: permission.name,
            description: permission.description,
            module: permission.module,
            action: permission.action,
          },
        });
        permissionsCreated++;
      } else {
        await prisma.permission.update({
          where: { id: existingPermission.id },
          data: {
            description: permission.description,
            module: permission.module,
            action: permission.action,
          },
        });
        permissionsUpdated++;
      }
    }

    console.log(`   ✅ ${permissionsCreated} permissão(ões) criada(s)`);
    console.log(`   ✅ ${permissionsUpdated} permissão(ões) atualizada(s)`);
    console.log(`   📋 Total de permissões no sistema: ${ALL_PERMISSIONS.length}`)

    // ============================================
    // 2. CRIAR EMPRESA PADRÃO
    // ============================================
    console.log('\n🏢 Criando empresa padrão do sistema...');

    const defaultCompany = await prisma.company.upsert({
      where: { cnpj: '00000000000000' },
      update: {
        name: 'Empresa X',
        tradeName: 'Empresa X',
        email: 'contato@empresax.com.br',
        phone: '(11) 3456-7890',
        address: 'Endereço da Empresa X',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '00000-000',
      },
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

    const DEFAULT_COMPANY_ID = defaultCompany.id;
    console.log(`   ✅ Empresa padrão criada/atualizada:`);
    console.log(`      Nome: ${defaultCompany.name}`);
    console.log(`      ID: ${DEFAULT_COMPANY_ID}`);

    // ============================================
    // 3. CRIAR FILIAL MATRIZ
    // ============================================
    console.log('\n🏬 Criando filial matriz...');

    let matrixBranch = await prisma.branch.findFirst({
      where: {
        companyId: DEFAULT_COMPANY_ID,
        code: 'MATRIZ',
        deletedAt: null,
      },
    });

    if (!matrixBranch) {
      matrixBranch = await prisma.branch.create({
        data: {
          name: 'Matriz',
          code: 'MATRIZ',
          companyId: DEFAULT_COMPANY_ID,
          email: 'matriz@empresax.com.br',
          phone: '(11) 3456-7890',
          address: 'Endereço da Matriz',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '00000-000',
          active: true,
        },
      });
      console.log(`   ✅ Filial matriz criada:`);
      console.log(`      Nome: ${matrixBranch.name}`);
      console.log(`      Código: ${matrixBranch.code}`);
      console.log(`      ID: ${matrixBranch.id}`);
    } else {
      console.log(`   ✅ Filial matriz já existe:`);
      console.log(`      Nome: ${matrixBranch.name}`);
      console.log(`      Código: ${matrixBranch.code}`);
      console.log(`      ID: ${matrixBranch.id}`);
    }

    // Criar saldo inicial para a filial matriz
    const existingBalance = await prisma.branchBalance.findUnique({
      where: { branchId: matrixBranch.id },
    });

    if (!existingBalance) {
      await prisma.branchBalance.create({
        data: {
          branchId: matrixBranch.id,
          balance: 0,
        },
      });
      console.log(`   ✅ Saldo inicial da filial criado (R$ 0,00)`);
    }

    // ============================================
    // 4. CRIAR MARCAS E MODELOS DE VEÍCULOS
    // ============================================
    console.log('\n🚗 Criando marcas e modelos de veículos...');

    const vehicleBrandsData = [
      { name: 'Volvo', models: ['FH 540', 'FH 460', 'FM 370', 'VM 330', 'VM 270'] },
      { name: 'Scania', models: ['R 450', 'R 500', 'S 500', 'P 360', 'G 410'] },
      { name: 'Mercedes-Benz', models: ['Actros 2651', 'Actros 2546', 'Axor 2544', 'Atego 2430', 'Atego 1719'] },
      { name: 'DAF', models: ['XF 530', 'XF 480', 'CF 85', 'LF 55'] },
      { name: 'MAN', models: ['TGX 29.480', 'TGX 28.440', 'TGS 26.440', 'TGM 24.280'] },
      { name: 'Iveco', models: ['S-Way 570', 'S-Way 480', 'Hi-Way 560', 'Tector 240'] },
      { name: 'Volkswagen', models: ['Constellation 25.420', 'Constellation 19.420', 'Delivery 11.180', 'Delivery 9.170'] },
      { name: 'Ford', models: ['Cargo 2842', 'Cargo 1723', 'Cargo 816'] },
    ];

    let brandsCreated = 0;
    let modelsCreated = 0;

    for (const brandData of vehicleBrandsData) {
      // Verificar se marca já existe
      let brand = await prisma.vehicleBrand.findFirst({
        where: { name: brandData.name },
      });

      if (!brand) {
        brand = await prisma.vehicleBrand.create({
          data: { name: brandData.name, active: true },
        });
        brandsCreated++;
      }

      // Criar modelos para a marca
      for (const modelName of brandData.models) {
        const existingModel = await prisma.vehicleModel.findFirst({
          where: { name: modelName, brandId: brand.id },
        });

        if (!existingModel) {
          await prisma.vehicleModel.create({
            data: {
              name: modelName,
              brandId: brand.id,
              active: true,
            },
          });
          modelsCreated++;
        }
      }
    }

    console.log(`   ✅ ${brandsCreated} marca(s) criada(s)`);
    console.log(`   ✅ ${modelsCreated} modelo(s) criado(s)`);

    // ============================================
    // 6. SALVAR DEFAULT_COMPANY_ID EM ARQUIVO DE CONSTANTES
    // ============================================
    console.log('\n📝 Salvando constante DEFAULT_COMPANY_ID...');

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
 * Este arquivo é gerado automaticamente pelo setup-admin.
 * NÃO edite manualmente.
 */

export const DEFAULT_COMPANY_ID = '${DEFAULT_COMPANY_ID}';

/**
 * Valida se o DEFAULT_COMPANY_ID está configurado
 */
export function validateDefaultCompanyId(): void {
  if (!DEFAULT_COMPANY_ID) {
    throw new Error(
      'DEFAULT_COMPANY_ID não está configurado. Execute o setup-admin primeiro.',
    );
  }
}
`;

    // Criar diretório se não existir
    const constantsDir = path.dirname(constantsPath);
    if (!fs.existsSync(constantsDir)) {
      fs.mkdirSync(constantsDir, { recursive: true });
    }

    fs.writeFileSync(constantsPath, constantsContent, 'utf-8');
    console.log(`   ✅ Constante salva em: ${constantsPath}`);

    // ============================================
    // 6.1 SALVAR DEFAULT_COMPANY_ID NO FRONTEND
    // ============================================
    const frontendConstantsPath = path.join(__dirname, '../../frontend/lib/constants/company.constants.ts');
    const frontendConstantsContent = `/**
 * Constante da Empresa Padrão do Sistema
 * 
 * Esta constante armazena o ID da empresa única do sistema.
 * O sistema funciona como single-tenant, mas está preparado
 * para se tornar SaaS no futuro.
 * 
 * IMPORTANTE: Este ID deve corresponder ao DEFAULT_COMPANY_ID
 * do backend. Mantenha sincronizado.
 * 
 * Este arquivo é gerado automaticamente pelo setup-admin.
 * NÃO edite manualmente.
 */

export const DEFAULT_COMPANY_ID = '${DEFAULT_COMPANY_ID}';
`;

    const frontendConstantsDir = path.dirname(frontendConstantsPath);
    if (!fs.existsSync(frontendConstantsDir)) {
      fs.mkdirSync(frontendConstantsDir, { recursive: true });
    }

    fs.writeFileSync(frontendConstantsPath, frontendConstantsContent, 'utf-8');
    console.log(`   ✅ Constante salva no frontend: ${frontendConstantsPath}`);

    // ============================================
    // 7. CRIAR USUÁRIO ADMIN
    // ============================================
    console.log('\n👤 Criando usuário admin...');

    const adminEmail = 'admin@erp.com';
    const adminPassword = 'senha123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Verificar se usuário já existe
    const existingAdmin = await prisma.user.findFirst({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      // Atualizar usuário existente
      const updatedAdmin = await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          name: 'Administrador Sistema',
          password: hashedPassword,
          roleId: adminRole.id,
          companyId: DEFAULT_COMPANY_ID,
          branchId: matrixBranch.id, // Admin associado à matriz
          active: true,
          deletedAt: null,
        },
        include: {
          role: true,
          branch: true,
        },
      });

      console.log(`   ✅ Usuário admin atualizado:`);
      console.log(`      Email: ${updatedAdmin.email}`);
      console.log(`      Nome: ${updatedAdmin.name}`);
      console.log(`      Role: ${updatedAdmin.role.name}`);
      console.log(`      Filial: ${updatedAdmin.branch?.name || 'N/A'}`);
      console.log(`      ID: ${updatedAdmin.id}`);
    } else {
      // Criar novo usuário admin
      const newAdmin = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Administrador Sistema',
          roleId: adminRole.id,
          companyId: DEFAULT_COMPANY_ID,
          branchId: matrixBranch.id, // Admin associado à matriz
          active: true,
        },
        include: {
          role: true,
          branch: true,
        },
      });

      console.log(`   ✅ Usuário admin criado:`);
      console.log(`      Email: ${newAdmin.email}`);
      console.log(`      Nome: ${newAdmin.name}`);
      console.log(`      Role: ${newAdmin.role.name}`);
      console.log(`      Filial: ${newAdmin.branch?.name || 'N/A'}`);
      console.log(`      ID: ${newAdmin.id}`);
    }

    console.log(`\n   🔑 Credenciais de acesso:`);
    console.log(`      Email: ${adminEmail}`);
    console.log(`      Senha: ${adminPassword}`);

    // ============================================
    // RESUMO
    // ============================================
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✨ SETUP CONCLUÍDO COM SUCESSO! ✨');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📊 RESUMO:');
    console.log(`   🏢 Empresa: ${defaultCompany.name} (ID: ${DEFAULT_COMPANY_ID})`);
    console.log(`   🏬 Filial Matriz: ${matrixBranch.name} (ID: ${matrixBranch.id})`);
    console.log(`   👤 Admin: ${adminEmail}`);
    console.log(`   🔑 Senha: ${adminPassword}`);
    console.log('\n');

  } catch (error) {
    console.error('❌ Erro durante o setup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
