# Regras de Negócio Financeiro — Loja Vida e Saúde

**Versão:** 1.0  
**Status:** Especificação aprovada para implementação  
**Escopo:** Cálculos financeiros, status, datas, dashboards, fluxo diário, projeções e relatórios

---

## 1. Objetivo do documento

Este documento define as **regras de negócio financeiras** do sistema Loja Vida e Saúde. Ele existe para:

- Eliminar ambiguidades entre **caixa realizado** e **caixa previsto**.
- Padronizar o uso de **`date`** (data de lançamento) e **`dueDate`** (data de vencimento).
- Servir como referência única para implementação, testes e migração futura para Supabase.
- Corrigir inconsistências identificadas na auditoria técnica, em que status (`pendente`, `pago`, `recebido`) era ignorado em totais e projeções.

**Princípio central:** valores **realizados** e **previstos** nunca devem ser somados no mesmo indicador sem rótulo explícito. Indicadores mistos devem ser evitados.

**Moeda:** todos os cálculos internos usam centavos inteiros (`amountCents`).

**Período mensal:** definido pelo seletor "Mês de análise" (`YYYY-MM`), do dia 1 ao último dia do mês, inclusive.

---

## 2. Definição de tipos de lançamento

### 2.1 Entrada (`entrada`)

Representa **dinheiro que entra** no caixa da loja.

**Exemplos:** vendas, recebimentos de clientes, reembolsos, outras receitas.

**Regras:**

- Valor sempre positivo.
- Deve possuir categoria, descrição, `date`, `dueDate` e status.
- Status permitidos: `pendente`, `recebido`.
- Status `pago` não é permitido (na importação legada: `pago` → `recebido`).

### 2.2 Saída (`saida`)

Representa **dinheiro que sai** do caixa da loja.

**Exemplos:** fornecedores, aluguel, energia, impostos, pró-labore, fretes.

**Regras:**

- Valor sempre positivo.
- Deve possuir categoria, descrição, `date`, `dueDate` e status.
- Status permitidos: `pendente`, `pago`.
- Status `recebido` não é permitido (na importação legada: `recebido` → `pago`).

---

## 3. Definição dos status

### 3.1 Status persistidos

| Status | Tipo | Significado |
|--------|------|-------------|
| `pendente` | entrada / saída | Valor ainda **não liquidado** no caixa. Compromisso em aberto. |
| `recebido` | entrada | Valor **já recebido** e efetivado no caixa. |
| `pago` | saída | Valor **já pago** e efetivado no caixa. |

**Transições permitidas:**

- `pendente` → `recebido` (entrada)
- `pendente` → `pago` (saída)
- Reversão para `pendente` quando o lançamento foi marcado por engano

**Transições não permitidas:**

- Entrada com status `pago`
- Saída com status `recebido`

### 3.2 Status derivados (não persistidos)

Calculados em tempo de exibição com base em `dueDate` e `status = pendente`.

| Status derivado | Condição | Tipo |
|-----------------|----------|------|
| **Vencido** | `type = saida` AND `status = pendente` AND `dueDate < hoje` | Saída pendente em atraso |
| **A receber atrasado** | `type = entrada` AND `status = pendente` AND `dueDate < hoje` | Entrada pendente em atraso |

**Regra fundamental de persistência:**

O status salvo no banco de dados ou no `localStorage` **permanece sempre `pendente`** enquanto o lançamento não for liquidado. **"Vencido"** e **"A receber atrasado"** são **apenas estados de exibição** — calculados na interface ou em camadas de apresentação, nunca gravados como valor de `status`.

**Regras dos derivados:**

- **Nunca** alteram o status persistido: o registro continua com `status = pendente`.
- **Nunca** devem ser exportados, importados ou sincronizados como status independentes.
- Servem exclusivamente para filtros, rótulos na tabela, destaque visual e contadores de alerta.
- "Hoje" = data local do dispositivo, formato `YYYY-MM-DD`.
- Entrada pendente em atraso **não** se chama "vencida"; usa-se **"a receber atrasado"**.

### 3.3 Classificação financeira (eixo transversal)

Todo lançamento pertence a exatamente uma classe para cálculo:

| Classe | Regra |
|--------|--------|
| **Realizado — receita** | `entrada` + `recebido` |
| **Realizado — despesa** | `saida` + `pago` |
| **Previsto — receita** | `entrada` + `pendente` |
| **Previsto — despesa** | `saida` + `pendente` |

---

## 4. Diferença entre conceitos de saldo e fluxo

### 4.1 Saldo realizado

**Definição:** posição de caixa **efetivamente liquidada** até uma data de corte.

**Fórmula (até a data D, inclusive):**

```
Saldo realizado(D) =
  Σ entradas recebidas com dueDate ≤ D
  − Σ saídas pagas com dueDate ≤ D
```

**Uso:** "Quanto eu tenho de fato?" / posição consolidada de caixa.

**Observação sobre data de liquidação (v1):**

Na versão atual, `dueDate` é usado como **proxy da data de efeito no caixa** para lançamentos com status `pago` ou `recebido`. Ou seja, considera-se que a liquidação ocorreu na data de vencimento, mesmo que o pagamento ou recebimento tenha acontecido em outro dia.

**Evolução prevista (v2):**

Em uma versão futura, pagamentos e recebimentos deverão ter **campos próprios de liquidação**, como `paidAt` (saídas) e `receivedAt` (entradas). Nessa versão, o saldo realizado passará a usar essas datas reais de liquidação, e `dueDate` ficará restrito ao planejamento e ao saldo previsto.

### 4.2 Saldo previsto

**Definição:** posição esperada se **todos os pendentes até a data D forem liquidados** na data prevista.

**Fórmula (até a data D, inclusive):**

```
Saldo previsto(D) =
  Saldo realizado(D)
  + Σ entradas pendentes com dueDate ≤ D
  − Σ saídas pendentes com dueDate ≤ D
```

**Uso:** "Quanto terei se tudo ocorrer conforme o vencimento?"

### 4.3 Saldo do mês

**Definição:** resultado **do mês selecionado**, restrito ao intervalo `[início do mês, fim do mês]`.

Existem **duas variantes explícitas**:

| Variante | Fórmula no mês M |
|----------|------------------|
| **Saldo realizado do mês** | entradas recebidas (dueDate em M) − saídas pagas (dueDate em M) |
| **Saldo previsto do mês** | (recebidas + pendentes de entrada em M) − (pagas + pendentes de saída em M) |

**Não confundir com:** saldo acumulado histórico. "Saldo do mês" é fluxo **dentro do mês**, não posição total de caixa.

### 4.4 Fluxo de caixa por vencimento

**Definição:** agrupamento e totais pela **`dueDate`**.

**Pergunta que responde:** "O que vence / liquida em cada dia ou mês?"

**Uso principal:**

- Cards mensais
- Fluxo diário
- Projeções
- Contas a vencer / vencidas
- Planejamento de pagamentos e recebimentos

### 4.5 Fluxo de caixa por lançamento

**Definição:** agrupamento e totais pela **`date`** (data do lançamento).

**Pergunta que responde:** "O que foi registrado / ocorreu operacionalmente em cada dia ou mês?"

**Uso principal:**

- Relatório operacional simplificado
- Conferência de "o que lançamos este mês"
- Análise por categoria no modo operacional (opcional)

**Regra de produto:** o **modo padrão** da aplicação é **por vencimento**. O modo por lançamento é **secundário** (toggle ou aba).

---

## 5. Regra de uso das datas

| Análise | Data principal | Observação |
|---------|----------------|------------|
| Cards mensais (receitas/despesas/saldos) | `dueDate` | Modo padrão: caixa por vencimento |
| Contas vencidas / a vencer | `dueDate` | Comparar com hoje |
| Recebimentos atrasados | `dueDate` | Entrada pendente com dueDate < hoje |
| Fluxo diário (visão principal) | `dueDate` | Dia consultado = vencimentos daquele dia |
| Projeção 7 / 15 / 30 dias | `dueDate` | Acumulado até hoje+N |
| Ordenação da tabela de lançamentos | `dueDate` (primário), `date` (secundário) | Mantém comportamento atual |
| Relatório por categoria (padrão) | `dueDate` | Alinhado ao mês de análise |
| Relatório por categoria (opcional) | `date` | Toggle "Por lançamento" |
| Status derivados (vencido / a receber atrasado) | `dueDate` | Sempre |
| Formulário — defaults | `date` e `dueDate` = hoje | Praticidade no cadastro |

**Regra explícita na UI:** toda seção baseada em vencimento deve exibir nota: *"Calculado pela data de vencimento."*

---

## 6. Regras para os cards mensais

**Escopo padrão:** lançamentos com `dueDate` dentro do mês selecionado, salvo onde indicado.

### 6.1 Entradas recebidas

```
Σ amountCents onde type = entrada AND status = recebido AND dueDate ∈ mês
```

### 6.2 Entradas previstas

```
Σ amountCents onde type = entrada AND status = pendente AND dueDate ∈ mês
```

Inclui entradas "a receber atrasado" cujo vencimento caia no mês.

### 6.3 Saídas pagas

```
Σ amountCents onde type = saida AND status = pago AND dueDate ∈ mês
```

### 6.4 Saídas previstas

```
Σ amountCents onde type = saida AND status = pendente AND dueDate ∈ mês
```

Inclui saídas vencidas cujo vencimento caia no mês.

### 6.5 Saldo realizado do mês

```
Entradas recebidas − Saídas pagas
```

(ambos com `dueDate` no mês)

### 6.6 Saldo previsto do mês

```
(Entradas recebidas + Entradas previstas) − (Saídas pagas + Saídas previstas)
```

Equivalente ao saldo líquido agendado no mês, independentemente de liquidação.

### 6.7 Contas vencidas

**Tipo:** contador + valor total.

**Escopo:** **global** (não limitado ao mês), pois dívida vencida continua relevante mesmo se venceu em mês anterior.

```
Contagem: saida AND pendente AND dueDate < hoje
Valor total: Σ amountCents com mesma regra
```

**Subset opcional:** "Vencidas com vencimento em [mês]" para visão mensal secundária.

### 6.8 Contas a vencer

**Escopo:** dentro do mês selecionado, ainda não pagas, vencimento futuro ou hoje.

```
Contagem: saida AND pendente AND dueDate ≥ hoje AND dueDate ∈ mês
Valor total (opcional): Σ amountCents com mesma regra
```

### 6.9 Recebimentos atrasados

**Escopo:** global (simétrico a contas vencidas).

```
Contagem: entrada AND pendente AND dueDate < hoje
Valor total: Σ amountCents com mesma regra
```

---

## 7. Regras para fluxo diário

**Data consultada:** `dueDate = dia selecionado`.

### 7.1 O que mostrar por dia

| Indicador | Regra |
|-----------|--------|
| Entradas recebidas no dia | `entrada` + `recebido` + `dueDate = dia` |
| Entradas previstas no dia | `entrada` + `pendente` + `dueDate = dia` |
| Saídas pagas no dia | `saida` + `pago` + `dueDate = dia` |
| Saídas previstas no dia | `saida` + `pendente` + `dueDate = dia` |
| Saldo realizado do dia | recebidas − pagas |
| Saldo previsto do dia | (recebidas + previstas entradas) − (pagas + previstas saídas) |
| Pendente a pagar | Σ saídas pendentes no dia |
| Pendente a receber | Σ entradas pendentes no dia |

### 7.2 Como tratar pendentes

- Entram em **totais previstos** e em **pendente a pagar / receber**.
- **Não entram** em saldo realizado do dia.
- Se `dueDate < hoje`, exibir badge derivado ("vencido" ou "a receber atrasado"), inclusive ao consultar dias passados.

### 7.3 Como tratar pagos

- Contam apenas em **saídas pagas** e **saldo realizado**.
- Não entram em "pendente a pagar".

### 7.4 Como tratar recebidos

- Contam apenas em **entradas recebidas** e **saldo realizado**.
- Não entram em "pendente a receber".

### 7.5 Como tratar vencidos

- **Vencido** (saída pendente com `dueDate < hoje`): conta em saídas previstas e pendente a pagar; **não** conta como pago; destaque visual de alerta.
- **A receber atrasado** (entrada pendente com `dueDate < hoje`): conta em entradas previstas e pendente a receber; **não** conta como recebido; destaque visual de alerta.

### 7.6 Tabela "Próximos 7 dias"

**Escopo:** de hoje até hoje+6, sempre por `dueDate`.

**Colunas recomendadas:**

| Coluna | Conteúdo |
|--------|----------|
| Data | `dueDate` |
| Entradas realizadas | recebidas |
| Entradas previstas | pendentes |
| Saídas pagas | pagas |
| Saídas previstas | pendentes |
| Pendente a pagar | saídas pendentes |
| Pendente a receber | entradas pendentes |
| Saldo realizado do dia | recebidas − pagas |
| Saldo previsto do dia | (recebidas + pend. entradas) − (pagas + pend. saídas) |

**Simplificação mobile (MVP):** priorizar Data, Entradas (realiz./prev.), Saídas (realiz./prev.), Pend. pagar, Saldo previsto.

---

## 8. Regras para projeção de 7, 15 e 30 dias

### 8.1 O que entra na projeção

A projeção mostra **posição acumulada até a data alvo**, com composição explícita:

```
Projeção prevista(D) = Saldo previsto(D)
```

Equivalente a:

```
Projeção prevista(D) = Saldo realizado(hoje) + impacto dos pendentes com dueDate ∈ (hoje, D]
```

Onde o impacto pendente soma entradas pendentes e subtrai saídas pendentes com vencimento entre amanhã e D (inclusive).

**Card "Hoje":** exibe `Saldo realizado(hoje)` — caixa liquidado, **sem** incluir pendentes futuros.

**Cards +7, +15, +30:** exibem `Saldo previsto(hoje+N)` — caixa esperado se pendentes até a data forem liquidados.

### 8.2 Se deve considerar saldo inicial

**Sim, implicitamente via histórico realizado (v1):**

```
Saldo realizado(hoje) = Σ recebidos (dueDate ≤ hoje) − Σ pagos (dueDate ≤ hoje)
```

**v2 (recomendada para Supabase):** campo opcional `saldoInicialCents` + `saldoInicialEm` na configuração da loja. Projeção = saldo inicial + movimentos realizados após essa data.

**Nota na UI (v1):** *"Saldo base calculado pelos lançamentos cadastrados."*

### 8.3 Como separar realizado e previsto

| Card | Valor principal | Composição |
|------|-----------------|------------|
| Hoje | Saldo realizado(hoje) | Caixa liquidado |
| +7 dias | Saldo previsto(hoje+7) | Realizado + pendentes até a data |
| +15 dias | Saldo previsto(hoje+15) | Idem |
| +30 dias | Saldo previsto(hoje+30) | Idem |

**Opcional:** linha secundária "Variação prevista" = Projeção(D) − Saldo realizado(hoje).

### 8.4 O que a projeção não deve fazer

- Não somar pendentes sem incluir saldo realizado base.
- Não tratar pendentes vencidos como realizados.
- Não misturar `date` e `dueDate` no mesmo indicador.
- Não considerar **apenas** pendentes — a base realizada é obrigatória.

---

## 9. Regras para relatórios por categoria

### 9.1 Quando usar data de vencimento

**Padrão da aplicação.** Usar `dueDate` para:

- Relatório por categoria no mês de análise
- Gráficos de entradas x saídas
- Gráfico de saídas por categoria
- Qualquer visão de planejamento de caixa

Filtro de período: mês de análise aplicado sobre `dueDate`.

### 9.2 Quando usar data de lançamento

Usar `date` apenas no **modo operacional** (toggle "Por lançamento"):

- Conferência do que foi registrado no mês
- Análise operacional por categoria
- Comparativo "quando lançamos" vs "quando vence"

### 9.3 Como separar realizado e previsto

Estrutura recomendada por categoria:

| Categoria | Entradas recebidas | Entradas previstas | Saídas pagas | Saídas previstas | Saldo realizado | Saldo previsto |
|-----------|--------------------|--------------------|--------------|------------------|-----------------|----------------|

**Saldo realizado por categoria** = entradas recebidas − saídas pagas.

**Saldo previsto por categoria** = (recebidas + pendentes entradas) − (pagas + pendentes saídas).

**Gráficos:**

- Entradas x Saídas: barras ou séries separadas para Realizado vs Previsto.
- Saídas por categoria: padrão = saídas pagas; toggle para incluir previstas.

---

## 10. Mudanças recomendadas na interface

### 10.0 Organização dos cards em três grupos

Recomenda-se que a seção de resumo mensal seja reorganizada em **três grupos visuais distintos**, cada um com título de seção próprio:

#### Resumo Realizado

Reflete o que **já entrou ou saiu** do caixa no mês (por vencimento):

| Card | Métrica |
|------|---------|
| Entradas recebidas | §6.1 |
| Saídas pagas | §6.3 |
| Saldo realizado do mês | §6.5 |

#### Resumo Previsto

Reflete o que **ainda está agendado** ou o comprometimento total do mês:

| Card | Métrica |
|------|---------|
| Entradas previstas | §6.2 |
| Saídas previstas | §6.4 |
| Saldo previsto do mês | §6.6 |

#### Alertas

Reflete situações que **exigem atenção imediata**, independentemente do mês de análise (salvo onde indicado):

| Card | Métrica |
|------|---------|
| Contas vencidas | §6.7 (contagem + valor) |
| Contas a vencer no mês | §6.8 |
| Recebimentos atrasados | §6.9 (contagem + valor) |

Esses três grupos devem aparecer como blocos separados na interface (seções, abas ou cards agrupados), evitando misturar indicadores de caixa liquidado, compromissos futuros e alertas operacionais no mesmo conjunto visual.

### 10.1 Cards que devem ser renomeados

| Card atual | Novo nome |
|------------|-----------|
| Saldo do Mês | Saldo realizado do mês |
| Entradas do Mês | Entradas recebidas |
| Saídas do Mês | Saídas pagas |
| A Vencer no Mês | Contas a vencer no mês |
| Vencidas no Mês | Contas vencidas |
| Projeção de Caixa — Hoje | Caixa realizado (hoje) |
| Projeção — +7 / +15 / +30 | Caixa previsto em 7 / 15 / 30 dias |

### 10.2 Cards que devem ser criados

| Novo card | Métrica |
|-----------|---------|
| Entradas previstas | §6.2 |
| Saídas previstas | §6.4 |
| Saldo previsto do mês | §6.6 |
| Recebimentos atrasados | §6.9 (contagem + valor) |
| Pendente a receber | Fluxo diário e tabela semanal |
| Caixa realizado acumulado (hoje) | Base das projeções |

Os cards acima devem ser distribuídos conforme o agrupamento definido em §10.0 (**Resumo Realizado**, **Resumo Previsto**, **Alertas**).

### 10.3 Cards que devem ser removidos ou ajustados

| Card / comportamento | Ação |
|----------------------|------|
| "Saldo do Mês" único (mistura status) | **Remover** — substituído por realizado + previsto |
| "Entradas do Mês" / "Saídas do Mês" únicos | **Remover** — substituídos por pares realizado/previsto |
| "Vencidas no Mês" como único alerta | **Ajustar** — escopo global para contas vencidas; subset mensal opcional |
| "Projeção de Caixa" sem distinção | **Ajustar** — separar caixa realizado (hoje) de caixa previsto (+N dias) |
| Contagem sem valor em alertas | **Ajustar** — exibir valor total além da contagem |

### 10.4 Outros ajustes de interface

- Adicionar filtro **"A receber atrasado"** na tabela de lançamentos.
- Destaque visual: linha vermelha para vencido (saída); linha amarela/laranja para a receber atrasado (entrada).
- Toggle global: **"Ver por vencimento / por lançamento"** (relatórios; resumo mensal na v2).
- Textos de ajuda fixos em cada seção (ver §5).

---

## 11. Ordem recomendada de implementação

### Fase 1 — Fundação de domínio

1. Implementar enums e classificadores (`realizado`, `previsto`, status derivados).
2. Extrair funções puras de classificação e filtro por data/status.
3. Cobrir com testes unitários: combinações tipo × status × datas.

### Fase 2 — Correção dos cálculos core

4. Reimplementar resumo mensal conforme §6.
5. Reimplementar fluxo diário e tabela semanal conforme §7.
6. Reimplementar projeções conforme §8.
7. Ajustar relatório por categoria e gráficos conforme §9.

### Fase 3 — Interface alinhada às regras

8. Renomear, criar e remover cards conforme §10.
9. Adicionar "A receber atrasado" na listagem e filtros.
10. Incluir notas de escopo (vencimento vs lançamento).
11. Reorganizar layout mobile (abas ou agrupamento Realizado | Previsto | Alertas).

### Fase 4 — Persistência e qualidade

12. Introduzir camada de repositório (preparação Supabase).
13. Unificar validação de backup/import para todos os formatos.
14. (Opcional v2) Campos `saldoInicialCents`, `paidAt`, `receivedAt`.

### Fase 5 — Evolução multi-dispositivo

15. Schema Supabase + RLS alinhado ao domínio estabilizado.
16. Sincronização offline/online.
17. PWA e ajustes mobile finais.

**Critério de pronto da Fase 2:** para um conjunto de lançamentos de teste conhecido, cards mensais, fluxo diário e projeções produzem valores reproduzíveis e coerentes com as fórmulas deste documento.

---

## 12. Riscos se essas regras não forem definidas antes do Supabase

| Risco | Impacto |
|-------|---------|
| **Schema SQL incorreto** | Tabelas e views refletindo regras ambíguas (ex.: saldo único sem distinção realizado/previsto). Retrabalho costoso de migration. |
| **RLS e agregações erradas** | Políticas e queries remotas calculando totais que misturam pendentes com liquidados. Dados inconsistentes entre dispositivos. |
| **Dupla contagem na sync** | Sem classificação clara, merge de dados locais e remotos pode somar pendentes como realizados. |
| **Projeções persistidas incorretamente** | Cache ou materialized views com fórmula errada propagada a todos os clientes. |
| **Impossibilidade de testes confiáveis** | Sem regras formais, testes de integração não têm critério de aceite objetivo. |
| **Dívida técnica permanente** | Correção pós-migração exige alterar schema, backfill histórico e reconciliar dados de produção. |
| **Perda de confiança do usuário** | Números diferentes entre localStorage e Supabase, ou entre dispositivos, sem explicação. |
| **UI enganosa congelada** | Cards como "Saldo do Mês" perpetuam interpretação incorreta em ambiente multi-dispositivo. |
| **Status derivados mal implementados** | "Vencido" calculado no banco de formas distintas entre client e server. |
| **Backup/import incompatível** | Formato JSON exportado sem semântica clara dificulta migração idempotente para Postgres. |

**Recomendação:** concluir **Fase 1 e Fase 2** (domínio + cálculos) **antes** de modelar tabelas Supabase. O schema remoto deve espelhar as regras deste documento, não o comportamento atual do `app.js`.

---

## Decisões em aberto (validação com negócio)

| # | Decisão | Recomendação |
|---|---------|--------------|
| 1 | Contas vencidas: escopo global ou só no mês? | Global para alerta; subset mensal opcional |
| 2 | Realizado usa `dueDate` ou exige `paidAt`/`receivedAt`? | `dueDate` na v1; evoluir na v2 |
| 3 | Saldo inicial explícito? | Opcional v2; histórico na v1 |
| 4 | Toggle "por lançamento" no resumo mensal? | Só em relatórios na v1; toggle global na v2 |
| 5 | Valor monetário nos cards de contagem? | Sim, além da contagem |

---

## Resumo executivo

O sistema opera em **dois planos**: **caixa realizado** (`recebido`/`pago`) e **caixa previsto** (`pendente` por vencimento). A **`dueDate`** é o eixo padrão; a **`date`** serve visão operacional. Status derivados **vencido** e **a receber atrasado** completam alertas sem alterar o modelo persistido. Projeções partem de **saldo realizado acumulado** e incorporam pendentes até a data alvo. A UI deve ser **desdobrada** em indicadores separados, eliminando a ambiguidade dos cards atuais.
