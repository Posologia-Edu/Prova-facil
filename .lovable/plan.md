
# Check-in de presença por QR Code

Automatiza a marcação de presença por aula usando um QR code exibido pelo professor. O aluno escaneia, informa e-mail + PIN pessoal, e o sistema registra automaticamente **presente**, **atrasado** ou **ausente** de acordo com o horário do check-in.

## Regras (definidas pelo usuário)

- **Identificação do aluno**: e-mail cadastrado na turma + PIN pessoal de 6 dígitos.
- **QR code**: token curto rotativo (novo a cada ~20s) + validação **opcional** de geolocalização configurada pelo professor.
- **Janela padrão fixa**: até 15 min após início da aula = **presente**; entre 15 e 30 min = **atrasado**; depois = **ausente** (sem registro).
- **Abertura**: automática no horário do cronograma **e** botão manual "Abrir/Fechar check-in" pelo professor. Reabertura permitida.

## Fluxo do professor

1. Na aba **Presença** da turma, ao lado do seletor de aula: botão **"Abrir check-in por QR"**.
2. Modal em tela cheia mostra:
   - QR code grande (rotaciona a cada 20s com contador visual).
   - PIN de sala curto abaixo (fallback caso o aluno não consiga escanear).
   - Lista lateral em tempo real: alunos que já fizeram check-in, com hora e status (Presente/Atrasado).
   - Toggle "Exigir geolocalização" + botão "Definir local atual" (grava lat/lng + raio de 150m).
3. Ao fechar, alunos sem registro permanecem "Não marcado" (o professor pode marcá-los manualmente como falta — comportamento atual preservado).
4. Na aba Alunos, botão **"Gerar/reenviar PINs pessoais"** que cria PINs de 6 dígitos e envia por e-mail via Resend (opcional, um por aluno).

## Fluxo do aluno

1. Aluno abre a câmera do celular e escaneia o QR → link público `/checkin/:token`.
2. Página pede **e-mail** + **PIN pessoal** (armazenado no cadastro do aluno na turma).
3. Se a aula exigir geolocalização, o navegador pede permissão e envia coordenadas.
4. Backend valida → mostra confirmação com nome, aula, status (Presente/Atrasado) e horário.

## Segurança

- Token do QR = JWT curto (~30s) assinado com `CHECKIN_JWT_SECRET` (gerado automaticamente), contendo `lesson_id`, `nonce`, `exp`. Impossível reusar após expirar.
- Rate limit por IP e por e-mail na edge function.
- Validação do PIN com bcrypt (armazenado como hash, nunca em texto puro).
- Geolocalização opcional: se ativada e o aluno estiver fora do raio, check-in bloqueia com mensagem clara.
- Uma sessão de check-in por aluno por aula (idempotente — reescaneios não duplicam).

## Alterações técnicas

### Banco de dados (migration)

- `class_students`: adicionar `pin_hash text`, `pin_last_sent_at timestamptz`.
- `class_schedule_items`: adicionar `checkin_open boolean default false`, `checkin_opened_at timestamptz`, `checkin_geo_lat double precision`, `checkin_geo_lng double precision`, `checkin_geo_radius_m int`.
- `class_attendance`: adicionar `checkin_method text` (`qr` | `manual`), `checkin_at timestamptz`, `checkin_lat double precision`, `checkin_lng double precision`.
- GRANTs padrão + RLS mantendo o modelo atual (professor dono da turma).

### Edge functions (novas)

- `checkin-qr-token` (GET, auth): retorna JWT rotativo para a aula ativa.
- `checkin-submit` (POST, público): valida token, e-mail, PIN, geo → calcula status pela janela padrão → grava em `class_attendance`.
- `checkin-send-pins` (POST, auth): gera PINs, salva hash e envia e-mail via Resend já configurado.

### Frontend

- `src/components/classes/AttendanceTab.tsx`: botão "Abrir check-in por QR" + modal de sessão ao vivo com Realtime na `class_attendance` filtrada por `lesson_id`.
- `src/components/classes/QrCheckinDialog.tsx` (novo): QR rotativo, contador, lista ao vivo, controles de geo.
- `src/components/classes/StudentsTab.tsx`: botão "Gerar/reenviar PINs".
- `src/pages/StudentCheckin.tsx` (novo, rota pública `/checkin/:token`): formulário e-mail + PIN + captura de geo.
- Bibliotecas: `qrcode.react` para renderizar o QR.

## Fora de escopo (não será feito agora)

- Login persistente do aluno / app dedicado.
- Reconhecimento facial ou biometria.
- Sincronização com sistemas externos de biometria da instituição.

## Segredos necessários

- `CHECKIN_JWT_SECRET`: gerado automaticamente (secret aleatório, nunca exposto).
- `RESEND_API_KEY`: já existe no projeto.
