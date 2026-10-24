-- Pacientes Virtuais · P13: biblioteca de casos-semente.
-- O admin publica na biblioteca um caso que ele já revisou no editor (cópia congelada em `caso`);
-- qualquer docente autenticado vê os casos publicados e copia um para a própria conta como rascunho.

CREATE TABLE IF NOT EXISTS public.vp_seed_cases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  tema text NOT NULL DEFAULT '',
  dificuldade text NOT NULL DEFAULT 'medio' CHECK (dificuldade IN ('facil', 'medio', 'dificil')),
  resumo text NOT NULL DEFAULT '',
  profissoes text[] NOT NULL DEFAULT '{}',
  publicado boolean NOT NULL DEFAULT true,
  caso jsonb NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vp_seed_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated view published seed cases" ON public.vp_seed_cases;
CREATE POLICY "Authenticated view published seed cases"
  ON public.vp_seed_cases FOR SELECT
  TO authenticated
  USING (publicado OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage seed cases" ON public.vp_seed_cases;
CREATE POLICY "Admins manage seed cases"
  ON public.vp_seed_cases FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin: congela um caso próprio na biblioteca (ou atualiza a entrada, se já existir um com o mesmo título).
CREATE OR REPLACE FUNCTION public.publish_vp_seed_case(
  _case_id uuid, _titulo text, _tema text, _dificuldade text, _resumo text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.custom_virtual_patients%ROWTYPE;
  seed_id uuid;
  profs text[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores publicam na biblioteca';
  END IF;
  SELECT * INTO c FROM public.custom_virtual_patients WHERE id = _case_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caso não encontrado';
  END IF;
  IF c.case_data IS NULL OR c.schema_version < 2 THEN
    RAISE EXCEPTION 'Só casos no esquema v2 entram na biblioteca';
  END IF;
  SELECT coalesce(array_agg(k), '{}') INTO profs FROM jsonb_object_keys(c.case_data -> 'versoes') AS k;

  SELECT id INTO seed_id FROM public.vp_seed_cases WHERE titulo = _titulo LIMIT 1;
  IF seed_id IS NULL THEN
    INSERT INTO public.vp_seed_cases (titulo, tema, dificuldade, resumo, profissoes, caso, created_by)
    VALUES (_titulo, _tema, _dificuldade, _resumo, profs, to_jsonb(c), auth.uid())
    RETURNING id INTO seed_id;
  ELSE
    UPDATE public.vp_seed_cases
       SET tema = _tema, dificuldade = _dificuldade, resumo = _resumo, profissoes = profs,
           caso = to_jsonb(c), updated_at = now()
     WHERE id = seed_id;
  END IF;
  -- A revisão automática da IA não vai junto: o docente que copiar roda a dele.
  UPDATE public.vp_seed_cases SET caso = jsonb_set(caso, '{case_data}', (caso -> 'case_data') - 'revisao') WHERE id = seed_id;
  RETURN seed_id;
END;
$$;

-- Docente: copia um caso da biblioteca para a própria conta, sempre como rascunho.
CREATE OR REPLACE FUNCTION public.copy_vp_seed_case(_seed_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.vp_seed_cases%ROWTYPE;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  SELECT * INTO s FROM public.vp_seed_cases
   WHERE id = _seed_id AND (publicado OR public.has_role(auth.uid(), 'admin'));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caso não encontrado';
  END IF;
  INSERT INTO public.custom_virtual_patients (
    user_id, category, name, age, profession, description, clinical_context, system_prompt,
    baseline_vitals, baseline_context, clinical_case, case_data, schema_version, status
  ) VALUES (
    auth.uid(),
    s.caso ->> 'category',
    s.caso ->> 'name',
    (s.caso ->> 'age')::int,
    s.caso ->> 'profession',
    coalesce(s.caso ->> 'description', ''),
    coalesce(s.caso ->> 'clinical_context', ''),
    coalesce(s.caso ->> 'system_prompt', ''),
    coalesce(s.caso -> 'baseline_vitals', '{}'::jsonb),
    coalesce(s.caso ->> 'baseline_context', ''),
    coalesce(s.caso -> 'clinical_case', '{}'::jsonb),
    s.caso -> 'case_data',
    2,
    'draft'
  ) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_vp_seed_case(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.copy_vp_seed_case(uuid) TO authenticated;
