
## Objetivo

Adicionar aos Pacientes Virtuais um **módulo de coleta e análise de dados científicos** alinhado ao artigo "Integração de LLM e RAG para Simulações Clínicas". O sistema capturará automaticamente indicadores durante as sessões (que já existem em `virtual_patient_sessions` + `virtual_patient_messages`) e gerará um relatório PDF premium com todas as métricas descritas no artigo.

## Escopo

### 1. Captura automática de dados por sessão

Estender `virtual_patient_sessions` para armazenar métricas técnicas por sessão:
- `total_tokens` (tokens consumidos)
- `avg_latency_ms` (latência média da IA)
- `total_interactions` (pares Q→R)
- `operational_failures` (falhas/timeouts)

A edge function `virtual-patient-chat` passa a registrar tokens (via `usage` do Gemini) e latência a cada turno.

### 2. Nova tabela `vp_research_metrics`

Métricas calculadas por sessão (ou por grupo/turma) para o estudo:

```
- session_id / class_id / group_id
- idcg_score (1-5, média das 5 dimensões)
- idcg_dimensions (jsonb: empatia, escuta, raciocínio, conduta, segurança)
- isc_score (soma_ponderada / n)
- unsafe_conducts (jsonb: [{descrição, gravidade: 1|2|3}])
- semantic_coherence (cosine sim. média entre respostas equivalentes)
- rag_accuracy (0-1, avaliação do professor)
- realism_score (Likert 1-5)
- empathy_score / clinical_adequacy_score
- qualitative_notes (texto)
- evaluator_id, evaluated_at
```

Com RLS + GRANTs padrão.

### 3. Formulário de avaliação IDCG + ISC (professor)

Nova página `/pacientes-virtuais/pesquisa/:sessionId` acessível a partir do card do paciente no VP Analytics. Formulário com:

- **IDCG**: 5 sliders Likert 1-5 (empatia, escuta ativa, raciocínio clínico, conduta terapêutica, segurança) → média automática
- **ISC**: lista dinâmica de "condutas inseguras identificadas" com gravidade (leve/moderada/grave) → cálculo automático
- **Realismo do agente**: Likert 1-5 (empatia verbal, adequação clínica, naturalidade)
- **Precisão RAG**: % de respostas farmacologicamente corretas (revisão do transcript)
- **Notas qualitativas**: campo livre para interpretação de padrões, momentos-chave

### 4. Cálculo automático de coerência semântica

Nova edge function `vp-compute-coherence`:
- Recebe `session_id`
- Extrai pares Q→R do `virtual_patient_messages`
- Calcula similaridade TF-IDF entre perguntas para identificar equivalentes (≥ 0,35)
- Calcula cosseno médio entre respostas equivalentes
- Devolve `semantic_coherence`, `q_r_pairs`, `comparable_pairs`, `same_stage`/`between_stages`
- Persiste em `vp_research_metrics`

### 5. Dashboard de pesquisa

Nova aba **"Pesquisa Científica"** em `VPAnalytics.tsx`:
- Tabela por grupo/caso (moldes das Tabelas 1-5 do artigo)
- Gráfico de dispersão IDCG × ISC (Recharts) — reproduz Figura 4
- Cards de robustez operacional (latência, tokens médios, conexões, taxa RAG)
- Filtros por turma, período, contexto clínico (dor/inflamação/etc)

### 6. Relatório PDF Premium

Novo componente `VPResearchReport.tsx` (baseado no padrão navy/gold já usado em `SimulationReportGenerator`) gerando PDF via jsPDF com:

1. **Capa** — título do estudo, turma, período, logo
2. **Sumário executivo** — n de sessões, IDCG médio, ISC médio, coerência média
3. **Tabela 1** — Coerência semântica por grupo (Q→R, pares, sim. média, DP)
4. **Tabela 2** — Estabilidade comportamental, latência, realismo
5. **Tabela 3** — IDCG por grupo/caso
6. **Tabela 4** — ISC por grupo/caso com classificação de risco
7. **Figura** — dispersão IDCG × ISC renderizada como imagem
8. **Tabela 5** — Robustez operacional e consistência informacional
9. **Análise qualitativa** — compilação das notas dos avaliadores
10. **Legendas e metodologia** conforme o artigo

Estética: capa navy com faixa dourada, cabeçalhos das tabelas em navy, alternância de linhas, tipografia serifada para títulos.

## Detalhes técnicos

- Backend: 1 migration (nova tabela + colunas em `virtual_patient_sessions`), 1 edge function nova (`vp-compute-coherence`), 1 edge function ajustada (`virtual-patient-chat` para logar tokens/latência).
- Frontend: formulário de avaliação (shadcn + FormRenderer), aba nova em VPAnalytics, componente PDF, botão "Gerar Relatório de Pesquisa".
- Similaridade TF-IDF/cosseno feita em Deno puro (sem libs pesadas).
- Reaproveita `competency_scores` só como referência — as métricas de pesquisa vivem em tabela própria para não misturar avaliação formativa com dados científicos.

## Fora do escopo (perguntar depois se quiser)

- Consentimento eletrônico do estudante (LGPD) para uso em publicação
- Exportação CSV/Excel dos dados brutos para SPSS/R
- Cálculo automático do IDCG a partir de rubrica pré-configurada aplicada ao transcript pela IA (hoje a nota vem do professor)

Confirma que sigo com essa estrutura?
