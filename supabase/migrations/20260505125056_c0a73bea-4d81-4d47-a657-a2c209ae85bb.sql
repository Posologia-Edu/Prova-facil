UPDATE virtual_patient_grades AS dest
SET subscores = src.subscores,
    bonus_penalidades = src.bonus_penalidades,
    nota_final = src.nota_final,
    nota_microlearning = src.nota_microlearning,
    feedback_resumido = src.feedback_resumido,
    orientacoes_melhoria = src.orientacoes_melhoria,
    flags_seguranca = src.flags_seguranca
FROM virtual_patient_grades AS src
WHERE src.session_id = '917c09e9-a3cc-4957-b085-795621be844b'
  AND dest.session_id IN ('81c7ef4e-b4e9-4303-8f59-156f2742e81b','54a3a1f2-2bd4-49e7-95af-40e193707922');