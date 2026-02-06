# 🧪 Fluxos de Testes — Sistema Completo

> **Objetivo:** Checklist detalhado de todos os fluxos de teste para validar o funcionamento do sistema.  
> Use este documento para testes manuais, homologação e regressão.

---

## 📋 Índice

| Seção | Conteúdo |
|-------|----------|
| [1](#1-autenticação-e-acesso) | Autenticação e acesso |
| [2](#2-configuração) | Configuração (Filiais, Fornecedores, Clientes, etc.) |
| [3](#3-financeiro) | Financeiro (Carteira, CP, CR, Relatórios, etc.) |
| [4](#4-pessoas) | Pessoas (Funcionários, Férias, Folha, Benefícios) |
| [5](#5-frota--estoque) | Frota & Estoque (Veículos, Manutenção, Produtos, Estoque) |
| [6](#6-exportações-e-relatórios) | Exportações e relatórios |

---

## 1. Autenticação e acesso

### 1.1 Login e sessão

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 1.1.1 | Acessar a URL de login (ex.: `/login`). | Tela de login é exibida. | ☐ |
| 1.1.2 | Informar e-mail e senha válidos e clicar em **Entrar**. | Redirecionamento para o dashboard; menu e nome do usuário visíveis. | ☐ |
| 1.1.3 | Informar credenciais inválidas e submeter. | Mensagem de erro (credenciais inválidas) e permanência na tela de login. | ☐ |
| 1.1.4 | Com sessão ativa, recarregar a página. | Usuário continua logado; dados do dashboard carregam. | ☐ |
| 1.1.5 | Clicar em **Sair** (logout). | Redirecionamento para login; ao tentar acessar rota protegida, redireciona para login. | ☐ |

### 1.2 Permissões e filial

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 1.2.1 | Com usuário que tem apenas permissão de uma área (ex.: Financeiro), acessar menu. | Apenas itens permitidos aparecem; outros não são exibidos. | ☐ |
| 1.2.2 | Tentar acessar URL direta de uma tela sem permissão (ex.: `/employees` sem `employees.view`). | Acesso negado ou redirecionamento conforme regra do sistema. | ☐ |
| 1.2.3 | Trocar a filial no seletor (se houver). | Listagens e filtros passam a considerar a nova filial; dados exibidos são da filial selecionada. | ☐ |

### 1.3 Dashboard

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 1.3.1 | Após login, verificar a página inicial (dashboard). | Página carrega sem erro; cards/resumos (se houver) exibem dados. | ☐ |
| 1.3.2 | Clicar em um atalho ou card que leva a outra tela. | Navegação correta para a tela indicada. | ☐ |

---

## 2. Configuração

### 2.1 Filiais

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 2.1.1 | Acessar **Configuração → Filiais** (`/branches`). | Listagem de filiais é exibida (ou estado vazio). | ☐ |
| 2.1.2 | Clicar em **Nova filial**; preencher nome, endereço (e demais campos obrigatórios); salvar. | Mensagem de sucesso; filial aparece na listagem. | ☐ |
| 2.1.3 | Clicar em uma filial para editar; alterar um campo; salvar. | Alteração persistida; listagem mostra dados atualizados. | ☐ |
| 2.1.4 | Verificar se a filial aparece no seletor de filial (header/sidebar) quando disponível. | Filial pode ser selecionada e usada nos filtros. | ☐ |

### 2.2 Fornecedores

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 2.2.1 | Acessar **Configuração → Fornecedores** (`/suppliers`). | Listagem de fornecedores é exibida. | ☐ |
| 2.2.2 | Criar novo fornecedor: nome, documento (CNPJ/CPF), e-mail, telefone; salvar. | Fornecedor criado e listado. | ☐ |
| 2.2.3 | Editar o fornecedor; alterar nome ou telefone; salvar. | Dados atualizados na listagem. | ☐ |
| 2.2.4 | Inativar um fornecedor (se houver toggle ativo/inativo). | Fornecedor inativo não aparece em selects de novo cadastro (CP, Pedido de Compra); CP já vinculadas continuam mostrando o nome. | ☐ |
| 2.2.5 | Em **Contas a pagar → Nova conta**, abrir o select de fornecedor. | Fornecedores ativos aparecem na lista; ao salvar a CP, o fornecedor fica vinculado. | ☐ |

### 2.3 Clientes

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 2.3.1 | Acessar **Configuração → Clientes** (`/customers`). | Listagem de clientes é exibida. | ☐ |
| 2.3.2 | Criar novo cliente: nome, documento, e-mail, telefone; salvar. | Cliente criado e listado. | ☐ |
| 2.3.3 | Editar o cliente; salvar. | Dados atualizados na listagem. | ☐ |
| 2.3.4 | Inativar um cliente (se houver). | Cliente inativo não aparece em selects de nova CR/Pedido de Venda; CR já vinculadas mostram o nome. | ☐ |
| 2.3.5 | Em **Contas a receber → Nova conta**, selecionar um cliente e salvar. | CR é criada com o cliente vinculado. | ☐ |

### 2.4 Centros de custo

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 2.4.1 | Acessar **Configuração → Centros de Custo** (`/cost-centers`). | Listagem de centros de custo é exibida. | ☐ |
| 2.4.2 | Criar dois centros (ex.: "Frota", "Administrativo"); salvar. | Ambos aparecem na listagem. | ☐ |
| 2.4.3 | Ao criar uma **transação financeira** (Carteira), verificar select Centro de custo. | Centros ativos aparecem; ao salvar, o centro fica vinculado. | ☐ |
| 2.4.4 | Ao criar **Conta a pagar** e **Conta a receber**, informar centro de custo. | Centro é salvo e exibido no registro. | ☐ |
| 2.4.5 | No relatório **Resultado por Período (DRE)**, filtrar por centro de custo. | Valores exibidos refletem apenas o centro selecionado. | ☐ |

### 2.5 Marcas de veículos

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 2.5.1 | Acessar **Configuração → Marcas de Veículos** (`/vehicle-brands`). | Listagem de marcas é exibida. | ☐ |
| 2.5.2 | Criar uma nova marca (nome); salvar. | Marca aparece na listagem. | ☐ |
| 2.5.3 | Editar e excluir (se permitido). | Alterações aplicadas corretamente. | ☐ |

### 2.6 Modelos de veículos

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 2.6.1 | Acessar **Configuração → Modelos de Veículos** (`/vehicle-models`). | Listagem de modelos (com marca associada) é exibida. | ☐ |
| 2.6.2 | Criar novo modelo: nome, marca; salvar. | Modelo criado e listado. | ☐ |
| 2.6.3 | Editar modelo; salvar. | Dados atualizados. | ☐ |
| 2.6.4 | Ao cadastrar um **veículo**, verificar select de modelo. | Modelos aparecem; vínculo modelo–marca correto. | ☐ |

### 2.7 Cargos (roles)

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 2.7.1 | Acessar **Configuração → Cargos** (`/roles`). | Listagem de cargos é exibida. | ☐ |
| 2.7.2 | Criar novo cargo com nome e permissões; salvar. | Cargo criado e listado. | ☐ |
| 2.7.3 | Editar cargo; alterar permissões; salvar. | Permissões atualizadas; usuários com esse cargo passam a ter o novo conjunto de permissões. | ☐ |
| 2.7.4 | Ao criar/editar **funcionário**, selecionar cargo. | Cargos aparecem no select; vínculo é salvo. | ☐ |

### 2.8 Unidades de medida

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 2.8.1 | Acessar **Configuração → Unidades de Medida** (`/units-of-measurement`). | Listagem de UMs é exibida. | ☐ |
| 2.8.2 | Criar nova UM (símbolo e nome); salvar. | UM criada e listada. | ☐ |
| 2.8.3 | Ao cadastrar **produto**, selecionar unidade de medida. | UMs aparecem; produto salvo com a UM correta. | ☐ |

### 2.9 Auditoria

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 2.9.1 | Acessar **Configuração → Auditoria** (`/audit`). | Tela de auditoria é exibida (listagem de eventos ou filtros por entidade). | ☐ |
| 2.9.2 | Aplicar filtros (entidade, período, usuário) e buscar. | Registros de auditoria são exibidos conforme filtros. | ☐ |
| 2.9.3 | Realizar uma alteração em outra tela (ex.: editar um fornecedor) e voltar à auditoria; buscar por essa entidade. | O evento de alteração aparece na lista de auditoria. | ☐ |

---

## 3. Financeiro

### 3.1 Carteira (Wallet)

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 3.1.1 | Acessar **Financeiro → Carteira** (`/financial/wallet`). | Saldo atual e histórico (ou resumo) são exibidos. | ☐ |
| 3.1.2 | Realizar um **ajuste** de saldo (se a tela tiver essa ação). | Valor é aplicado; saldo e histórico atualizados. | ☐ |
| 3.1.3 | Criar uma **transação** (receita ou despesa): valor, descrição, data, centro de custo (opcional); salvar. | Transação aparece no histórico; saldo é recalculado. | ☐ |
| 3.1.4 | Editar uma transação existente; salvar. | Alteração refletida no histórico e no saldo. | ☐ |
| 3.1.5 | Excluir (ou cancelar) uma transação. | Transação deixa de impactar o saldo; listagem atualizada. | ☐ |

### 3.2 Despesas

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 3.2.1 | Acessar **Financeiro → Despesas** (`/financial/expenses`). | Listagem ou abas de despesas (ex.: funcionários, frota, outros, estoque) são exibidas. | ☐ |
| 3.2.2 | Criar uma nova despesa: tipo, valor, data, centro de custo (se houver); salvar. | Despesa criada e listada. | ☐ |
| 3.2.3 | Editar e excluir uma despesa. | Alterações aplicadas; totais consistentes. | ☐ |
| 3.2.4 | Verificar se as despesas aparecem no **Resultado por Período (DRE)** no mês/ano correto. | Valores batem com o relatório. | ☐ |

### 3.3 Resumo financeiro

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 3.3.1 | Acessar **Financeiro → Resumo Financeiro** (`/financial/summary`). | Resumo de receitas, despesas, saldo (e demais indicadores configurados) é exibido. | ☐ |
| 3.3.2 | Alterar período ou filial (se houver filtros). | Dados são atualizados conforme filtros. | ☐ |

### 3.4 Contas a pagar

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 3.4.1 | Acessar **Financeiro → Contas a Pagar** (`/accounts-payable`). | Listagem de CP com resumo (totais pendentes/pagos/cancelados) é exibida. | ☐ |
| 3.4.2 | Aplicar filtros: status, data inicial/final; trocar página. | Lista e totais refletem os filtros e a paginação. | ☐ |
| 3.4.3 | Clicar em **Nova conta a pagar**; preencher descrição, valor, vencimento, fornecedor (opcional), centro de custo (opcional); salvar. | CP criada com status Pendente; aparece na listagem. | ☐ |
| 3.4.4 | Abrir uma CP pendente; clicar em **Pagar**; informar data de pagamento (se solicitado); confirmar. | CP passa a status Paga; saldo da Carteira é debitado (ou integração refletida no DRE). | ☐ |
| 3.4.5 | Cancelar uma CP pendente. | CP passa a status Cancelada; não entra em totais de pendentes. | ☐ |
| 3.4.6 | Editar uma CP pendente (valor, vencimento, descrição); salvar. | Alteração persistida; listagem atualizada. | ☐ |
| 3.4.7 | Abrir o detalhe de uma CP (por ID); verificar dados e vínculos (fornecedor, centro de custo). | Página de detalhe exibe todos os dados corretamente. | ☐ |

### 3.5 Contas a receber

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 3.5.1 | Acessar **Financeiro → Contas a Receber** (`/accounts-receivable`). | Listagem de CR com resumo é exibida. | ☐ |
| 3.5.2 | Aplicar filtros (status, período); navegar entre páginas. | Lista e totais corretos. | ☐ |
| 3.5.3 | Criar **Nova conta a receber**: descrição, valor, vencimento, cliente (opcional), centro de custo; salvar. | CR criada com status Pendente. | ☐ |
| 3.5.4 | Em uma CR pendente, clicar em **Receber**; informar data de recebimento; confirmar. | CR passa a Recebida; impacto no caixa/DRE correto. | ☐ |
| 3.5.5 | Cancelar uma CR pendente. | Status Cancelada; não entra em totais de pendentes. | ☐ |
| 3.5.6 | Editar CR pendente e abrir detalhe por ID. | Alterações salvas; detalhe exibe dados e vínculos. | ☐ |

### 3.6 Pedidos de compra

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 3.6.1 | Acessar **Financeiro → Pedidos de Compra** (`/purchase-orders`). | Listagem de PCs é exibida. | ☐ |
| 3.6.2 | Criar **Novo pedido**: fornecedor, itens (produto, quantidade, preço unitário); salvar como rascunho. | PC criado com número gerado; status Rascunho. | ☐ |
| 3.6.3 | Editar o PC; alterar quantidade de um item; salvar. | Total do item e total do pedido recalculados. | ☐ |
| 3.6.4 | Alterar status para Enviado (se houver fluxo). | Status atualizado na listagem. | ☐ |
| 3.6.5 | Acionar **Receber** no PC: informar quantidades recebidas por item; confirmar. | Movimentações de **entrada** de estoque criadas; status do PC para Parcialmente recebido ou Recebido; se aplicável, CP criada. | ☐ |
| 3.6.6 | Verificar estoque dos produtos recebidos. | Quantidades em estoque aumentaram conforme o recebimento. | ☐ |

### 3.7 Pedidos de venda

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 3.7.1 | Acessar **Financeiro → Pedidos de Venda** (`/sales-orders`). | Listagem de PVs é exibida. | ☐ |
| 3.7.2 | Criar **Novo pedido**: cliente, itens (produto, quantidade, preço); salvar. | PV criado com número; status Rascunho. | ☐ |
| 3.7.3 | Editar PV; alterar itens; salvar. | Totais recalculados. | ☐ |
| 3.7.4 | Confirmar o pedido (se houver). | Status Confirmado. | ☐ |
| 3.7.5 | Acionar **Faturar** (ou Gerar CR). | Uma ou mais **Contas a receber** criadas com valor e cliente corretos; se aplicável, saídas de estoque geradas. | ☐ |
| 3.7.6 | Verificar em Contas a receber a CR gerada e em Estoque as baixas (se houver). | Dados consistentes entre PV, CR e estoque. | ☐ |

### 3.8 Documentos fiscais

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 3.8.1 | Acessar **Financeiro → Documentos Fiscais** (`/fiscal-documents`). | Listagem de documentos com filtros (período, tipo, status) é exibida. | ☐ |
| 3.8.2 | Criar documento de **entrada**: tipo Entrada, número, série (opcional), data emissão, valor total; vincular a uma CP (opcional) e fornecedor; salvar. | Documento criado e listado. | ☐ |
| 3.8.3 | Criar documento de **saída**: tipo Saída; vincular a CR e cliente (opcional); salvar. | Documento criado. | ☐ |
| 3.8.4 | Na listagem, usar filtros (De/Até, Tipo, Status, Mostrar excluídos). | Resultados corretos. | ☐ |
| 3.8.5 | Clicar em "Vinculado a" (Conta a pagar/receber) na listagem. | Navegação para a CP/CR correta. | ☐ |
| 3.8.6 | Editar um documento; alterar status para Cancelado; salvar. | Badge "Cancelado" na listagem. | ☐ |
| 3.8.7 | Excluir um documento; marcar "Mostrar excluídos". | Documento ainda aparece na lista (soft delete). | ☐ |
| 3.8.8 | Clicar em **Exportar** (PDF/Excel). | Arquivo baixado com colunas: Número, Série, Tipo, Emissão, Valor, Status, Vinculado. | ☐ |

### 3.9 Fluxo de caixa projetado

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 3.9.1 | Ter CP e CR pendentes com vencimentos em meses diferentes. | Dados disponíveis para projeção. | ☐ |
| 3.9.2 | Acessar **Financeiro → Fluxo de Caixa Projetado** (`/financial/cash-flow`). | Tabela e gráfico por mês: saldo inicial, receb. previstos, pag. previstos, saldo projetado. | ☐ |
| 3.9.3 | Alterar o número de meses (3, 6, 12, 24). | Tabela atualiza com mais ou menos meses. | ☐ |
| 3.9.4 | Conferir um mês: saldo projetado = saldo inicial + recebimentos − pagamentos. | Fórmula bate com os valores exibidos. | ☐ |
| 3.9.5 | Clicar em **Exportar** (PDF/Excel). | Arquivo com os mesmos dados da tela. | ☐ |

### 3.10 Resultado por período (DRE)

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 3.10.1 | Ter transações (receitas/despesas), CP pagas e CR recebidas em um mesmo mês/ano. | Dados para o relatório. | ☐ |
| 3.10.2 | Acessar **Financeiro → Resultado por Período (DRE)** (`/financial/result-by-period`). | Receitas, despesas e resultado exibidos; quebras por origem e por centro de custo (se houver). | ☐ |
| 3.10.3 | Selecionar mês, ano e centro de custo. | Totais refletem o período e o centro. | ☐ |
| 3.10.4 | Conferir valores com os lançamentos da Carteira e CP/CR do período. | Números consistentes. | ☐ |
| 3.10.5 | Exportar PDF/Excel. | Arquivo com os mesmos dados. | ☐ |

### 3.11 CP por fornecedor

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 3.11.1 | Ter CP com fornecedores diferentes (e eventualmente sem fornecedor). | Dados para o relatório. | ☐ |
| 3.11.2 | Acessar **Financeiro → CP por Fornecedor** (`/financial/reports/payable-by-supplier`). | Grupos por fornecedor com total e quantidade; detalhe das CP por grupo. | ☐ |
| 3.11.3 | Aplicar data inicial e final. | Lista e totais filtrados pelo período. | ☐ |
| 3.11.4 | Conferir total geral e soma dos grupos. | Total geral = soma dos totais por fornecedor. | ☐ |
| 3.11.5 | Exportar PDF/Excel. | Arquivo com Fornecedor, Descrição, Valor, Vencimento, Status. | ☐ |

### 3.12 CR por cliente

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 3.12.1 | Ter CR com clientes diferentes. | Dados para o relatório. | ☐ |
| 3.12.2 | Acessar **Financeiro → CR por Cliente** (`/financial/reports/receivable-by-customer`). | Grupos por cliente com total e quantidade; detalhe das CR por grupo. | ☐ |
| 3.12.3 | Aplicar período; conferir total geral. | Valores consistentes. | ☐ |
| 3.12.4 | Exportar PDF/Excel. | Arquivo com Cliente, Descrição, Valor, Vencimento, Status. | ☐ |

### 3.13 Conciliação bancária

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 3.13.1 | Acessar **Financeiro → Conciliação Bancária** (`/financial/bank-reconciliation`). | Listagem de extratos ou tela inicial. | ☐ |
| 3.13.2 | Clicar em **Novo Extrato**; informar mês/ano (e descrição); criar. | Extrato criado; tela do extrato abre. | ☐ |
| 3.13.3 | Adicionar itens manualmente: data, valor, tipo (Crédito/Débito), descrição. | Itens listados com "Conciliado com" em branco. | ☐ |
| 3.13.4 | Ter uma transação na Carteira com data/valor compatível. | Transação disponível para conciliar. | ☐ |
| 3.13.5 | Em um item do extrato, clicar em **Conciliar**; selecionar a transação; confirmar. | Item passa a mostrar a transação na coluna "Conciliado com". | ☐ |
| 3.13.6 | **Desfazer** conciliação. | Item volta a "não conciliado". | ☐ |

---

## 4. Pessoas

### 4.1 Funcionários

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 4.1.1 | Acessar **Pessoas → Funcionários** (`/employees`). | Listagem de funcionários é exibida. | ☐ |
| 4.1.2 | Criar **Novo funcionário**: nome, CPF, e-mail, cargo, filial, data admissão (e demais campos obrigatórios); salvar. | Funcionário criado e listado. | ☐ |
| 4.1.3 | Editar funcionário; alterar cargo ou dados; salvar. | Dados atualizados. | ☐ |
| 4.1.4 | Abrir detalhe do funcionário (`/employees/[id]`). | Página de detalhe com dados e abas (ex.: benefícios, custos, pagamentos) se existirem. | ☐ |
| 4.1.5 | Em **Funcionário → Benefícios**, adicionar/remover benefícios. | Vínculos salvos e exibidos. | ☐ |
| 4.1.6 | Verificar **Custos** e **Pagamentos** (se houver abas). | Dados carregam sem erro. | ☐ |

### 4.2 Férias

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 4.2.1 | Acessar **Pessoas → Férias** (`/vacations`). | Listagem de férias (ou por funcionário) é exibida. | ☐ |
| 4.2.2 | Criar novo período de férias: funcionário, data início, data fim, status; salvar. | Férias criadas e listadas. | ☐ |
| 4.2.3 | Editar e cancelar (se permitido). | Alterações aplicadas. | ☐ |
| 4.2.4 | Filtrar por status ou funcionário. | Lista filtrada corretamente. | ☐ |

### 4.3 Folha de pagamento

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 4.3.1 | Acessar **Pessoas → Folha de Pagamento** (`/payroll`). | Tela de folha com mês/ano e filial (ou resumo). | ☐ |
| 4.3.2 | Selecionar mês, ano e filial; gerar ou visualizar prévia da folha. | Dados dos funcionários e valores (proventos/descontos) exibidos. | ☐ |
| 4.3.3 | Processar folha (se houver ação). | Folha processada; CP ou transações geradas conforme regra. | ☐ |
| 4.3.4 | Verificar se as CP de folha aparecem em Contas a pagar. | Vínculo e valores corretos. | ☐ |

### 4.4 Benefícios

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 4.4.1 | Acessar **Pessoas → Benefícios** (`/benefits`). | Listagem de benefícios (tipos/cadastro geral) é exibida. | ☐ |
| 4.4.2 | Criar novo benefício: nome, tipo, valor (se aplicável); salvar. | Benefício criado e listado. | ☐ |
| 4.4.3 | Editar benefício; salvar. | Dados atualizados. | ☐ |
| 4.4.4 | Em um funcionário, na aba Benefícios, associar um benefício. | Associação salva; aparece na listagem de benefícios do funcionário. | ☐ |

---

## 5. Frota & Estoque

### 5.1 Veículos

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 5.1.1 | Acessar **Frota & Estoque → Veículos** (`/vehicles`). | Listagem de veículos é exibida. | ☐ |
| 5.1.2 | Criar **Novo veículo**: placa, marca, modelo, filial (e demais campos); salvar. | Veículo criado e listado. | ☐ |
| 5.1.3 | Editar veículo; alterar status (Em operação, Manutenção, Parado) se houver; salvar. | Dados e status atualizados. | ☐ |
| 5.1.4 | Atualizar quilometragem (se houver ação). | KM atualizado; histórico (se houver) registrado. | ☐ |
| 5.1.5 | Acessar **Veículo → Documentos** (`/vehicles/[id]/documents`). | Listagem de documentos do veículo; upload e download funcionando. | ☐ |
| 5.1.6 | Ver histórico do veículo (se houver). | Eventos (manutenções, trocas de KM) exibidos. | ☐ |

### 5.2 Manutenção

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 5.2.1 | Acessar **Frota & Estoque → Manutenção** (`/maintenance`). | Listagem de ordens de manutenção é exibida. | ☐ |
| 5.2.2 | Criar **Nova manutenção**: veículo, tipo (preventiva/corretiva), descrição, data prevista; salvar. | Manutenção criada com status Aberta. | ☐ |
| 5.2.3 | Iniciar manutenção (**Iniciar**). | Status "Em execução". | ☐ |
| 5.2.4 | Pausar e retomar (se houver). | Status e histórico corretos. | ☐ |
| 5.2.5 | Concluir manutenção (**Concluir**). | Status Concluída. | ☐ |
| 5.2.6 | Anexar arquivo (se houver). | Anexo listado e disponível para download. | ☐ |
| 5.2.7 | Cancelar uma manutenção aberta. | Status Cancelada. | ☐ |
| 5.2.8 | Verificar se a manutenção gera despesa ou CP (conforme regra). | Integração financeira correta. | ☐ |

### 5.3 Marcações (vehicle-markings)

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 5.3.1 | Acessar **Frota & Estoque → Marcações** (`/markings`). | Listagem de marcações (odômetro/contador por veículo) é exibida. | ☐ |
| 5.3.2 | Registrar nova marcação ou alteração de KM (se for a tela correta). | Dados salvos; veículo atualizado. | ☐ |

### 5.4 Registros na estrada (product-changes)

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 5.4.1 | Acessar **Frota & Estoque → Registros na Estrada** (`/product-changes`). | Listagem de registros (troca de produto/combustível em viagem) é exibida. | ☐ |
| 5.4.2 | Criar novo registro: veículo, produto, quantidade, KM (e demais campos); salvar. | Registro criado; impacto em estoque/controle conforme regra. | ☐ |

### 5.5 Etiquetas (maintenance-labels)

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 5.5.1 | Acessar **Frota & Estoque → Etiquetas** (`/maintenance-labels`). | Listagem de etiquetas (itens de manutenção por veículo, ex.: troca de óleo) é exibida. | ☐ |
| 5.5.2 | Criar etiqueta: veículo, tipo/item, KM ou data prevista; salvar. | Etiqueta criada; aparece em "a vencer" ou "vencida" conforme regra. | ☐ |
| 5.5.3 | Registrar troca/realização (**Registrar troca**). | Item marcado como realizado; próxima previsão atualizada (se houver). | ☐ |
| 5.5.4 | Consultar "a vencer por veículo" (se houver endpoint/tela). | Lista correta por veículo. | ☐ |

### 5.6 Produtos

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 5.6.1 | Acessar **Frota & Estoque → Produtos** (`/products`). | Listagem de produtos é exibida. | ☐ |
| 5.6.2 | Criar **Novo produto**: nome, código, unidade de medida, quantidade mínima (opcional); salvar. | Produto criado e listado. | ☐ |
| 5.6.3 | Editar produto; salvar. | Dados atualizados. | ☐ |
| 5.6.4 | Verificar listagem de **estoque baixo** (se houver). | Produtos abaixo do mínimo aparecem. | ☐ |
| 5.6.5 | Acessar **Resumo de Produtos** (`/products/summary`). | Estatísticas ou resumo por produto exibidos. | ☐ |

### 5.7 Estoque

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 5.7.1 | Acessar **Frota & Estoque → Estoque** (`/stock`). | Listagem de almoxarifados e saldos por produto (ou por warehouse) é exibida. | ☐ |
| 5.7.2 | Filtrar por almoxarifado ou produto. | Dados filtrados corretamente. | ☐ |
| 5.7.3 | Ver saldo de um produto em um almoxarifado. | Quantidade correta. | ☐ |

### 5.8 Movimentações de estoque

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 5.8.1 | Acessar **Frota & Estoque → Movimentações** (`/stock/movements`). | Listagem de movimentações (entrada/saída) é exibida. | ☐ |
| 5.8.2 | Criar **Nova movimentação**: tipo (Entrada/Saída), almoxarifado, produto, quantidade, motivo; salvar. | Movimentação criada; saldo do estoque atualizado. | ☐ |
| 5.8.3 | Filtrar por período, tipo, produto. | Lista filtrada. | ☐ |
| 5.8.4 | Receber um **Pedido de compra** e verificar se as movimentações de entrada foram criadas aqui. | Movimentações aparecem com origem no PC. | ☐ |
| 5.8.5 | Faturar um **Pedido de venda** (com baixa de estoque) e verificar movimentações de saída. | Saídas listadas e saldos reduzidos. | ☐ |

---

## 6. Exportações e relatórios

### 6.1 Checklist geral de exportação

| Relatório / Tela | Exportar PDF | Exportar Excel | Dados esperados | ✅ |
|------------------|--------------|----------------|-----------------|-----|
| Fluxo de Caixa Projetado | ☐ | ☐ | Meses, saldo inicial, receb./pag. previstos, saldo projetado | ☐ |
| Resultado por Período (DRE) | ☐ | ☐ | Receitas, despesas, resultado; por categoria/origem/centro | ☐ |
| CP por Fornecedor | ☐ | ☐ | Fornecedor, descrição, valor, vencimento, status | ☐ |
| CR por Cliente | ☐ | ☐ | Cliente, descrição, valor, vencimento, status | ☐ |
| Documentos Fiscais | ☐ | ☐ | Número, série, tipo, emissão, valor, status, vinculado | ☐ |

### 6.2 Validação dos arquivos exportados

| # | Passo | Resultado esperado | ✅ |
|---|-------|-------------------|-----|
| 6.2.1 | Em cada relatório, aplicar filtros (período, filial, centro); exportar PDF. | PDF abre sem erro; título e dados batem com a tela; layout legível. | ☐ |
| 6.2.2 | Exportar Excel (CSV); abrir no Excel/LibreOffice. | Encoding UTF-8 (com BOM); colunas corretas; valores numéricos e datas formatados. | ☐ |
| 6.2.3 | Exportar com **nenhum dado** (período vazio ou sem registros). | Arquivo gerado com cabeçalho e sem linhas (ou mensagem "sem dados"); não gera erro. | ☐ |

---

## 7. Integrações entre módulos (fluxos cruzados)

| # | Fluxo | Passos | Resultado esperado | ✅ |
|----|-------|--------|-------------------|-----|
| 7.1 | Fornecedor → CP | Cadastrar fornecedor → Criar CP vinculada ao fornecedor → Relatório CP por fornecedor | Fornecedor aparece no select; relatório agrupa por fornecedor. | ☐ |
| 7.2 | Cliente → CR | Cadastrar cliente → Criar CR vinculada → Relatório CR por cliente | Cliente no select; relatório agrupa por cliente. | ☐ |
| 7.3 | Centro de custo → DRE | Cadastrar centro → Lançar transação/CP/CR com centro → Filtrar DRE por centro | Valores do DRE batem com o centro. | ☐ |
| 7.4 | PC → Estoque → CP | Criar PC → Receber → Ver estoque e CP (se houver) | Estoque sobe; CP criada com valor/fornecedor corretos. | ☐ |
| 7.5 | PV → CR e Estoque | Criar PV → Faturar → Ver CR e movimentações de saída | CR criada; estoque baixa. | ☐ |
| 7.6 | Doc. fiscal ↔ CP/CR | Criar CP → Criar doc. fiscal vinculado à CP → Na listagem, clicar em "Conta a pagar" | Navega para a CP correta. | ☐ |
| 7.7 | Folha → CP | Processar folha → Abrir Contas a pagar | CP de folha com valor e descrição corretos. | ☐ |
| 7.8 | Manutenção → Despesa/CP | Concluir manutenção (com custo) | Despesa ou CP gerada conforme regra. | ☐ |
| 7.9 | Carteira → DRE | Lançar receita e despesa na Carteira → Abrir DRE do mês | Valores aparecem no DRE. | ☐ |
| 7.10 | Conciliação → Transação | Conciliar item do extrato com transação da Carteira | Item marcado como conciliado; relatório de conciliação correto. | ☐ |

---

## 8. Regressão rápida (smoke test)

Fluxo mínimo para validar que o sistema está operante após um deploy:

| # | Ação | ✅ |
|---|------|-----|
| 1 | Login com usuário válido | ☐ |
| 2 | Acessar Dashboard | ☐ |
| 3 | Listar Fornecedores | ☐ |
| 4 | Listar Contas a pagar | ☐ |
| 5 | Listar Contas a receber | ☐ |
| 6 | Abrir Fluxo de Caixa Projetado | ☐ |
| 7 | Abrir Resultado por Período (DRE) | ☐ |
| 8 | Listar Documentos Fiscais | ☐ |
| 9 | Listar Funcionários | ☐ |
| 10 | Listar Veículos | ☐ |
| 11 | Listar Produtos e Estoque | ☐ |
| 12 | Exportar um relatório (PDF ou Excel) | ☐ |
| 13 | Logout | ☐ |

---

## 9. Observações

- **Permissões:** Execute testes com usuários que tenham apenas um subconjunto de permissões para validar o controle de acesso.
- **Filial:** Sempre que o sistema usar filial (seletor ou filtro), teste com mais de uma filial e confira isolamento dos dados.
- **Dados vazios:** Teste listagens e relatórios sem dados (período sem lançamentos, filial nova) para evitar erros de tela ou exportação.
- **Navegadores:** Para homologação, rode os fluxos críticos em pelo menos dois navegadores (ex.: Chrome e Edge).

---

*Documento gerado para cobertura de fluxos de testes do sistema. Atualize conforme novas funcionalidades forem entregues.*
