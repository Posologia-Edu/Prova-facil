-- SOAP v2: marca a versão do formulário/telas da sala. Salas existentes continuam na versão 1.
ALTER TABLE public.soap_rooms ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;
