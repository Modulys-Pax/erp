# Plano de implementação — Bater de frente com o TOTVS

**Objetivo:** Entregar um ERP que compita de frente com o TOTVS em abrangência de módulos e fluxos, mantendo usabilidade e simplicidade onde possível. Emissão de NF-e/NFSe fica para após certificado digital; a estrutura de documento fiscal já fica pronta para essa integração.

**Referência TOTVS:** Contabilidade, Financeiro (Plano de Contas, CP/CR, Fluxo de Caixa, Tesouraria, Conciliação), Estoque/Custos, Compras, Vendas, Fiscal (registro/emissão), RH, Relatórios e exportação.

---

## Visão geral do escopo

| Área | O que entregamos | Equivalente TOTVS |
|------|-------------------|-------------------|
| Cadastros terceiros | Fornecedor, Cliente, Centro de custo | Compras/Vendas/Contábil |
| Fiscal | Documento fiscal (rastreabilidade); estrutura para NF-e | Fiscal (registro); emissão depois |
| Financeiro | CP/CR, Carteira, Fluxo projetado, DRE, Conciliação bancária simples | Financeiro + Tesouraria |
| Compras | Pedido de compra + Receber → estoque/CP | Compras |
| Vendas | Pedido de venda → CR (+ baixa estoque opcional) | Vendas |
| Relatórios | Por período, por fornecedor/cliente, por centro de custo; exportação PDF/Excel | BI / Relatórios |
| Emissão NF-e | — (depois, com certificado) | Emissão fiscal |

---

## Fase 1 — Cadastros base (Fornecedor, Cliente, Centro de custo)

### 1.1 Fornecedor (Supplier)
- **Prisma:** `Supplier`: id, name, document (CNPJ/CPF), email?, phone?, address?, city?, state?, zipCode?, companyId, branchId, active, createdAt, updatedAt, createdBy?, deletedAt?
- **Backend:** módulo `supplier` (CRUD, listagem paginada, filtro por filial).
- **Frontend:** `/suppliers` (listagem, criar, editar), SearchableSelect em CP e em Pedido de compra.
- **Vínculo:** `AccountPayable.supplierId` (opcional).

### 1.2 Cliente (Customer)
- **Prisma:** `Customer`: id, name, document, email?, phone?, address?, city?, state?, zipCode?, companyId, branchId, active, createdAt, updatedAt, createdBy?, deletedAt?
- **Backend:** módulo `customer` (CRUD, listagem paginada).
- **Frontend:** `/customers` (listagem, criar, editar), SearchableSelect em CR e em Pedido de venda.
- **Vínculo:** `AccountReceivable.customerId` (opcional).

### 1.3 Centro de custo (CostCenter)
- **Prisma:** `CostCenter`: id, code, name, companyId, branchId, active, createdAt, updatedAt, createdBy?, deletedAt?
- **Backend:** módulo `cost-center` (CRUD, listagem).
- **Frontend:** `/cost-centers` (listagem, criar, editar); campo opcional em Transação, CP, CR e Despesa.
- **Vínculos:** `FinancialTransaction.costCenterId?`, `AccountPayable.costCenterId?`, `AccountReceivable.costCenterId?`, `Expense.costCenterId?` (opcionais).

---

## Fase 2 — Documento fiscal (rastreabilidade, preparado para NF-e)

- **Prisma:** `FiscalDocument`: id, type (ENTRY | EXIT), number, series?, issueDate, totalAmount, status (REGISTERED | CANCELLED), companyId, branchId, supplierId?, customerId?, accountPayableId?, accountReceivableId?, financialTransactionId?, notes?, externalKey?, issuedAt?, xmlPath?, createdAt, updatedAt, createdBy?, deletedAt?
- **Backend:** módulo `fiscal-document` (CRUD, listagem por filial/período/tipo/status). Sem chamada SEFAZ.
- **Frontend:** `/fiscal-documents` (listagem, criar, editar); opção de vincular a CP/CR/transação; na listagem, link para o documento vinculado.
- **Futuro:** Emissão NF-e preenche externalKey, issuedAt, xmlPath e status.

---

## Fase 3 — Financeiro (fluxo de caixa projetado, DRE, conciliação)

### 3.1 Fluxo de caixa projetado
- **Backend:** `GET /wallet/:branchId/cash-flow-projection?months=6`. Retorno: por mês (ano-mês, saldoInicial, totalRecebimentosPrevistos, totalPagamentosPrevistos, saldoProjetadoFinal).
- **Frontend:** Dashboard ou `/financial`: seção "Fluxo de caixa projetado" (tabela e/ou gráfico).

### 3.2 Resultado por período (DRE simplificada)
- **Backend:** `GET /financial/result-by-period?branchId=&month=&year=&costCenterId=`. Retorno: receitas, despesas, resultado, quebra por originType e por costCenterId.
- **Frontend:** Relatório em `/financial` com filtros; exportação PDF/Excel (ver Fase 6).

### 3.3 Conciliação bancária (simples)
- **Prisma:** `BankStatement` (extrato): id, branchId, description?, referenceMonth, referenceYear, uploadedAt, createdAt, createdBy. `BankStatementItem`: id, bankStatementId, transactionDate, amount, description?, type (CREDIT | DEBIT), financialTransactionId? (vínculo conciliado), createdAt.
- **Backend:** upload de planilha (CSV/Excel) ou cadastro manual de itens; listagem de itens do extrato; endpoint "conciliar" (associar item do extrato a uma FinancialTransaction); relatório de itens conciliados vs não conciliados.
- **Frontend:** `/financial/bank-reconciliation`: upload ou entrada manual, lista de itens, tela para vincular item do extrato a uma transação do sistema, indicador de conciliado/não conciliado.

---

## Fase 4 — Pedido de compra

- **Prisma:** `PurchaseOrder`: id, orderNumber (gerado), supplierId, expectedDeliveryDate?, status (DRAFT | SENT | PARTIALLY_RECEIVED | RECEIVED | CANCELLED), companyId, branchId, createdAt, updatedAt, createdBy?, deletedAt?. `PurchaseOrderItem`: id, purchaseOrderId, productId, quantity, unitPrice?, totalPrice? (calculado).
- **Backend:** CRUD, listagem, ação `receive` (itens e quantidades recebidas → StockMovement ENTRY por item; opcionalmente uma AccountPayable por PC ou regra definida); atualização de status (PARTIALLY_RECEIVED / RECEIVED).
- **Frontend:** `/purchase-orders` (listagem, criar, editar), tela "Receber" com itens e quantidades.

---

## Fase 5 — Pedido de venda

- **Prisma:** `SalesOrder`: id, orderNumber (gerado), customerId, orderDate, status (DRAFT | CONFIRMED | PARTIALLY_DELIVERED | DELIVERED | CANCELLED), companyId, branchId, createdAt, updatedAt, createdBy?, deletedAt?. `SalesOrderItem`: id, salesOrderId, productId, quantity, unitPrice?, totalPrice? (calculado). Vínculo: ao "faturar" ou "entregar", gera AccountReceivable (uma por PV ou por item) e opcionalmente StockMovement (EXIT) por item.
- **Backend:** CRUD, listagem, ação "faturar" ou "gerar CR" (cria CR a partir do PV; opcionalmente baixa estoque).
- **Frontend:** `/sales-orders` (listagem, criar, editar), ação "Faturar" que gera CR (e opcionalmente saída de estoque).

---

## Fase 6 — Relatórios e exportação

### 6.1 Relatórios por terceiro
- **Backend:** `GET /account-payable/by-supplier?branchId=&period=` (agrupado por fornecedor, totais). `GET /account-receivable/by-customer?branchId=&period=` (agrupado por cliente, totais).
- **Frontend:** Em `/accounts-payable` e `/accounts-receivable` (ou em `/financial`): abas ou seções "Por fornecedor" e "Por cliente" com totais e lista; exportação PDF/Excel.

### 6.2 Exportação de relatórios (PDF e Excel)
- **Escopo:** Fluxo de caixa projetado, Resultado por período (DRE), Contas a pagar por fornecedor, Contas a receber por cliente, Listagem de documento fiscal (por período). Usar mesma abordagem já existente no projeto (ex.: jsPDF, lib Excel).
- **Backend:** Endpoints que retornam os dados já existem; pode-se adicionar query param `?format=pdf` ou `?format=xlsx` e retornar arquivo, ou o frontend gera o arquivo a partir do JSON (recomendado para consistência com o restante do front).
- **Frontend:** Botão "Exportar PDF" e "Exportar Excel" em cada relatório relevante.

---

## Ordem de execução

| Ordem | Fase | Dependências |
|-------|------|--------------|
| 1 | Fase 1 — Fornecedor, Cliente, Centro de custo | Nenhuma |
| 2 | Fase 2 — Documento fiscal | Fase 1 (supplier/customer opcionais no doc) |
| 3 | Fase 3 — Fluxo projetado + DRE + Conciliação bancária | Fase 1 (centro de custo na DRE) |
| 4 | Fase 4 — Pedido de compra | Fase 1 (fornecedor) |
| 5 | Fase 5 — Pedido de venda | Fase 1 (cliente) |
| 6 | Fase 6 — Relatórios por terceiro + Exportação PDF/Excel | Fases 1–5 |

---

## Permissões (RBAC)

Incluir no seed e nas roles:

- `suppliers.read`, `suppliers.create`, `suppliers.update`, `suppliers.delete`
- `customers.read`, `customers.create`, `customers.update`, `customers.delete`
- `cost-centers.read`, `cost-centers.create`, `cost-centers.update`, `cost-centers.delete`
- `fiscal-documents.read`, `fiscal-documents.create`, `fiscal-documents.update`, `fiscal-documents.delete`
- `purchase-orders.read`, `purchase-orders.create`, `purchase-orders.update`, `purchase-orders.delete`, `purchase-orders.receive`
- `sales-orders.read`, `sales-orders.create`, `sales-orders.update`, `sales-orders.delete`, `sales-orders.invoice`
- `bank-reconciliation.read`, `bank-reconciliation.manage` (upload, conciliar)

---

## O que não entra neste plano (e por quê)

| TOTVS / Mercado | Decisão | Motivo |
|-----------------|---------|--------|
| Plano de contas contábil (razão, diário) | Não implementar | DRE + centro de custo + exportação atendem gestão; contabilidade formal pode ficar em sistema contábil ou fase futura. |
| Múltiplas moedas / FAS52 / IFRS | Não | Escopo fora do MVP vs TOTVS. |
| Emissão NF-e/NFSe | Depois | Depende de certificado digital; modelo de dados já preparado. |
| Automação bancária (CNAB 240/400) | Não (ou fase futura) | Conciliação manual/por planilha já permite bater de frente em “tesouraria”. |
| Cotação de compras (múltiplos fornecedores) | Não | Pedido de compra já cobre fluxo principal; cotação é evolução possível. |
| Aprovação multinível (compras/vendas) | Não | Fluxo simples primeiro; aprovação pode ser regra de negócio futura. |

---

## Resumo: como ficamos frente ao TOTVS

- **Cadastros:** Fornecedor, Cliente, Centro de custo ✅  
- **Fiscal:** Documento (rastreabilidade) ✅; Emissão NF-e depois ✅  
- **Financeiro:** CP/CR, Carteira, Fluxo projetado, DRE, Conciliação ✅  
- **Compras:** Pedido de compra + recebimento ✅  
- **Vendas:** Pedido de venda + faturamento (CR) ✅  
- **Relatórios:** Por período, por terceiro, por centro de custo; exportação PDF/Excel ✅  

Com isso o sistema bate de frente com o TOTVS nos fluxos principais de um ERP, com emissão de notas em fase posterior.

---

## Documento de entregas (testes e justificativas)

Ao final das implementações, use o documento **`documento-entregas-testes-e-justificativas.md`** neste mesmo diretório. Ele contém, para cada entrega:

- **O que faz** — descrição objetiva da funcionalidade.
- **Por que foi implementado** — valor para competir com o TOTVS.
- **Como testar** — passos de teste com checkbox.
- **Resultado esperado** — critério de sucesso.

Preencha os passos de teste com URLs e dados reais após cada implementação; ao concluir todas as fases, o documento serve como manual de teste e justificativa das entregas.
