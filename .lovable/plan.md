

## Plano: Banco de Casos Clínicos para Anamnese e Reconciliação

### Resumo
Criar um banco centralizado de casos clínicos que o professor pode acessar ao editar salas de Anamnese e Reconciliação. O banco permite salvar, reutilizar e gerar casos via IA, com importação direta para as salas.

### Estrutura de Dados

**Nova tabela `clinical_case_bank`:**
- `id` (uuid, PK)
- `user_id` (uuid, ref auth.users) — proprietário
- `phase` (text: `anamnesis` | `reconciliation`) — fase alvo
- `title` (text) — título do caso
- `content` (text) — corpo do caso clínico
- `tags` (text[]) — tags para organização (ex: "cardiologia", "diabetes")
- `created_at`, `updated_at`
- RLS: cada professor vê apenas seus próprios casos

### Nova Edge Function `generate-clinical-case`
- Recebe: `phase` (anamnesis/reconciliation), `theme` (temática desejada pelo professor)
- Gera via IA um caso clínico completo no formato correto:
  - **Anamnese**: roteiro do paciente (script) com identificação, queixa principal, HDA, medicamentos, história social
  - **Reconciliação**: caso clínico com dados do paciente, medicamentos em uso, exames, situação clínica
- Retorna título + conteúdo para o professor revisar antes de salvar

### Novo Componente `ClinicalCaseBankDialog`
- Dialog acessível nos editores de Anamnese (`SimulationEditor`) e Reconciliação (`ReconciliationEditor`)
- Duas abas: **"Meus Casos"** e **"Criar Novo"**
- **Meus Casos**: lista filtrada por fase, com busca por título/tags. Botões para importar (adicionar à sala) ou excluir
- **Criar Novo**: modo manual (título + conteúdo) ou modo IA (campo de temática + botão "Gerar com IA")
- Ao importar: caso é inserido diretamente na estrutura da sala (array `clinicalCases` na Anamnese ou tabela `reconciliation_clinical_cases` na Reconciliação)

### Integração nos Editores

1. **SimulationEditor.tsx** (Anamnese): Adicionar botão "Banco de Casos" ao lado do botão "Adicionar Caso" na aba `patient_script`. Ao importar do banco, o caso é adicionado ao array `clinicalCases` com `{ id, title, script: content }`.

2. **ReconciliationEditor.tsx**: Adicionar botão "Banco de Casos" ao lado do botão de adicionar caso. Ao importar, insere na tabela `reconciliation_clinical_cases` com `{ room_id, title, content, position }`.

3. **Salvar no Banco**: Em ambos os editores, cada caso existente ganha um ícone "Salvar no Banco" para exportar o caso da sala para o banco pessoal do professor.

### Detalhes Técnicos

- **Migração SQL**: Criar tabela `clinical_case_bank` com RLS (owner-based)
- **Edge Function**: `generate-clinical-case` usando `callAiWithFallback` com prompts específicos por fase
- **Componente**: `ClinicalCaseBankDialog.tsx` — reutilizável, recebe `phase` e callback `onImport`
- **Config**: Adicionar função ao `config.toml` com `verify_jwt = false`

### Fluxo do Professor
1. Abre o editor da sala (Anamnese ou Reconciliação)
2. Clica em "Banco de Casos"
3. Pode: importar caso existente, criar manualmente, ou informar uma temática e a IA gera o caso
4. Revisa e confirma → caso é adicionado à sala
5. Opcionalmente, pode salvar qualquer caso da sala no banco para reutilização futura

