-- Documentação v2, fase 2 (E5): documentos extras por sala. A lista dos ativos fica na sala (ex.: {ram}); nenhuma tabela nova:
-- as respostas vão no mesmo registro da dupla (respostas.extras), a ocorrência vai em caso_json.ocorrencias (o aluno lê)
-- e o gabarito de cada extra vai em documentation_v2_privado.gabarito.extras (só o servidor lê).
ALTER TABLE public.documentation_rooms ADD COLUMN IF NOT EXISTS documentos_extra text[] NOT NULL DEFAULT '{}';
