# Plano de evolução: Pacientes Virtuais para toda a saúde

Plano analisado em 2026-10-20 para a atividade Pacientes Virtuais (hoje 10 pacientes de Farmácia, Dor e Inflamação, 3 encontros + MAI). Objetivo: servir estudantes de várias profissões da saúde. Nada foi implementado ainda; o usuário vai continuar em outro computador.

Artefato com as decisões do usuário: https://claude.ai/artifact/9bQ2GvYEcB1xonv6MosRvt (coleção `decisions`, docs P1..P18 e Q1..Q5).

**Achados (arquivo)**
- A1 presa à Farmácia: grade-virtual-patient:96, VirtualPatientMAI.tsx, generate-virtual-patient:11, virtual-patient-chat:498 ("doutor")
- A2 pacientes gerados não entram em turmas: Classes.tsx:102 (VP_CATALOG), VirtualPatientRoom.tsx:23 (PATIENT_NAMES) e :223 (módulo por prefixo), falta prefixo "custom:"
- A3 paciente copiado em 5 lugares (chat, vp-clinical-cases, vitais BASELINES, Classes, Room/VirtualPatients)
- A4 nota_final vem da IA sem conferência (grade-virtual-patient:276)
- A5 resumo entre encontros cortado em 4000 chars e encontro inferido por regex (virtual-patient-chat:468-480)
- A6 vitais divergem do caso em Antônio (gota), Renata (tendinite), José (polimialgia) (measure-virtual-patient-vitals:68-88)
- A7 bônus de eficiência penaliza >25 mensagens (grade-virtual-patient:259-269)
- A8 correção sem gabarito do caso; exames inventados sem registro
- A9 JSON inválido da IA = erro 500 sem retry; mensagens de grupo sem autor; dedupe por texto (VirtualPatientRoom:102-106)
- A10 "rag_accuracy" não corresponde a RAG real (vp-ai-idcg:44-46)

**Propostas (esforço P/M/G)**
- Fase 0: P1 nota no servidor; P2 memória entre encontros; P3 vitais alinhados; P4 rever bônus; P5 correção resistente (tool calling, retry, temperatura baixa); P6 autor da mensagem no grupo
- Fase 1: P7 cadastro único de casos no banco (G); P8 esquema com gabarito e exames fixos; P9 editor docente com checagem e versionamento
- Fase 2: P10 perfil profissional configurável; P11 entregável final por profissão (MAI só Farmácia, demais via src/lib/form-templates); P12 rubrica em duas camadas; P13 casos-semente por profissão
- Fase 3: P14 modos formativo/somativo; P15 debrief com caminho esperado; P16 revisão e calibração docente
- Fase 4: P17 caso interprofissional (SBAR); P18 rigor da métrica de pesquisa

**Perguntas abertas (sugestão minha)**: Q1 quais profissões primeiro (duas, ex. Enfermagem e Medicina); Q2 MAI obrigatório só em Farmácia; Q3 remover bônus por tamanho e medir cobertura; Q4 interprofissional depois; Q5 renomear rag_accuracy e tratar RAG como projeto separado.

**Why:** o usuário aplica a atividade com estudantes de Farmácia e quer estender a outras profissões; decide cada item no artefato.
**How to apply:** ao retomar, ler as decisões do artefato (ArtifactData list `decisions`) antes de implementar; começar pela Fase 0 salvo decisão contrária. Não implementar itens rejeitados ou adiados.
