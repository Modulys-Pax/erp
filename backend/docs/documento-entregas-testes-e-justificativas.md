# Documento de entregas — O que cada implementação faz, por quê e como testar

Este documento descreve **o que** foi implementado, **por que** (valor frente ao TOTVS) e **como testar** cada entrega. Use-o para validação funcional e para apresentação às partes interessadas.

---

## Como usar este documento

- **O que faz** e **Por que** estão preenchidos conforme o plano.
- **Como testar** e **Resultado esperado** devem ser atualizados ao final de cada implementação com passos e dados reais (URLs, nomes de filial, etc.).
- Ao concluir todas as fases, este documento serve como **manual de teste e justificativa** das entregas.

---

# Fase 1 — Cadastros base

## 1.1 Fornecedor (Supplier)

### O que faz
- Cadastro de **fornecedores** por empresa/filial: nome, documento (CNPJ/CPF), e-mail, telefone, endereço (opcional).
- Listagem paginada e filtros por filial.
- Vínculo opcional em **Contas a pagar** e em **Pedido de compra**: ao criar/editar CP ou PC, o usuário pode escolher um fornecedor. Relatórios e listagens podem agrupar/filtrar por fornecedor.

### Por que foi implementado
No TOTVS (e em qualquer ERP), compras e contas a pagar são sempre atreladas a um cadastro de fornecedor. Sem isso, fica apenas “descrição + valor”. Com fornecedor, temos relatórios “quem devo”, histórico por fornecedor e base para pedido de compra e documento fiscal.

### Como testar
1. [ ] Acessar o menu **Fornecedores** (ou `/suppliers`).
2. [ ] Criar um novo fornecedor: preencher nome, documento, e-mail, telefone; salvar.
3. [ ] Editar o fornecedor e alterar um campo; salvar e verificar se a listagem mostra o valor atualizado.
4. [ ] Na tela de **Contas a pagar**, ao criar uma nova conta, verificar se existe campo/select para escolher **Fornecedor** e se a conta salva com o fornecedor vinculado.
5. [ ] Na listagem de contas a pagar, filtrar ou agrupar por fornecedor (se a tela tiver essa opção).
6. [ ] Inativar um fornecedor e verificar se ele deixa de aparecer nos selects de novo cadastro (e se as CP já vinculadas continuam mostrando o nome).

### Resultado esperado
- Fornecedor é criado, editado e listado por filial.
- CP pode ser vinculada a fornecedor; listagem/relatório permitem enxergar por fornecedor.
- Nenhum erro 500 ou validação quebrada nos fluxos acima.

---

## 1.2 Cliente (Customer)

### O que faz
- Cadastro de **clientes** por empresa/filial: nome, documento, e-mail, telefone, endereço (opcional).
- Listagem paginada e filtros por filial.
- Vínculo opcional em **Contas a receber** e em **Pedido de venda**: ao criar/editar CR ou PV, o usuário pode escolher um cliente.

### Por que foi implementado
Contas a receber e vendas no TOTVS são atreladas ao cadastro de cliente. Sem cliente, não há “quem me deve” nem base para pedido de venda e faturamento. Competir com TOTVS exige esse cadastro e vínculo.

### Como testar
1. [ ] Acessar o menu **Clientes** (ou `/customers`).
2. [ ] Criar um novo cliente: preencher nome, documento, e-mail; salvar.
3. [ ] Editar o cliente; salvar e verificar listagem.
4. [ ] Na tela de **Contas a receber**, ao criar uma nova conta, verificar se existe campo/select **Cliente** e se a conta salva com o cliente vinculado.
5. [ ] Na listagem de contas a receber, verificar filtro/agrupamento por cliente (se existir).
6. [ ] Inativar um cliente e verificar comportamento nos selects e nas CR já vinculadas.

### Resultado esperado
- Cliente é criado, editado e listado por filial.
- CR pode ser vinculada a cliente; listagem/relatório permitem enxergar por cliente.
- Nenhum erro nos fluxos acima.

---

## 1.3 Centro de custo (Cost Center)

### O que faz
- Cadastro de **centros de custo** por empresa/filial: código, nome, ativo.
- Campo **opcional** em: Transação financeira, Conta a pagar, Conta a receber, Despesa. Ao lançar qualquer um desses, o usuário pode informar um centro de custo.
- Relatório **Resultado por período (DRE)** pode ser filtrado ou quebrado por centro de custo.

### Por que foi implementado
No TOTVS, centro de custo é base para contabilidade gerencial e relatórios “onde gastamos”. Um único nível já permite competir em relatórios gerenciais sem implementar plano de contas contábil.

### Como testar
1. [ ] Acessar o menu **Centros de custo** (ou `/cost-centers`).
2. [ ] Criar dois centros de custo (ex.: “Frota”, “Administrativo”); salvar.
3. [ ] Ao criar uma **Transação financeira** (receita ou despesa), verificar se existe select **Centro de custo** e se o valor é salvo.
4. [ ] Ao criar uma **Conta a pagar** e uma **Conta a receber**, verificar se o centro de custo pode ser informado e persistido.
5. [ ] Ao criar uma **Despesa**, verificar se o centro de custo pode ser informado.
6. [ ] No relatório **Resultado por período**, aplicar filtro por centro de custo (ou quebra por centro) e verificar se os valores batem com as transações/CP/CR/despesas daquele centro.

### Resultado esperado
- Centro de custo é criado e listado; aparece como opção em transação, CP, CR e despesa.
- DRE/Resultado por período refletem o centro de custo quando filtrado ou quebrado por centro.
- Nenhum erro nos fluxos acima.

---

# Fase 2 — Documento fiscal (rastreabilidade)

## 2.1 Cadastro e listagem de documento fiscal

### O que faz
- Cadastro de **documentos fiscais** (notas de entrada ou saída) sem emissão: tipo (entrada/saída), número, série (opcional), data de emissão, valor total, status (registrado/cancelado), observações.
- Vínculo opcional a: **Conta a pagar**, **Conta a receber** ou **Transação financeira**. Opcionalmente fornecedor/cliente.
- Listagem por filial, período, tipo e status. Na listagem, link para a CP/CR/transação vinculada.
- Estrutura de dados preparada para futura integração NF-e (campos como externalKey, issuedAt, xmlPath reservados).

### Por que foi implementado
No TOTVS, o módulo fiscal registra notas (próprias e de terceiros). Para competir, é necessário pelo menos **rastreabilidade**: saber qual nota está atrelada a qual pagamento/recebimento. A emissão NF-e vem depois (certificado digital); o modelo já suporta essa evolução.

### Como testar
1. [ ] Acessar o menu **Documentos Fiscais** (Financeiro) ou `/fiscal-documents`.
2. [ ] Criar um documento fiscal de **entrada**: tipo Entrada, número, série (opcional), data de emissão, valor total; opcionalmente vincular a uma Conta a pagar existente e a um fornecedor; salvar.
3. [ ] Criar um documento fiscal de **saída**: tipo Saída; opcionalmente vincular a uma Conta a receber e a um cliente; salvar.
4. [ ] Na listagem, usar os filtros: período (De/Até), tipo (Entrada/Saída), status (Registrado/Cancelado) e "Mostrar excluídos"; verificar se os registros aparecem corretamente.
5. [ ] Na coluna "Vinculado a", clicar em "Conta a pagar" ou "Conta a receber" e confirmar que abre o registro correto (transação leva à Carteira).
6. [ ] Editar um documento e alterar status para "Cancelado"; salvar; verificar se ele continua na listagem com badge "Cancelado".
7. [ ] Excluir um documento (ação Excluir) e marcar "Mostrar excluídos" para ver o registro ainda listado (soft delete).

### Resultado esperado
- Documentos fiscais são criados, listados e vinculados a CP/CR/transação.
- Filtros e links funcionam; cancelamento não quebra telas.
- Estrutura permite no futuro preencher dados de NF-e (sem alterar fluxo atual).

---

# Fase 3 — Financeiro (fluxo de caixa, DRE, conciliação)

## 3.1 Fluxo de caixa projetado

### O que faz
- Endpoint e tela que mostram o **fluxo de caixa projetado** para os próximos N meses (ex.: 6) por filial.
- Para cada mês: saldo inicial, total a receber (CR pendentes com vencimento no mês), total a pagar (CP pendentes com vencimento no mês), saldo projetado no fim do mês.
- Permite ao gestor enxergar antecipadamente pressão de caixa.

### Por que foi implementado
O TOTVS oferece fluxo de caixa e projeção. Para bater de frente, precisamos da mesma capacidade de visão futura, de forma simples (baseado em CP/CR pendentes e saldo atual).

### Como testar
1. [ ] Ter ao menos algumas **Contas a pagar** e **Contas a receber** pendentes com vencimentos em meses diferentes (ex.: próximo mês e daqui a 3 meses).
2. [ ] Acessar **Financeiro → Fluxo de Caixa Projetado** (ou `/financial/cash-flow`).
3. [ ] Selecionar o número de meses (3, 6, 12 ou 24) no filtro.
4. [ ] Verificar se a tabela mostra, por mês: saldo inicial, recebimentos previstos, pagamentos previstos, saldo projetado.
5. [ ] Conferir manualmente um mês: saldo projetado = saldo inicial + recebimentos previstos − pagamentos previstos; deve bater com o exibido.

### Resultado esperado
- Valores exibidos são consistentes com CP/CR pendentes e saldo da carteira.
- Alterar vencimentos de CP/CR e atualizar a tela reflete a nova projeção.

---

## 3.2 Resultado por período (DRE simplificada)

### O que faz
- Relatório **Resultado por período**: receitas e despesas realizadas em um mês/ano (e opcionalmente filial e centro de custo).
- Receitas: CR recebidas no período + transações do tipo receita no período.
- Despesas: CP pagas no período + transações do tipo despesa no período + despesas (Expense) lançadas no período.
- Resultado = Receitas − Despesas. Pode haver quebra por origem (manutenção, estoque, RH, manual) e por centro de custo.

### Por que foi implementado
O TOTVS entrega DRE e relatórios gerenciais. Para competir, precisamos de pelo menos um “resultado por período” que responda “quanto entrou e quanto saiu” sem plano de contas contábil.

### Como testar
1. [ ] Garantir que existem **transações financeiras** (receitas e despesas) em um mesmo mês/ano para uma filial (Carteira ou CP/CR que geraram transação).
2. [ ] Acessar **Financeiro → Resultado por Período (DRE)** (ou `/financial/result-by-period`).
3. [ ] Selecionar mês, ano e opcionalmente centro de custo.
4. [ ] Verificar se Receitas, Despesas e Resultado batem com as transações daquele período (e centro, se filtrado).
5. [ ] Verificar se as quebras por origem (Manutenção, Estoque, RH, Manual) e por centro de custo mostram valores coerentes.

### Resultado esperado
- Números do relatório são consistentes com os lançamentos do período.
- Filtro por centro de custo altera corretamente os totais.
- Exportação (quando existir) reflete os mesmos dados.

---

## 3.3 Conciliação bancária (simples)

### O que faz
- **Upload de planilha** (CSV/Excel) ou **cadastro manual** de itens de extrato bancário: data, valor, descrição, tipo (crédito/débito).
- Listagem dos itens do extrato por período/filial.
- Ação **Conciliar**: associar um item do extrato a uma **Transação financeira** do sistema. Itens conciliados ficam marcados; relatório ou vista mostram conciliados vs não conciliados.
- Objetivo: comparar extrato bancário com o que está lançado no sistema e garantir consistência.

### Por que foi implementado
O TOTVS tem tesouraria e conciliação bancária. Para bater de frente, oferecemos conciliação simples (extrato vs lançamentos), sem necessidade de CNAB no primeiro momento.

### Como testar
1. [ ] Acessar **Financeiro → Conciliação Bancária** (ou `/financial/bank-reconciliation`).
2. [ ] Clicar em **Novo Extrato**; informar mês e ano de referência (e descrição opcional); criar.
3. [ ] Na tela do extrato, clicar em **Adicionar item** e cadastrar 3–5 itens manualmente (data, valor, tipo Crédito/Débito, descrição opcional).
4. [ ] Verificar se os itens aparecem na listagem com coluna “Conciliado com” em branco.
5. [ ] Ter ao menos uma **Transação financeira** na Carteira (mesma filial) com data/valor compatível com um item do extrato.
6. [ ] Clicar em **Conciliar** em um item; selecionar a transação no modal; confirmar.
7. [ ] Verificar se o item passa a mostrar a descrição da transação na coluna “Conciliado com”. Testar **Desfazer** para remover a conciliação.

### Resultado esperado
- Itens de extrato são importados ou cadastrados e listados.
- Conciliação associa item do extrato à transação e atualiza status.
- Relatório/vista de conciliados vs não conciliados está correto.

---

# Fase 4 — Pedido de compra

## 4.1 Cadastro e listagem de pedido de compra

### O que faz
- Cadastro de **Pedido de compra (PC)**: fornecedor, data prevista de entrega (opcional), status (rascunho, enviado, parcialmente recebido, recebido, cancelado). Itens: produto, quantidade, preço unitário (opcional), total (calculado).
- Listagem de PCs por filial com filtros (status, período, fornecedor).
- Número do pedido gerado automaticamente (ex.: por filial).

### Por que foi implementado
No TOTVS, o módulo de Compras gira em torno do pedido de compra. Para competir, precisamos do fluxo “pedi ao fornecedor → recebo → dou entrada no estoque (e opcionalmente gero CP)”.

### Como testar
1. [ ] Acessar **Pedidos de compra** (ou `/purchase-orders`).
2. [ ] Criar um PC em rascunho: selecionar fornecedor, adicionar 2 itens (produto, quantidade, preço); salvar.
3. [ ] Verificar se o número do pedido foi gerado e se a listagem mostra o PC com status “Rascunho”.
4. [ ] Alterar status para “Enviado” (se houver essa transição).
5. [ ] Editar o PC (alterar quantidade de um item); salvar e verificar se os totais são recalculados.

### Resultado esperado
- PC é criado, editado e listado; número é único por filial; totais corretos.

---

## 4.2 Recebimento de pedido de compra

### O que faz
- Ação **Receber** no pedido de compra: usuário informa quantidades recebidas por item (ou confirma total).
- Sistema gera **movimentação de estoque (entrada)** para cada item recebido (produto, quantidade, almoxarifado conforme regra).
- Opcionalmente cria **Conta a pagar** associada ao PC (uma por pedido ou por item, conforme regra definida).
- Status do PC é atualizado para **Parcialmente recebido** ou **Recebido** conforme quantidades.

### Por que foi implementado
Sem o ato de “receber”, o pedido de compra fica só como intenção. No TOTVS, recebimento gera entrada em estoque e pode gerar conta a pagar; o mesmo fluxo nos coloca em paridade.

### Como testar
1. [ ] Ter um PC no status “Enviado” (ou equivalente) com 2 itens e quantidades conhecidas; ter almoxarifado e produtos com estoque configurado.
2. [ ] Abrir o PC e acionar **Receber** (ou ir à tela “Receber pedido”).
3. [ ] Informar quantidade recebida igual à solicitada para o primeiro item e metade para o segundo; confirmar recebimento.
4. [ ] Verificar: (a) movimentações de **entrada** de estoque criadas para os dois itens (quantidades informadas); (b) status do PC “Parcialmente recebido”.
5. [ ] Realizar novo recebimento para o segundo item (restante); verificar status “Recebido” e novas movimentações de estoque.
6. [ ] Se a regra for criar CP ao receber: verificar se uma CP foi criada (valor e fornecedor corretos) e se está vinculada ao PC (se o modelo tiver esse vínculo).

### Resultado esperado
- Recebimento gera entradas de estoque corretas; status do PC evolui; CP é criada conforme regra de negócio definida.

---

# Fase 5 — Pedido de venda

## 5.1 Cadastro e listagem de pedido de venda

### O que faz
- Cadastro de **Pedido de venda (PV)**: cliente, data do pedido, status (rascunho, confirmado, parcialmente entregue, entregue, cancelado). Itens: produto, quantidade, preço unitário (opcional), total (calculado).
- Listagem de PVs por filial com filtros (status, período, cliente).
- Número do pedido gerado automaticamente.

### Por que foi implementado
No TOTVS, Vendas gira em torno do pedido de venda. Para bater de frente, precisamos do fluxo “vendi para o cliente → faturo → gero CR (e opcionalmente baixo estoque)”.

### Como testar
1. [ ] Acessar **Pedidos de venda** (ou `/sales-orders`).
2. [ ] Criar um PV em rascunho: selecionar cliente, adicionar 2 itens (produto, quantidade, preço); salvar.
3. [ ] Verificar número do pedido e listagem com status “Rascunho”.
4. [ ] Alterar status para “Confirmado” (se houver); editar um item e verificar totais.

### Resultado esperado
- PV é criado, editado e listado; número único; totais corretos.

---

## 5.2 Faturamento (gerar Conta a receber a partir do PV)

### O que faz
- Ação **Faturar** (ou “Gerar CR”) no pedido de venda: gera uma ou mais **Contas a receber** com base no valor do PV (e opcionalmente nos itens). CR criada com vínculo ao cliente do PV.
- Opcionalmente gera **saída de estoque** por item (baixa no almoxarifado). Regra (sempre baixar vs só quando configurado) deve estar documentada.

### Por que foi implementado
No TOTVS, faturamento gera título a receber e baixa de estoque. Sem esse passo, o PV fica só como intenção; com ele, fechamos o ciclo de vendas e competimos em paridade.

### Como testar
1. [ ] Ter um PV confirmado com itens e totais conhecidos; se houver baixa de estoque, ter produtos com quantidade em estoque suficiente.
2. [ ] Acionar **Faturar** (ou “Gerar CR”) no PV.
3. [ ] Verificar: (a) uma CR (ou uma por item, conforme regra) foi criada com valor e cliente corretos; (b) se a regra for baixar estoque, verificar movimentações de **saída** para os produtos do PV.
4. [ ] Na tela de Contas a receber, abrir a CR gerada e confirmar vínculo ao cliente e valor.
5. [ ] Se o PV permitir faturamento parcial: faturar parte dos itens e verificar status “Parcialmente entregue” e CR/estoque parciais.

### Resultado esperado
- Faturamento gera CR correta(s) e, quando aplicável, baixa de estoque; dados consistentes entre PV, CR e estoque.

---

# Fase 6 — Relatórios e exportação

## 6.1 Relatório Contas a pagar por fornecedor

### O que faz
- Relatório ou vista que agrupa **Contas a pagar** por **fornecedor** (totais e detalhes) em um período/filial.
- Permite ver “quanto devo por fornecedor”.

### Por que foi implementado
Expectativa padrão em ERP (e no TOTVS): relatório de contas a pagar por fornecedor para gestão e contato com fornecedores.

### Como testar
1. [ ] Ter várias CP com fornecedores diferentes (e algumas sem fornecedor, se permitido).
2. [ ] Acessar o relatório **Por fornecedor** (em contas a pagar ou financeiro).
3. [ ] Selecionar período e filial; gerar relatório.
4. [ ] Verificar se os totais por fornecedor batem com a soma das CP daquele fornecedor no período; verificar se itens “sem fornecedor” aparecem em grupo à parte (se aplicável).

### Resultado esperado
- Agrupamento e totais corretos; possível exportar (PDF/Excel) quando implementado.

---

## 6.2 Relatório Contas a receber por cliente

### O que faz
- Relatório ou vista que agrupa **Contas a receber** por **cliente** (totais e detalhes) em um período/filial.
- Permite ver “quanto me devem por cliente”.

### Por que foi implementado
Expectativa padrão em ERP (e no TOTVS): relatório de contas a receber por cliente para cobrança e gestão.

### Como testar
1. [ ] Ter várias CR com clientes diferentes.
2. [ ] Acessar o relatório **Por cliente** (em contas a receber ou financeiro).
3. [ ] Selecionar período e filial; gerar relatório.
4. [ ] Verificar totais por cliente e consistência com as CR do período.

### Resultado esperado
- Agrupamento e totais corretos; exportação (quando existir) com mesmos dados.

---

## 6.3 Exportação PDF e Excel dos relatórios

### O que faz
- Botões **Exportar PDF** e **Exportar Excel** (ou apenas um dos formatos) nos relatórios: Fluxo de caixa projetado, Resultado por período (DRE), Contas a pagar por fornecedor, Contas a receber por cliente, Documentos fiscais (listagem por período).
- O arquivo gerado reflete os mesmos filtros e dados da tela (período, filial, centro de custo, etc.).

### Por que foi implementado
No TOTVS e no mercado, relatórios são exportados para análise e para o contador. Sem exportação, não batemos de frente em “relatórios prontos para uso externo”.

### Como testar
1. [ ] Para cada relatório que tiver exportação: aplicar filtros (ex.: mês/ano, filial), visualizar na tela.
2. [ ] Clicar em **Exportar PDF**: baixar e abrir; verificar se os números e textos batem com a tela e se o layout é legível.
3. [ ] Clicar em **Exportar Excel**: baixar e abrir; verificar se os dados batem (colunas, totais, filtros aplicados).
4. [ ] Testar com período sem dados e verificar se o arquivo indica “sem dados” ou lista vazia de forma clara.

### Resultado esperado
- PDF e Excel são gerados sem erro; conteúdo consistente com a tela; arquivos utilizáveis pelo usuário e pelo contador.

---

# Resumo de critérios de conclusão

Ao final de todas as implementações:

- [ ] **Fase 1:** Fornecedor, Cliente e Centro de custo cadastrados e utilizados em CP/CR/transação/despesa; listagens e filtros funcionando.
- [ ] **Fase 2:** Documentos fiscais cadastrados e vinculados a CP/CR/transação; listagem e filtros; estrutura pronta para NF-e.
- [ ] **Fase 3:** Fluxo de caixa projetado, DRE e conciliação bancária funcionando; números consistentes com lançamentos.
- [ ] **Fase 4:** Pedido de compra criado, recebido; estoque e CP (se aplicável) atualizados corretamente.
- [ ] **Fase 5:** Pedido de venda criado, faturado; CR e estoque (se aplicável) atualizados corretamente.
- [ ] **Fase 6:** Relatórios por fornecedor e por cliente; exportação PDF e Excel nos relatórios definidos.

Este documento deve ser atualizado com dados reais de teste (ex.: “Acessar https://.../suppliers”) e resultados observados, para servir como evidência e manual de aceite.
