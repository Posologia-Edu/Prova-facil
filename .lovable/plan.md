

# Sistema de Templates de Formulários — Plano de Implementação

## Visão Geral

Criar um sistema completo de templates reutilizáveis para formulários e espelhos de respostas, com dois tipos:
- **Templates nativos**: pré-configurados com campos baseados em boas práticas de cada área/módulo
- **Templates próprios**: formulários existentes que o professor transforma em template para reutilizar

---

## 1. Banco de Dados

Nova tabela `form_templates`:

```text
form_templates
├── id (uuid PK)
├── owner_id (uuid, ref profiles.user_id)
├── area (text) — "nursing", "nutrition", "dentistry", "medicine", "physiotherapy", "biomedicine", "pharmacy"
├── module_type (text) — "acolhimento", "sae", etc.
├── form_type (text) — "standard" ou "answer_key"
├── title (text)
├── description (text nullable)
├── content_json (jsonb) — FormField[] completo
├── is_native (boolean default false) — diferencia nativos de próprios
├── created_at (timestamptz)
├── updated_at (timestamptz)
```

RLS: owner pode CRUD nos próprios; todos autenticados podem SELECT nativos (`is_native = true`).

---

## 2. Templates Nativos — Conteúdo por Área

Cada módulo terá 2 templates nativos (formulário + espelho). Conteúdo baseado em protocolos validados:

### Farmácia Clínica
| Módulo | Formulário | Campos-chave |
|--------|-----------|-------------|
| Anamnese | Ficha de Anamnese Farmacêutica | Identificação, queixa principal, HMA, medicamentos em uso, alergias, hábitos de vida, exame físico dirigido |
| SOAP | Nota SOAP | Subjetivo, Objetivo, Avaliação, Plano farmacoterapêutico |
| Reconciliação | Ficha de Reconciliação | Medicamentos prescritos vs. em uso, discrepâncias, intervenções propostas |
| Documentação | Quadro Resumo | Ficha de encaminhamento, quadro resumo de medicamentos |

### Enfermagem Clínica
| Módulo | Formulário | Campos-chave |
|--------|-----------|-------------|
| Acolhimento | Ficha de Acolhimento | Dados do paciente, queixa principal, sinais vitais (PA, FC, FR, T, SpO2), escala de dor, classificação Manchester |
| SAE | Histórico de Enfermagem | Anamnese, exame físico cefalocaudal, diagnósticos NANDA, resultados NOC, intervenções NIC |
| Evolução | Evolução de Enfermagem | Registro SOAP adaptado: subjetivo, objetivo, avaliação com diagnósticos, plano de cuidados |
| Passagem de Plantão | Ficha SBAR | Situação, Background, Avaliação, Recomendação |

### Nutrição Clínica
| Módulo | Formulário | Campos-chave |
|--------|-----------|-------------|
| Anamnese Nutricional | Ficha de Anamnese | Dados pessoais, história alimentar, recordatório 24h, frequência alimentar, sintomas GI |
| Avaliação Antropométrica | Ficha Antropométrica | Peso, altura, IMC, circunferências, dobras cutâneas, classificação nutricional |
| Plano Alimentar | Plano Alimentar | Cálculo VET, distribuição de macronutrientes, refeições, orientações específicas |
| Orientação Nutricional | Ficha de Orientação | Metas nutricionais, orientações por patologia, materiais educativos |

### Odontologia Clínica
| Módulo | Formulário | Campos-chave |
|--------|-----------|-------------|
| Anamnese Odontológica | Ficha de Anamnese | Queixa principal, história da doença, antecedentes, medicamentos, alergias, hábitos |
| Exame Clínico | Ficha de Exame | Exame extraoral, intraoral, odontograma, PSR, índice de placa |
| Plano de Tratamento | Plano de Tratamento | Diagnósticos, priorização, procedimentos por sessão, prognóstico |
| Orientação de Higiene | Ficha de Orientação | Técnica de escovação, fio dental, enxaguatório, orientações por condição |

### Medicina
| Módulo | Formulário | Campos-chave |
|--------|-----------|-------------|
| Anamnese Médica | Ficha de Anamnese | QP, HDA, ISDA, antecedentes pessoais/familiares, medicamentos, hábitos |
| Exame Físico | Ficha de Exame | Ectoscopia, sinais vitais, exame por aparelhos (cardiovascular, pulmonar, abdominal, neurológico) |
| Raciocínio Clínico | Ficha de Raciocínio | Hipóteses diagnósticas, diagnóstico diferencial, exames complementares, justificativa |
| Plano Terapêutico | Plano Terapêutico | Conduta farmacológica, não farmacológica, encaminhamentos, seguimento |

### Fisioterapia
| Módulo | Formulário | Campos-chave |
|--------|-----------|-------------|
| Avaliação Funcional | Ficha de Avaliação | Anamnese funcional, inspeção, palpação, testes especiais, ADM, força muscular, escalas funcionais |
| Diagnóstico Cinético-Funcional | Ficha de Diagnóstico | CIF: função/estrutura do corpo, atividade/participação, fatores ambientais/pessoais |
| Plano Fisioterapêutico | Plano de Tratamento | Objetivos SMART, recursos terapêuticos, frequência, progressão, critérios de alta |
| Evolução | Evolução Fisioterapêutica | Registro por sessão: estado do paciente, condutas realizadas, resposta ao tratamento |

### Biomedicina
| Módulo | Formulário | Campos-chave |
|--------|-----------|-------------|
| Análise Laboratorial | Ficha de Análise | Tipo de amostra, método analítico, reagentes, equipamentos, procedimento, controles |
| Controle de Qualidade | Ficha de CQ | Controle interno (Levey-Jennings), regras de Westgard, calibração, ações corretivas |
| Interpretação de Resultados | Ficha de Interpretação | Valores obtidos, valores de referência, correlação clínica, interferentes |
| Laudo Técnico | Modelo de Laudo | Dados do paciente, resultados, observações técnicas, responsável técnico |

Cada espelho terá os mesmos campos com `correct_answer`, `option_scores` e `max_score` preenchidos conforme protocolo.

---

## 3. Funcionalidade "Salvar como Template"

No editor de formulários (aba Formulários), ao lado de cada formulário existente, adicionar botão **"Salvar como Template"** (ícone de bookmark/star). Ao clicar:
- Salva o `content_json` do formulário na tabela `form_templates` com `is_native = false`
- O professor pode editar título e descrição do template

---

## 4. UI — Seletor de Templates

No editor de cada área, na aba Formulários, adicionar botão **"Usar Template"** que abre um Dialog com:
- **Seção "Templates Nativos"**: cards com templates pré-construídos do módulo atual
- **Seção "Meus Templates"**: templates próprios do professor para aquele módulo
- Preview do template (quantidade de campos, pontuação total)
- Botão "Aplicar" que cria o formulário na sala com o conteúdo do template

---

## 5. Arquivos a Criar/Editar

### Criar
- `src/lib/form-templates/` — pasta com templates nativos organizados por área (7 arquivos: `pharmacy.ts`, `nursing.ts`, `nutrition.ts`, `dentistry.ts`, `medicine.ts`, `physiotherapy.ts`, `biomedicine.ts`)
- `src/components/forms/FormTemplateDialog.tsx` — Dialog de seleção de templates
- Migração SQL para tabela `form_templates`

### Editar
- Todos os editores (7 arquivos: `SimulationEditor.tsx`, `SoapEditor.tsx`, `ReconciliationEditor.tsx`, `DocumentationEditor.tsx`, `NursingEditor.tsx`, `NutritionEditor.tsx`, `DentistryEditor.tsx`, `MedicineEditor.tsx`, `PhysiotherapyEditor.tsx`, `BiomedicineEditor.tsx`) — adicionar botões "Usar Template" e "Salvar como Template"

---

## 6. Etapas de Implementação

1. **Migração** — Criar tabela `form_templates` com RLS
2. **Templates nativos** — Definir `FormField[]` completos para cada módulo (28 formulários + 28 espelhos)
3. **FormTemplateDialog** — Componente genérico que recebe `area`, `moduleType`, `formType` e `formTable`
4. **Integrar nos editores** — Botões "Usar Template" e "Salvar como Template"
5. **Seed nativo** — Inserir templates nativos no banco via migração ou carregar em runtime dos arquivos TypeScript

