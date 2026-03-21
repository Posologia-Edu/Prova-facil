

# Plano: Pacientes Virtuais em Salas com Turmas, Correção e Analytics

## Visão Geral

Transformar os Pacientes Virtuais de acesso direto para um modelo vinculado a turmas com PINs únicos, controle de acesso por e-mail, analytics detalhado para o professor e correção automatizada via tutor IA com feedback formativo.

---

## 1. Banco de Dados — Novas tabelas e alterações

### Nova tabela: `class_virtual_patients`
Vincula um paciente virtual a uma turma, gerando um PIN único.
```
id uuid PK
class_id uuid ref classes(id) ON DELETE CASCADE
patient_id text NOT NULL (ex: "pain_helena")
access_code text NOT NULL default substring(md5(random()::text),1,6)  -- PIN
status text default 'draft' (draft | active | closed)
created_at timestamptz
```
RLS: owner da classe pode CRUD; anon/authenticated pode SELECT.

### Alterar `virtual_patient_sessions`
- Adicionar `class_virtual_patient_id uuid` ref `class_virtual_patients(id)` — vincula a sessão a uma turma+paciente específica
- Adicionar `student_email text` — identifica o aluno sem autenticação
- Adicionar `student_name text`

### Nova tabela: `virtual_patient_grades`
Armazena a correção do tutor IA por sessão.
```
id uuid PK
session_id uuid ref virtual_patient_sessions(id)
class_virtual_patient_id uuid ref class_virtual_patients(id)
subscores jsonb NOT NULL
bonus_penalidades jsonb
nota_final numeric
nota_microlearning numeric
feedback_resumido text
orientacoes_melhoria text
flags_seguranca jsonb
created_at timestamptz
```
RLS: owner da classe pode SELECT/INSERT; anon pode SELECT próprias.

---

## 2. Fluxo de Acesso do Aluno

### StudentAuth.tsx
Adicionar checagem de PIN contra `class_virtual_patients`:
1. Buscar `class_virtual_patients` pelo `access_code`
2. Se encontrado e `status = 'active'`:
   - Verificar se o e-mail do aluno está em `class_students` da turma vinculada
   - Se sim: salvar em sessionStorage e redirecionar para `/virtual-patients/room/:cvpId`
   - Se não: erro "E-mail não cadastrado nesta turma"

### Nova rota: `/virtual-patients/room/:cvpId`
Página de chat do paciente virtual dentro do contexto da turma. Carrega/cria sessão usando `class_virtual_patient_id` + `student_email`, garantindo que:
- Histórico é por (aluno + turma+paciente) — se acessar por outra turma, sessão diferente
- Sessão é reutilizada se já existir para aquele par

---

## 3. Frontend — Turmas

### Classes.tsx — Detalhes da turma
Na view de detalhe da turma, adicionar seção **"Pacientes Virtuais Vinculados"** ao lado de "Provas Vinculadas":
- Listar pacientes vinculados com nome, módulo, PIN e status
- Botão "Vincular Paciente Virtual" → abre dialog com seleção dos 10 pacientes disponíveis
- Cada paciente vinculado ganha PIN automático e badge de status
- Ações: ativar/desativar, copiar PIN, remover vínculo

### Dialog de vínculo
- Lista os 10 pacientes (cards com nome, módulo, descrição)
- Ao selecionar e confirmar: insere em `class_virtual_patients`

---

## 4. Edge Function — Tutor de Correção

### Nova edge function: `grade-virtual-patient/index.ts`
- Recebe `{ session_id, class_virtual_patient_id }`
- Busca todo o histórico de mensagens da sessão (`virtual_patient_messages`)
- Busca o MAI preenchido (`virtual_patient_mai_scores`)
- Monta o prompt com a rubrica fornecida (anamnese, plano inicial, exames, reavaliação, MAI + bônus/penalidades)
- Envia para o AI com schema JSON estruturado
- Salva resultado em `virtual_patient_grades`
- Retorna o feedback

### Trigger de correção
A correção pode ser disparada:
- Pelo professor no painel de analytics (botão "Corrigir turma")
- Automaticamente quando o aluno completa o 3º encontro + MAI

---

## 5. Analytics — Painel do Professor

### Expandir Analytics.tsx ou criar aba dedicada
Na página de Analytics, adicionar filtro/aba para "Pacientes Virtuais":

**Métricas por turma+paciente:**
- Total de alunos que iniciaram / completaram
- Distribuição de notas (histograma)
- Nota média por critério da rubrica (radar chart)
- Flags de segurança mais comuns
- Tempo médio por encontro
- Medicamentos mais prescritos (extraídos do transcript)

**Visão individual por aluno:**
- Nota final + microlearning
- Subscores detalhados
- Feedback do tutor
- Status do MAI
- Link para ler o transcript completo

### Feedback formativo para a turma
Após corrigir todos os alunos de uma turma, o tutor gera um feedback agregado:
- Pontos fortes da turma
- Lacunas comuns (ex: "60% dos alunos não solicitaram função renal")
- Recomendações pedagógicas

---

## 6. Rotas e Navegação

```
/virtual-patients/room/:cvpId    → Chat do paciente via turma (acesso por PIN)
```

- Manter `/virtual-patients` como hub informativo (sem acesso direto ao chat)
- Adicionar link nas turmas para o painel de resultados

---

## 7. Ordem de Implementação

Devido à complexidade, sugiro implementar em 3 fases:

**Fase 1** — Infraestrutura de acesso:
- Criar tabelas `class_virtual_patients` e `virtual_patient_grades`
- Alterar `virtual_patient_sessions` (novos campos)
- Atualizar `Classes.tsx` para vincular pacientes
- Atualizar `StudentAuth.tsx` para reconhecer PIN de paciente virtual
- Criar página de chat contextualizada por turma

**Fase 2** — Correção e feedback:
- Criar edge function `grade-virtual-patient`
- Integrar correção automática ao fluxo de conclusão
- Gerar feedback formativo por turma

**Fase 3** — Analytics:
- Painel de resultados por turma+paciente
- Gráficos e métricas detalhadas
- Visão individual por aluno

---

## Detalhes Técnicos

- PINs são gerados automaticamente (6 chars hex) ao vincular paciente à turma
- Sessões são identificadas por `(class_virtual_patient_id, student_email)` — garante isolamento por turma
- O transcript completo é enviado ao AI para correção — pode ser longo, usar modelo com contexto grande (gemini-2.5-pro)
- O feedback formativo da turma agrega os JSONs de correção de todos os alunos via prompt separado

