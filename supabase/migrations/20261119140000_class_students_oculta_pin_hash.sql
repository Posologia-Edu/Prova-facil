-- Fase 0 do endurecimento do acesso por PIN: o hash do PIN do check-in nunca deve ser legível pela API.
-- Só as funções do servidor (checkin-send-pins, checkin-submit) leem e gravam pin_hash, e elas usam a chave de serviço, que não é afetada.
-- Em vez de revogar a tabela inteira, revoga o SELECT e devolve coluna a coluna, sem pin_hash.
-- ATENÇÃO: coluna nova em class_students que a tela precise ler passa a exigir um GRANT SELECT (coluna) próprio.
REVOKE SELECT ON public.class_students FROM anon, authenticated;
GRANT SELECT (id, class_id, student_name, student_email, student_registration, semester_id, created_at, pin_last_sent_at)
  ON public.class_students TO anon, authenticated;

-- Conferência (deve devolver 0 linhas para anon e authenticated):
-- select grantee, column_name from information_schema.column_privileges
--  where table_name = 'class_students' and column_name = 'pin_hash' and grantee in ('anon','authenticated');
