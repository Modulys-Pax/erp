import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './shared/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from './modules/company/company.module';
import { BranchModule } from './modules/branch/branch.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { CustomerModule } from './modules/customer/customer.module';
import { CostCenterModule } from './modules/cost-center/cost-center.module';
import { FiscalDocumentModule } from './modules/fiscal-document/fiscal-document.module';
import { UserModule } from './modules/user/user.module';
import { ProductModule } from './modules/product/product.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { BenefitModule } from './modules/benefit/benefit.module';
import { VehicleModule } from './modules/vehicle/vehicle.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { StockModule } from './modules/stock/stock.module';
import { FinancialTransactionModule } from './modules/financial-transaction/financial-transaction.module';
import { AccountPayableModule } from './modules/account-payable/account-payable.module';
import { AccountReceivableModule } from './modules/account-receivable/account-receivable.module';
import { SalaryModule } from './modules/salary/salary.module';
import { VacationModule } from './modules/vacation/vacation.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { AuditModule } from './modules/audit/audit.module';
import { RoleModule } from './modules/role/role.module';
import { UnitOfMeasurementModule } from './modules/unit-of-measurement/unit-of-measurement.module';
import { VehicleBrandModule } from './modules/vehicle-brand/vehicle-brand.module';
import { VehicleModelModule } from './modules/vehicle-model/vehicle-model.module';
import { VehicleDocumentModule } from './modules/vehicle-document/vehicle-document.module';
import { VehicleMarkingModule } from './modules/vehicle-marking/vehicle-marking.module';
import { MaintenanceLabelModule } from './modules/maintenance-label/maintenance-label.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { FinancialModule } from './modules/financial/financial.module';
import { BankReconciliationModule } from './modules/bank-reconciliation/bank-reconciliation.module';
import { PurchaseOrderModule } from './modules/purchase-order/purchase-order.module';
import { SalesOrderModule } from './modules/sales-order/sales-order.module';
import { TripModule } from './modules/trip/trip.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ChatModule } from './modules/chat/chat.module';
import { ConfigService } from './shared/config/config.service';
import { BranchFilterInterceptor } from './shared/interceptors/branch-filter.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [ConfigService.load],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    CompanyModule,
    BranchModule,
    SupplierModule,
    CustomerModule,
    CostCenterModule,
    FiscalDocumentModule,
    UserModule,
    ProductModule,
    EmployeeModule,
    BenefitModule,
    VehicleModule,
    MaintenanceModule,
    StockModule,
    FinancialTransactionModule,
    AccountPayableModule,
    AccountReceivableModule,
    SalaryModule,
    VacationModule,
    ExpenseModule,
    AuditModule,
    RoleModule,
    UnitOfMeasurementModule,
    VehicleBrandModule,
    VehicleModelModule,
    VehicleDocumentModule,
    VehicleMarkingModule,
    MaintenanceLabelModule,
    WalletModule,
    FinancialModule,
    BankReconciliationModule,
    PurchaseOrderModule,
    SalesOrderModule,
    TripModule,
    ReportsModule,
    ChatModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: BranchFilterInterceptor,
    },
  ],
})
export class AppModule {}
