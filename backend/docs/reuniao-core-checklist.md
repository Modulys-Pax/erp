# Checklist para reunião — CORE e fluxos completos

Documento de apoio para alinhar com stakeholders o que será implementado e o que fica para depois (emissão de notas).

---

## 1. Mensagem principal

- **Faremos** todos os fluxos de cadastro, financeiro, compras e documento fiscal (rastreabilidade), para o sistema ficar completo para uso no dia a dia.
- **Não faremos agora** a emissão de NF-e/NFSe (depende de certificado digital); quando houver certificado, a integração será feita em cima da estrutura que já estará pronta.

---

## 2. O que já temos (hoje)

- Empresa, filiais, produtos, unidades de medida  
- Frota (veículos, documentos, marcações, etiquetas de manutenção)  
- Manutenção (ordens, materiais, integração com estoque)  
- Estoque (almoxarifado, movimentação, custo médio)  
- Financeiro: contas a pagar/receber, carteira por filial, resumo mensal (realizado + pendente)  
- RH: funcionários, folha, férias, benefícios, despesas  
- Auditoria, chat, dashboard, RBAC  

---

## 3. O que vamos implementar (fluxos completos)

| # | Item | O que o usuário passa a ter |
|---|------|----------------------------|
| 1 | **Fornecedor e Cliente** | Cadastro de quem paga e quem recebe; CP vinculada a fornecedor, CR a cliente; relatórios por terceiro |
| 2 | **Centro de custo** | Um nível de centro de custo; uso em transação, CP, CR e despesa; relatórios por centro |
| 3 | **Documento fiscal (rastreabilidade)** | Cadastro de notas de entrada/saída (número, valor, data), vínculo com CP/CR/transação; estrutura pronta para NF-e depois |
| 4 | **Fluxo de caixa projetado** | Visão dos próximos 3–6 meses: quanto entra e sai por mês e saldo projetado |
| 5 | **Resultado por período (DRE simplificada)** | Relatório: receitas − despesas por mês/ano, com quebra por origem e por centro de custo |
| 6 | **Pedido de compra** | Cadastro de PC (fornecedor + itens); ação "Receber" gera entrada de estoque e opcionalmente conta a pagar |

---

## 4. O que fica para depois

- **Emissão de NF-e/NFSe:** após aquisição do certificado digital; integração com SEFAZ em cima do modelo de documento fiscal já implementado (apenas rastreabilidade por enquanto).

---

## 5. Sugestão de agenda para a reunião

1. **Contexto (2 min)**  
   Objetivo: fechar fluxos do core e deixar sistema pronto para uso; emissão de notas em fase posterior.

2. **O que já temos (3 min)**  
   Passar rapidamente pelos módulos atuais (frota, manutenção, estoque, financeiro, RH, etc.).

3. **O que vamos entregar (10 min)**  
   - Fornecedor e Cliente → vínculo em CP/CR.  
   - Centro de custo → relatórios por centro.  
   - Documento fiscal → rastreabilidade de notas (sem emissão).  
   - Fluxo de caixa projetado → próximos meses.  
   - DRE simplificada → resultado por período.  
   - Pedido de compra → comprar → receber → estoque (e opcional CP).

4. **Emissão de notas (2 min)**  
   Confirmar: não agora; quando tiver certificado digital, a integração será feita sem refazer o que for implementado.

5. **Cronograma e prioridade (5 min)**  
   Ordem sugerida: Fase 1 (cadastros) → Fase 2 (documento fiscal) → Fase 3 (fluxo + DRE) → Fase 4 (pedido de compra). Ajustar conforme necessidade do negócio.

6. **Perguntas e próximos passos (5 min)**  
   Definir data da próxima revisão e responsáveis (ex.: quem define centros de custo, quem testa PC).

---

## 6. Pontos para validar na reunião

- [ ] Ordem das fases está ok? (cadastros → fiscal → financeiro → compras)  
- [ ] Centro de custo: um nível só está ok ou precisamos de hierarquia?  
- [ ] Pedido de compra: ao receber, criamos sempre uma CP por PC ou apenas quando houver regra específica?  
- [ ] Documento fiscal: além de número/série/data/valor, algum campo obrigatório para o contador?  
- [ ] Emissão de notas: há previsão de aquisição do certificado? (só para alinhar expectativa de quando fazer a integração.)

---

*Usar este checklist na reunião e preencher os itens validados para documentar os combinados.*
