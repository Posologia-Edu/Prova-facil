

## Plano: Compartilhar salas entre professores + Editar título inline

### Resumo
Dois recursos para todas as salas de simulação realística (Farmácia: Anamnese/SOAP/Reconciliação/Documentação + Enfermagem, Nutrição, Odontologia, Medicina, Fisioterapia, Biomedicina):

1. **Enviar cópia de sala para outro professor** via e-mail -- cria um deep clone (formulários, participantes, casos clínicos) na conta do professor destinatário, em status "draft"
2. **Editar título da sala inline** -- clique no título do card para editar diretamente

---

### Arquitetura

```text
Professor A clica "Enviar para Professor"
         │
         ▼
  ShareRoomDialog (email input)
         │
         ▼
  Edge Function: share-room
    1. Valida JWT do remetente
    2. Busca destinatário por e-mail (paginação Auth Admin)
    3. Verifica role teacher/admin
    4. Clona sala + formulários + participantes + casos clínicos
       com user_id = destinatário, status = "draft"
    5. Retorna sucesso
```

---

### Etapas de implementação

#### 1. Edge Function `share-room`
- Recebe: `{ roomId, email, moduleType }` onde moduleType identifica a tabela (`simulation`, `soap`, `reconciliation`, `documentation`, `nursing`, `medicine`, `dentistry`, `nutrition`, `physiotherapy`, `biomedicine`)
- Reutiliza o padrão já validado do `share-template` (auth via JWT claims, busca paginada de usuários, validação de role)
- Para cada moduleType, clona:
  - Tabela principal: `{prefix}_rooms` (com `user_id` do destinatário, título original, status `draft`)
  - `{prefix}_forms` (formulários)
  - `{prefix}_participants` (alunos)
  - `{prefix}_clinical_cases` (quando existir)
- Remove vínculos de sala anterior (ex: `anamnesis_room_id`, `soap_room_id`) pois o destinatário não terá essas salas

#### 2. Componente `ShareRoomDialog`
- Similar ao `ShareTemplateDialog`, mas para salas
- Props: `roomId`, `moduleType`, `roomTitle`
- Input de e-mail, botão enviar, feedback de sucesso/erro
- Chama a edge function via `fetch` com headers explícitos (padrão já validado)

#### 3. Edição inline de título
- Em cada card de sala, o título passa a ser clicável
- Ao clicar, exibe um `Input` inline com botões de confirmar/cancelar
- Faz `update` direto na tabela `{prefix}_rooms` via Supabase client

#### 4. Integração nos 11 arquivos de listagem de salas
Adicionar botão "Enviar" (ícone `Share2`) e título editável nos cards de:
- `Simulations.tsx` (4 seções: anamnese, soap, reconciliação, documentação)
- `SoapRooms.tsx`
- `ReconciliationRooms.tsx`
- `DocumentationRooms.tsx`
- `NursingSimulations.tsx`
- `MedicineSimulations.tsx`
- `DentistrySimulations.tsx`
- `NutritionSimulations.tsx`
- `PhysiotherapySimulations.tsx`
- `BiomedicineSimulations.tsx`

---

### Detalhes Técnicos

**Mapeamento de moduleType para tabelas:**
| moduleType | rooms | forms | participants | clinical_cases |
|---|---|---|---|---|
| simulation | simulation_rooms | simulation_forms | simulation_participants | -- |
| soap | soap_rooms | soap_forms | soap_participants | -- |
| reconciliation | reconciliation_rooms | reconciliation_forms | reconciliation_participants | reconciliation_clinical_cases |
| documentation | documentation_rooms | documentation_forms | documentation_participants | documentation_clinical_cases |
| nursing | nursing_rooms | nursing_forms | nursing_participants | nursing_clinical_cases |
| medicine | medicine_rooms | medicine_forms | medicine_participants | medicine_clinical_cases |
| dentistry | dentistry_rooms | dentistry_forms | dentistry_participants | dentistry_clinical_cases |
| nutrition | nutrition_rooms | nutrition_forms | nutrition_participants | nutrition_clinical_cases |
| physiotherapy | physiotherapy_rooms | physiotherapy_forms | physiotherapy_participants | physiotherapy_clinical_cases |
| biomedicine | biomedicine_rooms | biomedicine_forms | biomedicine_participants | biomedicine_clinical_cases |

**RLS**: A edge function usa `service_role`, então não precisa de alterações de RLS. A sala clonada pertence ao destinatário (`user_id`), logo as policies existentes de "owner can CRUD" já cobrem.

**Campos extras por módulo**: Campos como `module_type` (nursing, medicine, etc.), `duration_minutes` (simulation) são copiados da sala original. Vínculos cruzados (`anamnesis_room_id`, `soap_room_id`, `reconciliation_room_id`) são definidos como `null` na cópia.

