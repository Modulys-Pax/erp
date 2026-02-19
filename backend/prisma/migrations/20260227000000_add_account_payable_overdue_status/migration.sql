-- AlterEnum: add OVERDUE to AccountPayableStatus (contas com data de vencimento já passada)
ALTER TYPE "AccountPayableStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
