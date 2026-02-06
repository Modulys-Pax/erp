# Plano de implementação — CORE (fluxos completos, sem emissão NF-e)

**Objetivo:** Implementar os itens do núcleo para fluxos completos e boa reunião. Emissão de notas (NF-e/NFSe) fica para depois, quando houver certificado digital; o modelo de dados e telas devem estar prontos para essa integração futura.

---

## Escopo

| Item | Implementar agora | Deixar para depois |
|------|-------------------|--------------------|
| Fornecedor e Cliente | ✅ Cadastro + vínculo em CP/CR | — |
| Documento fiscal (rastreabilidade) | ✅ Cadastro de nota (entrada/saída), vínculo CP/CR/transação; estrutura pronta para NF-e | Emissão NF-e/NFSe (certificado digital) |
| Centro de custo | ✅ Um nível + campo opcional em transação/CP/CR/despesa | — |
| Fluxo de caixa projetado | ✅ Próximos 3–6 meses por filial | — |
| DRE simplificada (resultado por período) | ✅ Receitas − despesas por mês/ano, por origem e opcional por centro de custo | — |
| Pedido de compra | ✅ PC com fornecedor, itens, status; ação "Receber" → entrada estoque (+ opcional CP) | Aprovações múltiplas, conferência física |
| Emissão de notas | — | ✅ Após certificado digital; integração SEFAZ/NF-e |

---

## Fase 1 — Cadastros base (Fornecedor, Cliente, Centro de custo)

### 1.1 Fornecedor (Supplier)
- **Prisma:** `Supplier`: id, name, document (CNPJ/CPF), email?, phone?, address?, city?, state?, zipCode?, companyId, branchId, active, createdAt, updatedAt, createdBy?, deletedAt?
- **Backend:** módulo `supplier` (CRUD, listagem paginada, filtro por filial).
- **Frontend:** `/suppliers` (list + create/edit), SearchableSelect de fornecedor onde fizer sentido (ex.: CP, PC).
- **Vínculo:** `AccountPayable.supplierId` (opcional).

### 1.2 Cliente (Customer)
- **Prisma:** `Customer`: mesmos campos conceituais que Supplier (name, document, contact, address, companyId, branchId, active, ...).
- **Backend:** módulo `customer` (CRUD, listagem paginada).
- **Frontend:** `/customers` (list + create/edit), SearchableSelect em CR.
- **Vínculo:** `AccountReceivable.customerId` (opcional).

### 1.3 Centro de custo (CostCenter)
- **Prisma:** `CostCenter`: id, code, name, companyId, branchId, active, createdAt, updatedAt, createdBy?, deletedAt?
- **Backend:** módulo `cost-center` (CRUD, listagem).
- **Frontend:** `/cost-centers` (list + create/edit), campo opcional em formulários de transação, CP, CR, despesa.
- **Vínculo:** `FinancialTransaction.costCenterId?`, `AccountPayable.costCenterId?`, `AccountReceivable.costCenterId?`, `Expense.costCenterId?` (todos opcionais).

---

## Fase 2 — Documento fiscal (rastreabilidade, preparado para NF-e)

- **Prisma:** `FiscalDocument`: id, type (ENTRY | EXIT), number, series?, issueDate, totalAmount, status (REGISTERED | CANCELLED), companyId, branchId, supplierId?, customerId?, accountPayableId?, accountReceivableId?, financialTransactionId?, notes?, createdAt, updatedAt, createdBy?, deletedAt?. Campos opcionais para futura NF-e: externalKey?, issuedAt?, xmlPath? (preenchidos quando houver integração).
- **Backend:** módulo `fiscal-document` (CRUD, listagem por filial/período, filtro por tipo e status). Não gera XML nem chama SEFAZ.
- **Frontend:** `/fiscal-documents` (list + create/edit), vínculo ao criar/editar CP/CR ou transação (opcional). Na listagem, link para CP/CR/transação vinculada.
- **Fluxo:** Usuário cadastra nota de terceiro (entrada/saída) e opcionalmente associa a uma CP, CR ou transação. Quando existir emissão, o mesmo modelo pode ganhar registro vindo da integração.

---

## Fase 3 — Financeiro (fluxo de caixa projetado + DRE simplificada)

### 3.1 Fluxo de caixa projetado
- **Backend:** endpoint em `Wallet` (ou novo `CashFlowController`): `GET /wallet/:branchId/cash-flow-projection?months=6` (default 6). Retorno: array por mês (ano-mês, saldoInicial, totalRecebimentosPrevistos, totalPagamentosPrevistos, saldoProjetadoFinal). Base: CP/CR pendentes com dueDate no mês; saldo inicial = BranchBalance no primeiro mês, depois saldo projetado do mês anterior.
- **Frontend:** no dashboard ou em `/financial`, seção ou página "Fluxo de caixa projetado" (tabela e/ou gráfico dos próximos N meses).

### 3.2 Resultado por período (DRE simplificada)
- **Backend:** endpoint `GET /financial/result-by-period?branchId=&month=&year=&costCenterId=` (todos opcionais; costCenterId para quebra). Retorno: receitas (CR recebidas + transações INCOME no período), despesas (CP pagas + transações EXPENSE + despesas Expense no período), resultado (receitas − despesas), e opcionalmente quebra por originType e por costCenterId.
- **Frontend:** relatório em `/financial` (ex.: aba "Resultado por período" ou página dedicada) com filtros mês/ano e centro de custo.

---

## Fase 4 — Pedido de compra

- **Prisma:** `PurchaseOrder`: id, orderNumber (gerado), supplierId, expectedDeliveryDate?, status (DRAFT | SENT | PARTIALLY_RECEIVED | RECEIVED | CANCELLED), companyId, branchId, createdAt, updatedAt, createdBy?, deletedAt?. `PurchaseOrderItem`: id, purchaseOrderId, productId, quantity, unitPrice?, totalPrice? (calculado).
- **Backend:** módulo `purchase-order` (CRUD, listagem, transição de status). Ação `receive` (parcial ou total): recebe lista de itens com quantidades recebidas; gera StockMovement (ENTRY) por item; opcionalmente cria AccountPayable (uma por PC ou por item, conforme regra de negócio); atualiza status do PC (PARTIALLY_RECEIVED ou RECEIVED).
- **Frontend:** `/purchase-orders` (list + create/edit), tela de "Receber" com itens e quantidades, botão que chama o endpoint de recebimento e redireciona para estoque ou para o próprio PC.

---

## Ordem de execução sugerida

1. **Fase 1** — Fornecedor, Cliente, Centro de custo (model + backend + frontend + vínculos em CP/CR e transação/despesa).
2. **Fase 2** — Documento fiscal (model + backend + frontend + vínculos; estrutura pronta para NF-e).
3. **Fase 3** — Fluxo de caixa projetado + DRE simplificada (backend + frontend).
4. **Fase 4** — Pedido de compra (model + backend + frontend + ação Receber).

---

## Permissões (RBAC)

- Incluir no seed de permissions (e em roles conforme necessário):
  - `suppliers.read`, `suppliers.create`, `suppliers.update`, `suppliers.delete`
  - `customers.read`, `customers.create`, `customers.update`, `customers.delete`
  - `cost-centers.read`, `cost-centers.create`, `cost-centers.update`, `cost-centers.delete`
  - `fiscal-documents.read`, `fiscal-documents.create`, `fiscal-documents.update`, `fiscal-documents.delete`
  - `purchase-orders.read`, `purchase-orders.create`, `purchase-orders.update`, `purchase-orders.delete`, `purchase-orders.receive`

---

## Integração futura NF-e

Quando houver certificado digital e integração de emissão:

- Reaproveitar `FiscalDocument`; adicionar campos (externalKey, issuedAt, xmlPath, status ISSUED/CANCELLED pela SEFAZ).
- Novo serviço (ex.: `NfeEmissionService`) que chama provedor/API de NF-e e persiste em `FiscalDocument`.
- Telas: manter cadastro manual atual; adicionar fluxo "Emitir NF-e" que preenche dados e chama o serviço de emissão. Nenhuma alteração quebra o fluxo de "apenas rastreabilidade" já implementado.
