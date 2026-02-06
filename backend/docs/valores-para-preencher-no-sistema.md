# 📝 Valores para preencher em cada lugar do sistema

Use este documento como referência ao cadastrar dados nas telas. Inclui **onde cada tela fica no menu**, **o que cadastrar antes** e **valores de exemplo** para testes.

> **Importante:** Campos **Empresa** e **Filial** são preenchidos automaticamente pelo sistema (conforme usuário logado). Use os IDs que aparecerem nos selects ou que estiverem em `company.constants.ts` / contexto da aplicação.

---

## 🗺️ Onde cada tela fica no menu (sidebar)

| Nome no documento / conceito | Menu no sistema | Caminho (URL) |
|-----------------------------|-----------------|----------------|
| **Transação financeira** (receita/despesa, lançamento manual no caixa) | **Financeiro** → **Carteira** | `/financial/wallet` |
| Contas a pagar | Financeiro → Contas a Pagar | `/accounts-payable` |
| Contas a receber | Financeiro → Contas a Receber | `/accounts-receivable` |
| Despesas (módulo Despesas) | Financeiro → Despesas | `/financial/expenses` |
| Resumo financeiro | Financeiro → Resumo Financeiro | `/financial/summary` |
| Pedidos de compra | Financeiro → Pedidos de Compra | `/purchase-orders` |
| Pedidos de venda | Financeiro → Pedidos de Venda | `/sales-orders` |
| Documentos fiscais | Financeiro → Documentos Fiscais | `/fiscal-documents` |
| Fluxo de caixa projetado | Financeiro → Fluxo de Caixa Projetado | `/financial/cash-flow` |
| Resultado por período (DRE) | Financeiro → Resultado por Período (DRE) | `/financial/result-by-period` |
| CP por fornecedor | Financeiro → CP por Fornecedor | `/financial/reports/payable-by-supplier` |
| CR por cliente | Financeiro → CR por Cliente | `/financial/reports/receivable-by-customer` |
| Conciliação bancária | Financeiro → Conciliação Bancária | `/financial/bank-reconciliation` |
| Filiais | Configuração → Filiais | `/branches` |
| Fornecedores | Configuração → Fornecedores | `/suppliers` |
| Clientes | Configuração → Clientes | `/customers` |
| Centros de custo | Configuração → Centros de Custo | `/cost-centers` |
| Marcas de veículos | Configuração → Marcas de Veículos | `/vehicle-brands` |
| Modelos de veículos | Configuração → Modelos de Veículos | `/vehicle-models` |
| Cargos | Configuração → Cargos | `/roles` |
| Unidades de medida | Configuração → Unidades de Medida | `/units-of-measurement` |
| Auditoria | Configuração → Auditoria | `/audit` |
| Funcionários | Pessoas → Funcionários | `/employees` |
| Férias | Pessoas → Férias | `/vacations` |
| Folha de pagamento | Pessoas → Folha de Pagamento | `/payroll` |
| Benefícios | Pessoas → Benefícios | `/benefits` |
| Veículos | Frota & Estoque → Veículos | `/vehicles` |
| Manutenção | Frota & Estoque → Manutenção | `/maintenance` |
| Marcações | Frota & Estoque → Marcações | `/markings` |
| Registros na estrada | Frota & Estoque → Registros na Estrada | `/product-changes` |
| Etiquetas | Frota & Estoque → Etiquetas | `/maintenance-labels` |
| Produtos | Frota & Estoque → Produtos | `/products` |
| Estoque | Frota & Estoque → Estoque | `/stock` |
| Movimentações de estoque | Frota & Estoque → Movimentações | `/stock/movements` |
| Resumo de produtos | Frota & Estoque → Resumo de Produtos | `/products/summary` |

---

## 📋 Ordem recomendada: o que cadastrar antes

Para conseguir testar os fluxos completos, cadastre nesta ordem:

1. **Já existem após `npm run setup:admin`:** Empresa padrão, Filial Matriz, usuário admin, role ADMIN, permissões, marcas e modelos de veículos iniciais.
2. **Configuração (podem ser em qualquer ordem entre si):**
   - **Unidades de medida** (necessárias para **Produtos**).
   - **Marcas e Modelos de veículos** (se ainda não tiver; necessários para **Veículos**).
   - **Filiais** (se quiser mais de uma).
   - **Fornecedores** (necessários para Contas a pagar e Pedidos de compra).
   - **Clientes** (necessários para Contas a receber e Pedidos de venda).
   - **Centros de custo** (opcional; para CP, CR, transações e DRE).
   - **Cargos** (necessários para Funcionários).
3. **Produtos** (necessários para Pedidos de compra, Pedidos de venda, Movimentações de estoque, Etiquetas/Registros na estrada).
4. **Veículos** (necessários para Manutenção, Etiquetas, Marcações, Registros na estrada).
5. **Funcionários** (necessários para Férias, Folha, Benefícios, Despesas).
6. **Benefícios** (para vincular a funcionários).
7. A partir daí: **Contas a pagar/receber**, **Transações na Carteira**, **Pedidos de compra/venda**, **Documentos fiscais**, **Despesas**, **Manutenção**, **Movimentações de estoque**, etc.

Resumo de dependências importantes:

- **Pedido de compra** → precisa de **Fornecedores** e **Produtos** (e filial).
- **Pedido de venda** → precisa de **Clientes** e **Produtos** (e filial).
- **Conta a pagar** → opcionalmente **Fornecedor** e **Centro de custo**.
- **Conta a receber** → opcionalmente **Cliente** e **Centro de custo**.
- **Transação na Carteira** (receita/despesa) → só filial; opcional **Centro de custo**.
- **Documento fiscal** → opcionalmente CP, CR ou Transação; **Fornecedor** (entrada) ou **Cliente** (saída).
- **Movimentação de estoque** → **Produtos** e almoxarifado (estoque).
- **Manutenção** → **Veículos**.
- **Etiquetas / Registros na estrada** → **Veículos** e **Produtos** (conforme regra).
- **Folha de pagamento** → **Funcionários** (e cargos/salários).

---

## 🏢 Configuração

### Filiais
- **Onde fica:** Configuração → Filiais (`/branches`).
- **Pré-requisitos:** Nenhum (empresa já existe após setup).

| Campo    | Valor exemplo        |
|----------|----------------------|
| Nome     | `Filial São Paulo`    |
| Código   | `SP-001`             |
| E-mail   | `sp@empresa.com.br`   |
| Telefone | `(11) 3456-7890`     |
| Endereço | `Av. Paulista, 1000` |
| Cidade   | `São Paulo`          |
| Estado   | `SP`                 |
| CEP      | `01310-100`          |

---

### Fornecedores
- **Onde fica:** Configuração → Fornecedores (`/suppliers`).
- **Pré-requisitos:** Nenhum. Necessário para **Contas a pagar** e **Pedidos de compra**.

| Campo    | Valor exemplo           |
|----------|-------------------------|
| Nome     | `Fornecedor ABC Ltda`   |
| CNPJ/CPF | `12.345.678/0001-90`    |
| E-mail   | `contato@fornecedor.com.br` |
| Telefone | `(11) 98765-4321`       |
| Endereço | `Rua das Flores, 123`   |
| Cidade   | `São Paulo`             |
| Estado   | `SP`                    |
| CEP      | `01234-567`             |

**Outro exemplo:**  
Nome: `Peças e Pneus Norte` · Documento: `98.765.432/0001-10` · E-mail: `vendas@pecasnorte.com.br` · Telefone: `(21) 3333-4444`

---

### Clientes
- **Onde fica:** Configuração → Clientes (`/customers`).
- **Pré-requisitos:** Nenhum. Necessário para **Contas a receber** e **Pedidos de venda**.

| Campo    | Valor exemplo          |
|----------|------------------------|
| Nome     | `Cliente XYZ Ltda`     |
| CNPJ/CPF | `11.222.333/0001-44`   |
| E-mail   | `contato@cliente.com.br` |
| Telefone | `(11) 98765-4321`      |
| Endereço | `Rua das Flores, 123`  |
| Cidade   | `São Paulo`            |
| Estado   | `SP`                   |
| CEP      | `01234-567`            |

**Outro exemplo:**  
Nome: `Transportadora Sul` · Documento: `55.666.777/0001-88` · E-mail: `frete@transpsul.com.br` · Telefone: `(48) 3234-5678`

---

### Centros de custo
- **Onde fica:** Configuração → Centros de Custo (`/cost-centers`).
- **Pré-requisitos:** Nenhum. Usado em CP, CR, transações e DRE.

| Campo | Valor exemplo   |
|-------|-----------------|
| Código| `CC-001`        |
| Nome  | `Frota`        |

**Outros:**  
`CC-002` · `Administrativo`  
`CC-003` · `Operações`  
`CC-004` · `Manutenção`

---

### Marcas de veículos
- **Onde fica:** Configuração → Marcas de Veículos (`/vehicle-brands`).
- **Pré-requisitos:** Nenhum. Necessário para **Modelos** e **Veículos**.

| Campo | Valor exemplo    |
|-------|------------------|
| Nome  | `Volvo`          |

**Outros:** `Scania`, `Mercedes-Benz`, `DAF`, `MAN`, `Iveco`, `Volkswagen`, `Ford`

---

### Modelos de veículos
- **Onde fica:** Configuração → Modelos de Veículos (`/vehicle-models`).
- **Pré-requisitos:** Pelo menos uma **Marca** cadastrada. Necessário para **Veículos**.

| Campo  | Valor exemplo   |
|--------|-----------------|
| Nome   | `FH 540`        |
| Marca  | *(selecionar marca criada)* |

**Outros (por marca):** Volvo: `FH 460`, `FM 370` · Scania: `R 450`, `R 500` · Mercedes: `Actros 2651`, `Actros 2546`

---

### Cargos (Roles)
- **Onde fica:** Configuração → Cargos (`/roles`).
- **Pré-requisitos:** Nenhum. Necessário para **Funcionários**.

| Campo       | Valor exemplo        |
|-------------|----------------------|
| Nome        | `Motorista`          |
| Descrição   | `Condutor de veículos` |
| Permissões  | *(marcar conforme necessidade)* |

**Outros:** `Mecânico`, `Auxiliar de Frota`, `Gerente de Operações`, `Financeiro`

---

### Unidades de medida
- **Onde fica:** Configuração → Unidades de Medida (`/units-of-measurement`).
- **Pré-requisitos:** Nenhum. **Necessário para cadastrar Produtos.**

| Campo | Valor exemplo |
|-------|----------------|
| Código| `UN`          |
| Nome  | `Unidade`     |

**Outros:**  
`L` · `Litro`  
`KG` · `Quilograma`  
`CX` · `Caixa`  
`PCT` · `Pacote`  
`M` · `Metro`

---

## 💰 Financeiro

### Carteira (transações financeiras – receita e despesa)
- **Onde fica:** Menu **Financeiro** → **Carteira** (`/financial/wallet`).
- **O que é:** Tela onde se consulta o **saldo** da filial e se lançam **receitas** e **despesas** manuais (transações financeiras). Esses lançamentos aparecem no **Resultado por Período (DRE)** e no saldo da Carteira.
- **Pré-requisitos:** Nenhum (só filial). Opcional: Centro de custo.

| Campo          | Valor exemplo              |
|----------------|----------------------------|
| Tipo           | Receita ou Despesa          |
| Valor          | `1500.00`                  |
| Descrição      | `Receita manual` / `Despesa administrativa` |
| Data           | `2025-02-06`               |
| Centro de custo| *(selecionar, se houver)*   |

---

### Conta a pagar
- **Onde fica:** Financeiro → Contas a Pagar (`/accounts-payable`).
- **Pré-requisitos:** Opcional: Fornecedores, Centros de custo.

| Campo          | Valor exemplo                    |
|----------------|----------------------------------|
| Descrição      | `Pagamento de fornecedor de peças` |
| Valor          | `2500.00`                        |
| Vencimento     | `2025-03-15` (ou data no futuro)  |
| Fornecedor     | *(selecionar um cadastrado)*     |
| Centro de custo| *(opcional)*                     |
| Nº documento   | `NF-001234`                      |
| Observações    | `Pagamento parcelado em 3x`      |

---

### Conta a receber
- **Onde fica:** Financeiro → Contas a Receber (`/accounts-receivable`).
- **Pré-requisitos:** Opcional: Clientes, Centros de custo.

| Campo          | Valor exemplo           |
|----------------|-------------------------|
| Descrição      | `Recebimento de frete`  |
| Valor          | `5000.00`               |
| Vencimento     | `2025-03-20`            |
| Cliente        | *(selecionar um cadastrado)* |
| Centro de custo| *(opcional)*            |
| Nº documento   | `NF-SAIDA-5678`         |
| Observações    | `Frete SP–RJ`           |

---

### Despesas (módulo Despesas)
- **Onde fica:** Financeiro → Despesas (`/financial/expenses`).
- **Pré-requisitos:** Nenhum. Podem ter abas (funcionários, frota, outros, estoque) conforme o sistema.

| Campo          | Valor exemplo     |
|----------------|-------------------|
| Tipo / Valor / Data / Centro de custo | *(conforme tela)* |

---

### Documento fiscal
- **Onde fica:** Financeiro → Documentos Fiscais (`/fiscal-documents`).
- **Pré-requisitos:** Opcional: uma CP, CR ou Transação para vincular; Fornecedor (entrada) ou Cliente (saída).

| Campo        | Valor exemplo     |
|--------------|-------------------|
| Tipo         | Entrada ou Saída  |
| Número       | `000001234`       |
| Série        | `1`               |
| Data emissão | `2025-02-06`      |
| Valor total  | `1500.50`         |
| Status       | Registrado        |
| Vinculado a  | *(opcional: CP, CR ou Transação)* |
| Observações  | `NF-e em processamento` |

---

### Pedido de compra
- **Onde fica:** Financeiro → Pedidos de Compra (`/purchase-orders`).
- **Pré-requisitos:** **Fornecedores** e **Produtos** cadastrados (os itens do pedido são produtos).

| Campo                | Valor exemplo        |
|----------------------|----------------------|
| Fornecedor           | *(selecionar)*       |
| Data prevista entrega| `2025-03-10`        |
| Observações          | `Urgente`            |
| **Item 1**           |                      |
| Produto              | *(selecionar produto)* |
| Quantidade           | `10`                 |
| Preço unitário       | `25.50`              |
| **Item 2**           |                      |
| Produto              | *(selecionar produto)* |
| Quantidade           | `5`                  |
| Preço unitário       | `120.00`             |

---

### Pedido de venda
- **Onde fica:** Financeiro → Pedidos de Venda (`/sales-orders`).
- **Pré-requisitos:** **Clientes** e **Produtos** cadastrados.

| Campo     | Valor exemplo   |
|-----------|-----------------|
| Cliente   | *(selecionar)*  |
| Data pedido| `2025-02-06`   |
| Observações| `Entrega em 7 dias` |
| **Itens** | Produto, quantidade, preço unitário *(todos produtos)* |

---

### Conciliação bancária – item de extrato
- **Onde fica:** Financeiro → Conciliação Bancária (`/financial/bank-reconciliation`). Criar extrato e depois adicionar itens.
- **Pré-requisitos:** Nenhum. Para conciliar, é preciso ter **Transações** na Carteira.

| Campo     | Valor exemplo        |
|-----------|----------------------|
| Data      | `2025-02-05`         |
| Valor     | `3500.00`            |
| Tipo      | Crédito ou Débito    |
| Descrição | `PIX recebido`       |

---

## 👥 Pessoas

### Funcionário
- **Onde fica:** Pessoas → Funcionários (`/employees`).
- **Pré-requisitos:** **Cargos** cadastrados (Configuração → Cargos). Necessário para Férias, Folha e Benefícios.

| Campo         | Valor exemplo              |
|---------------|----------------------------|
| Nome          | `João Silva`               |
| CPF           | `123.456.789-00`           |
| E-mail        | `joao.silva@empresa.com.br` |
| Telefone      | `(11) 98765-4321`          |
| Cargo         | *(selecionar cargo)*       |
| Departamento  | `Operações`               |
| Data admissão | `2024-01-15`              |
| Salário mensal| `3500.00`                  |

**Outro exemplo:**  
Nome: `Maria Santos` · CPF: `987.654.321-00` · Cargo: `Mecânico` · Salário: `4200.00`

---

### Férias
- **Onde fica:** Pessoas → Férias (`/vacations`).
- **Pré-requisitos:** **Funcionários** cadastrados.

| Campo        | Valor exemplo |
|--------------|---------------|
| Funcionário  | *(selecionar)*|
| Data início  | `2025-04-01`  |
| Data fim     | `2025-04-15`  |
| Status       | Planejada / Aprovada |

---

### Benefício
- **Onde fica:** Pessoas → Benefícios (`/benefits`). Depois, vincule ao funcionário em Funcionários → [nome] → aba Benefícios.
- **Pré-requisitos:** Nenhum. Necessário para vincular a **Funcionários**.

| Campo              | Valor exemplo     |
|--------------------|-------------------|
| Nome               | `Vale Transporte` |
| Custo diário (empresa) | `6.00`       |
| Valor funcionário/dia  | `5.00`       |
| Incluir sáb/dom    | `Não`             |
| Descrição          | `Vale transporte diário` |

**Outros:**  
Nome: `Vale Refeição` · Custo: `25.00` · Valor funcionário: `18.00`

---

### Folha de pagamento
- **Onde fica:** Pessoas → Folha de Pagamento (`/payroll`).
- **Pré-requisitos:** **Funcionários** com cargo e salário; processo de folha conforme regra do sistema.

---

## 🚛 Frota e estoque

### Produtos
- **Onde fica:** Frota & Estoque → Produtos (`/products`).
- **Pré-requisitos:** **Unidades de medida** cadastradas (Configuração → Unidades de Medida). **Produtos são necessários para:** Pedidos de compra, Pedidos de venda, Movimentações de estoque, Etiquetas/Registros na estrada (conforme regra).

| Campo            | Valor exemplo      |
|------------------|--------------------|
| Nome             | `Óleo Motor 15W40` |
| Código           | `PROD-001`         |
| Descrição        | `Óleo para motor diesel` |
| Unidade de medida| *(selecionar, ex.: L)* |
| Preço unitário   | `25.50`            |
| Qtd mínima estoque | `10`             |

**Outros:**  
`Filtro de Óleo` · Código: `PROD-002` · UM: UN · Preço: `45.00` · Mín: `5`  
`Pneu 295/80 R22.5` · Código: `PROD-003` · UM: UN · Preço: `1200.00` · Mín: `4`

---

### Veículo
- **Onde fica:** Frota & Estoque → Veículos (`/vehicles`).
- **Pré-requisitos:** **Marcas** e **Modelos** (Configuração). Necessário para Manutenção, Etiquetas, Marcações, Registros na estrada.

| Campo      | Valor exemplo   |
|------------|-----------------|
| Tipo placa | Cavalo          |
| Placa      | `ABC1D23`       |
| Marca      | *(selecionar)*  |
| Modelo     | *(selecionar)*  |
| Ano        | `2020`          |
| Cor        | `Branco`        |
| Chassi     | `9BWZZZ377VT004251` |
| RENAVAM    | `12345678901`   |
| KM atual   | `125000`        |
| Status     | Em operação     |

**Outra placa:** Tipo: Primeira carreta · Placa: `XYZ9G84`

---

### Estoque
- **Onde fica:** Frota & Estoque → Estoque (`/stock`).
- **Pré-requisitos:** **Produtos** e almoxarifados (conforme modelo do sistema). Saldos são alterados por **Movimentações** e por **Recebimento de pedido de compra** / **Faturamento de pedido de venda**.

---

### Movimentação de estoque
- **Onde fica:** Frota & Estoque → Movimentações (`/stock/movements`).
- **Pré-requisitos:** **Produtos** cadastrados e almoxarifado (estoque) configurado.

| Campo      | Valor exemplo  |
|------------|----------------|
| Tipo       | Entrada ou Saída |
| Almoxarifado | *(selecionar)* |
| Produto    | *(selecionar)* |
| Quantidade | `50`           |
| Motivo     | `Ajuste inicial` / `Venda` / `Consumo interno` |

---

### Manutenção (ordem de serviço)
- **Onde fica:** Frota & Estoque → Manutenção (`/maintenance`).
- **Pré-requisitos:** **Veículos** cadastrados.

| Campo        | Valor exemplo     |
|--------------|-------------------|
| Veículo      | *(selecionar)*    |
| Tipo         | Preventiva ou Corretiva |
| Descrição    | `Troca de óleo e filtros` |
| Data prevista| `2025-02-15`      |

---

### Etiqueta (item de manutenção por veículo)
- **Onde fica:** Frota & Estoque → Etiquetas (`/maintenance-labels`).
- **Pré-requisitos:** **Veículos** (e produtos/tipos conforme cadastro de etiquetas).

| Campo       | Valor exemplo      |
|-------------|--------------------|
| Veículo     | *(selecionar)*     |
| Tipo/item   | *(conforme cadastro de etiquetas)* |
| KM previsto | `130000`           |
| Data prevista | *(opcional)*     |

---

### Registros na estrada
- **Onde fica:** Frota & Estoque → Registros na Estrada (`/product-changes`).
- **Pré-requisitos:** **Veículos** e **Produtos** (conforme regra do módulo).

---

## 📅 Datas e formatos

- **Data:** use `AAAA-MM-DD` (ex.: `2025-02-06`).
- **Valores monetários:** use número com até 2 decimais (ex.: `1500.50`).
- **Telefone:** `(11) 98765-4321` ou `(11) 3456-7890`.
- **CEP:** `01234-567` ou `01310-100`.
- **CPF:** `123.456.789-00`.
- **CNPJ:** `12.345.678/0001-90`.

---

## 🔑 Login padrão (após setup:admin)

| Campo | Valor        |
|-------|--------------|
| E-mail| `admin@erp.com` |
| Senha | `senha123`   |

---

*Use estes valores nos formulários ao testar o sistema. Os IDs de Empresa e Filial vêm do contexto da aplicação (usuário logado / constantes).*
