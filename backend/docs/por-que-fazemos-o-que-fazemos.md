# Por que fazemos o que fazemos

**Objetivo deste documento:** Explicar, de forma clara e com exemplos, o **motivo de negócio e técnico** de cada bloco do sistema. Serve para qualquer pessoa (gestor, desenvolvedor, contador) entender **por que** cada funcionalidade existe e como ela se encaixa no todo.

---

## Visão geral: o que estamos construindo

Estamos construindo um **ERP** (sistema de gestão empresarial) que compita com soluções como a **TOTVS**. Isso implica:

- **Cadastros base** que sustentam todos os fluxos (fornecedor, cliente, centro de custo).
- **Rastreabilidade** entre documentos fiscais e movimentações financeiras (contas a pagar, contas a receber).
- **Visão de caixa e resultado**: fluxo de caixa projetado, DRE simplificada, conciliação bancária.
- **Ciclos de compra e venda**: pedido de compra, recebimento, pedido de venda, faturamento.
- **Relatórios e exportação** para análise e uso pelo contador.

Cada fase foi pensada para **não duplicar esforço**: um cadastro feito uma vez é reutilizado em vários lugares. Assim evitamos “valor solto” (ex.: “paguei R$ 5.000” sem saber **a quem**) e ganhamos relatórios úteis.

---

## Por que a Fase 1 (Cadastros base) existe

Sem cadastros centralizados, o sistema vira uma planilha: você tem “descrição + valor” e nada mais. Com **Fornecedor**, **Cliente** e **Centro de custo**, passamos a responder perguntas que um ERP precisa responder.

### Fornecedor

| Sem fornecedor | Com fornecedor |
|----------------|----------------|
| “Conta a pagar de R$ 10.000” | “Conta a pagar de R$ 10.000 **para a Empresa XYZ Ltda**” |
| Não dá para saber quem cobrar, quem negociar, nem histórico por parceiro | Relatório “quem devo”, histórico por fornecedor, base para pedido de compra e documento fiscal |

**Exemplo:**  
A empresa paga várias contas de luz, aluguel e fornecedor de matéria-prima. Sem cadastro de fornecedor, você só vê “Pagamento – R$ 15.000”. Com fornecedor, você vê “Energia Elétrica – R$ 3.000”, “Aluguel – R$ 5.000”, “Fornecedor ABC – R$ 7.000” e pode gerar relatórios por fornecedor, negociar prazos e vincular notas fiscais depois.

### Cliente

| Sem cliente | Com cliente |
|-------------|-------------|
| “Conta a receber de R$ 8.000” | “Conta a receber de R$ 8.000 **do Cliente João Comércio**” |
| Não dá para cobrar por nome nem ver “quem me deve” | Relatório “quem me deve”, histórico por cliente, base para pedido de venda e faturamento |

**Exemplo:**  
Você vende para 50 clientes. Sem cliente, a lista de contas a receber é só valor e vencimento. Com cliente, você filtra “todas as CR do Cliente X”, vê o histórico de pagamentos dele e usa o mesmo cadastro no pedido de venda e no documento fiscal de saída.

### Centro de custo

| Sem centro de custo | Com centro de custo |
|--------------------|---------------------|
| “Despesa de R$ 2.000” | “Despesa de R$ 2.000 **no centro Frota**” |
| Não dá para saber “onde” o dinheiro foi gasto (área, departamento, projeto) | DRE e relatórios por centro de custo; gestão por área (Frota, RH, Administrativo, etc.) |

**Exemplo:**  
A empresa tem Frota, RH e Administrativo. Cada lançamento (transação, CP, CR, despesa) pode ser marcado com um centro de custo. No **Resultado por Período (DRE)** você filtra ou quebra por centro e vê: “No mês de janeiro, o centro Frota gastou R$ X e o centro RH, R$ Y.” Isso permite controle gerencial sem precisar de plano de contas contábil completo.

**Resumo Fase 1:**  
Fornecedor e Cliente dão **identidade** às contas a pagar e a receber; Centro de custo dá **destino/origem** aos lançamentos. Tudo isso é reutilizado em CP, CR, transações, despesas, pedidos e relatórios.

---

## Por que a Fase 2 (Documento fiscal) existe

No dia a dia, a empresa lida com **notas fiscais**: de compra (entrada) e de venda (saída). O contador e a fiscal precisam saber: “essa nota está ligada a qual pagamento ou recebimento?”.

### O problema sem documento fiscal

- Você paga uma conta a pagar de R$ 20.000. No sistema está “Pagamento Fornecedor ABC”.
- A Receita Federal ou o contador perguntam: “Qual nota fiscal comprova esse valor?”
- Sem vínculo, você procura na gaveta ou no e-mail; com vínculo, você abre a CP e vê “Documento fiscal NF 12345 vinculado”.

### O que o documento fiscal entrega

- **Cadastro** da nota (número, série, data, valor, tipo entrada/saída, status).
- **Vínculo** opcional com Conta a pagar, Conta a receber ou Transação financeira.
- **Rastreabilidade**: de uma NF você vai à CP/CR; de uma CP/CR você vê a NF.
- **Preparação para NF-e**: campos como chave, data de emissão e caminho do XML já existem no modelo para quando houver integração com emissão eletrônica.

**Exemplo:**  
O fornecedor emite a NF 98765 no valor de R$ 12.000. Você cadastra o documento fiscal (entrada, número 98765, valor 12.000) e vincula à Conta a pagar correspondente. Daqui a seis meses, o contador pede a nota daquele pagamento: você abre a CP e acessa o documento fiscal vinculado. Tudo rastreável.

**Resumo Fase 2:**  
Documento fiscal não emite nota (isso pode vir depois com certificado digital); ele **registra** e **liga** a nota ao movimento financeiro. Isso é o mínimo que um ERP precisa para competir com o TOTVS em gestão fiscal.

---

## Por que a Fase 3 (Fluxo de caixa, DRE, Conciliação) existe

Esta fase responde a três perguntas essenciais da gestão:

1. **“Teremos caixa suficiente nos próximos meses?”** → Fluxo de caixa projetado.  
2. **“Quanto entrou e quanto saiu no período?”** → Resultado por período (DRE).  
3. **“O extrato do banco bate com o que está lançado no sistema?”** → Conciliação bancária.

### Fluxo de caixa projetado

- Usa o **saldo atual** da carteira e as **contas a pagar e a receber pendentes** com data de vencimento.
- Para cada mês (ex.: próximos 3, 6, 12 ou 24 meses), calcula:  
  **Saldo projetado = Saldo inicial + Recebimentos previstos − Pagamentos previstos.**
- **Gráfico** e **tabela** mostram a evolução mês a mês; o gestor vê onde o caixa pode ficar apertado ou negativo.

**Exemplo:**  
Em março você tem R$ 50.000 de saldo e R$ 80.000 de CP vencendo, mas só R$ 30.000 de CR. O fluxo projetado mostra “saldo projetado em março: R$ 0” (ou negativo). Você antecipa recebimentos, negocia prazos com fornecedores ou busca capital de giro **antes** do problema.

**Exportação (PDF/Excel):**  
O gestor ou o contador precisa levar o fluxo para reunião ou para o banco. Exportar em PDF ou Excel (CSV) mantém os mesmos dados da tela, com formatação de moeda e colunas claras.

### Resultado por período (DRE simplificada)

- **Receitas** = CR recebidas no período + transações do tipo receita no período.  
- **Despesas** = CP pagas no período + transações do tipo despesa + despesas (Expense) lançadas no período.  
- **Resultado** = Receitas − Despesas.  
- Pode haver **quebra por origem** (ex.: manutenção, estoque, RH, manual) e **por centro de custo**.

Não substitui uma DRE contábil completa (que usa plano de contas), mas responde “quanto entrou, quanto saiu e qual o resultado” no período, sem contabilidade complexa.

**Exemplo:**  
Em janeiro a empresa recebeu R$ 100.000 (CR recebidas + receitas manuais) e gastou R$ 70.000 (CP pagas + despesas). O resultado por período mostra **Resultado = R$ 30.000**. Se você filtrar por centro de custo “Frota”, vê quanto desse resultado (ou dessas despesas) veio da Frota.

**Exportação (PDF/Excel):**  
O relatório é exportado com as linhas de resumo (Receitas, Despesas, Resultado) e, quando existir, as quebras por origem e por centro de custo. Assim o contador ou a diretoria podem usar o mesmo número da tela em documentos externos.

### Conciliação bancária

- Você recebe o **extrato do banco** (PDF, CSV ou digita manualmente).
- Cadastra os **itens do extrato** (data, valor, descrição, crédito/débito) em um “extrato” no sistema (por mês/ano).
- **Conciliar** = dizer “este item do extrato é aquele pagamento/recebimento que já está lançado na Carteira (transação financeira)”.
- Itens conciliados ficam marcados; você enxerga o que ainda “não bate” com o banco.

**Exemplo:**  
No extrato do banco aparece “PIX recebido, R$ 5.000, dia 10”. No sistema você tem uma transação de receita na Carteira, mesmo valor e mesma data. Você concilia o item do extrato com essa transação. No fim do mês, todos os itens conciliados = extrato e sistema consistentes. Itens não conciliados podem ser lançamentos que ainda não caíram no banco ou vice-versa, e você corrige.

**Campo de valor com máscara:**  
No “Adicionar item ao extrato”, o valor é informado com o mesmo componente de **moeda** (máscara em real) usado em outros lugares do sistema (ex.: CP, CR). Isso evita erro de digitação e padroniza a experiência (sempre “1.500,00” em vez de “1500” ou “1.500.00”).

**Resumo Fase 3:**  
Fluxo de caixa = **visão futura**; DRE = **visão do período**; Conciliação = **visão de consistência** entre banco e sistema. Os três juntos fecham a necessidade básica de tesouraria e gestão financeira.

---

## Por que as Fases 4 e 5 (Pedido de compra e Pedido de venda) existem

- **Pedido de compra (PC):** “O que encomendamos ao fornecedor?” → Recebimento gera **entrada em estoque** e pode gerar **Conta a pagar**.  
- **Pedido de venda (PV):** “O que vendemos ao cliente?” → Faturamento gera **Conta a receber** e pode gerar **saída de estoque**.

Sem isso, compras e vendas ficam só como “CP” ou “CR” soltas. Com PC e PV, temos **intenção → realização** (recebimento/faturamento) e **rastreabilidade** com estoque e com fornecedor/cliente. É o fluxo que o TOTVS e qualquer ERP de médio porte oferecem.

---

## Por que a Fase 6 (Relatórios e exportação) existe

- **Relatórios por fornecedor e por cliente:** “Quanto devo por fornecedor?” e “Quanto me devem por cliente?” são perguntas diárias de tesouraria e cobrança.  
- **Exportação PDF e Excel:** Relatórios na tela não bastam; o contador e a diretoria precisam **levar os dados** para reuniões, para o banco ou para a contabilidade. PDF para impressão e apresentação; Excel (CSV) para manipulação e cruzamento de dados.

O fluxo de caixa e o resultado por período passam a ter **gráfico** (visão rápida) e **exportação** (uso externo), alinhados ao que se espera de um ERP.

---

## Resumo em uma frase por bloco

| Bloco | Por que existe |
|-------|----------------|
| **Fornecedor** | Saber **a quem** a empresa paga e gerar relatórios e vínculos em CP e documento fiscal. |
| **Cliente** | Saber **quem** deve à empresa e gerar relatórios e vínculos em CR e documento fiscal. |
| **Centro de custo** | Saber **onde** (área/departamento) entrou ou saiu dinheiro; base para DRE gerencial. |
| **Documento fiscal** | Ligar **nota fiscal** a CP/CR/transação; rastreabilidade e preparação para NF-e. |
| **Fluxo de caixa projetado** | Ver **se haverá caixa** nos próximos meses; gráfico e exportação para decisão e apresentação. |
| **Resultado por período (DRE)** | Ver **quanto entrou e saiu** no período; exportação para contador e diretoria. |
| **Conciliação bancária** | **Bater** extrato bancário com lançamentos do sistema; campo valor com máscara para consistência. |
| **Pedido de compra / venda** | Fechar o ciclo **compra → recebimento → estoque/CP** e **venda → faturamento → CR/estoque**. |
| **Exportação PDF/Excel** | Levar relatórios **para fora** do sistema (contador, banco, reuniões) sem perder dados nem formatação. |

---

## Como usar este documento

- **Novos no projeto:** Ler na ordem para entender o “porquê” de cada módulo.  
- **Apresentação para negócio/contador:** Usar a tabela resumo e os exemplos das seções de cada fase.  
- **Desenvolvimento:** Manter o alinhamento: cada implementação deve servir a um desses objetivos; se algo não se encaixa, vale questionar se é necessário ou se está no escopo certo.

Este documento complementa o **documento-entregas-testes-e-justificativas.md**, que detalha *o que* foi implementado e *como testar* cada entrega.
