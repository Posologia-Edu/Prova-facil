

# Plano: Pacientes Virtuais (Dor & Inflamação)

## Visão Geral

Nova seção "Pacientes Virtuais" acessível pela sidebar e pela home. Dois módulos (Dor e Inflamação), cada um com 5 pacientes pré-configurados. Cada paciente é um chatbot IA com system prompt detalhado que simula 3 encontros clínicos. O estudante interage livremente, e ao final do 3º encontro preenche o MAI (Medication Appropriateness Index).

---

## 1. Banco de Dados — 3 novas tabelas

**`virtual_patient_sessions`**
- `id` uuid PK, `user_id` uuid (nullable, para alunos autenticados ou null para anônimos), `patient_id` text (ex: "pain_helena"), `module` text ("pain" | "inflammation"), `current_encounter` int default 1 (1-3), `status` text ("in_progress" | "completed"), `mai_answers_json` jsonb nullable, `created_at`, `updated_at`

**`virtual_patient_messages`**
- `id` uuid PK, `session_id` uuid ref virtual_patient_sessions, `encounter` int (1-3), `role` text ("user" | "assistant"), `content` text, `created_at`

**`virtual_patient_mai_scores`** (opcional, para tracking do admin)
- `id` uuid PK, `session_id` uuid ref, `mai_json` jsonb, `total_score` numeric, `created_at`

RLS: autenticados podem CRUD próprias sessões/mensagens. Anon pode insert/select (para uso sem login, como nas simulações).

---

## 2. Edge Function

**`virtual-patient-chat/index.ts`**
- Recebe `{ patientId, messages, encounter }` 
- Busca o system prompt do paciente de um mapa hardcoded (os 10 prompts fornecidos)
- Usa `callAiWithFallback` (mesmo padrão existente)
- O system prompt inclui toda a personalidade, regras, dados clínicos e respostas condicionais
- Retorna resposta não-streaming (como osce-virtual-patient)

---

## 3. Páginas Frontend

### `VirtualPatients.tsx` — Hub principal
- Duas seções: "Dor" e "Inflamação" (cards ou tabs)
- Cada módulo mostra 5 cards de paciente com: nome, idade, profissão, breve descrição
- Botão "Iniciar Atendimento" → inicia sessão e vai para chat
- Se sessão existente em andamento → "Continuar Atendimento"

### `VirtualPatientChat.tsx` — Chat com paciente
- Interface de chat (reutiliza padrão do OsceVirtualPatient)
- Header com info do paciente (nome, idade, módulo)
- Indicador de encontro atual (1, 2 ou 3)
- Botão "Avançar para Encontro X" quando estudante decide
- No Encontro 3, após conversa, botão "Preencher MAI"
- Dialog/modal com formulário MAI (10 critérios do Medication Appropriateness Index)
- Histórico de mensagens persistido por sessão/encontro

### `VirtualPatientMAI.tsx` — Formulário MAI (componente)
- 10 critérios do MAI com escala (Apropriado / Marginalmente Apropriado / Inapropriado)
- Campos: Indicação, Efetividade, Dosagem, Direção correta, Direção prática, Interações medicamento-medicamento, Interações medicamento-doença, Duplicidade, Duração, Custo
- Submissão salva em `virtual_patient_mai_scores`

---

## 4. Dados dos Pacientes (hardcoded no edge function)

Os 10 system prompts serão armazenados como constantes no edge function. Cada prompt contém:
- Identidade completa do paciente
- Regras gerais de comportamento
- Regras para exames
- Dados dos 3 momentos com respostas condicionais
- Respostas abertas para fármacos/exames não previstos

### Enriquecimentos sugeridos para melhor performance:

1. **Dados demográficos adicionais**: peso, altura (para cálculo de IMC quando relevante)
2. **Alergias**: cada paciente deveria ter pelo menos uma alergia declarada ou "nega alergias" — informação crucial para farmacoterapia
3. **Histórico familiar**: breve (ex: "mãe diabética", "pai com IAM aos 60") — ajuda na avaliação de risco
4. **Adesão medicamentosa**: cada paciente deveria ter um perfil de adesão (ex: Helena esquece doses à noite, Rogério não segue dieta)
5. **Expectativas do paciente**: frases que o paciente diz sobre o que espera do tratamento ("quero voltar a dormir", "preciso trabalhar sem dor")
6. **Sinais vitais base**: PA, FC, temperatura — disponíveis se o estudante perguntar
7. **Exame físico dirigido**: achados ao exame quando o estudante perguntar (ex: "dor à palpação em região X", "edema articular")
8. **Contexto social**: tabagismo, etilismo, atividade física, dieta — relevantes para orientação não farmacológica
9. **Função renal estimada (ClCr/TFG)**: para pacientes com IR, útil para ajuste de dose
10. **Lista completa de medicamentos com posologia**: horários, via de administração

Estes dados serão integrados aos prompts antes da implementação.

---

## 5. Rotas

```text
/virtual-patients                    → VirtualPatients (hub)
/virtual-patients/chat/:patientId    → VirtualPatientChat
```

---

## 6. Integrações

- Adicionar "Pacientes Virtuais" na sidebar (`AppSidebar.tsx`) com ícone `UserRound` ou `HeartPulse`
- Atualizar `App.tsx` com as novas rotas (protegidas por auth)
- Atualizar `supabase/config.toml` com `[functions.virtual-patient-chat]`
- O MAI será um componente reutilizável que poderá ser integrado futuramente a outros módulos

---

## 7. Detalhes Técnicos

- O controle de encontro (1→2→3) é feito pelo frontend: o estudante decide quando avançar
- Ao avançar de encontro, uma mensagem de sistema é inserida no contexto ("O paciente retorna para o segundo encontro...")
- Todo o histórico de mensagens dos encontros anteriores é enviado ao AI para manter coerência
- O MAI é preenchido pelo estudante como autoavaliação do tratamento prescrito

