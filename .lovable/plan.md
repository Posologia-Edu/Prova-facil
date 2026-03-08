

## Plano: Sistema de Consentimento e Coleta de Cookies

### Visão Geral

Implementar um banner de consentimento de cookies (LGPD/GDPR compliant), um sistema de gerenciamento de preferências por categoria, e uma infraestrutura para coletar e usar dados de analytics baseados no consentimento do usuário.

---

### Categorias de Cookies

| Categoria | Finalidade | Pode desativar? |
|-----------|-----------|-----------------|
| **Essenciais** | Sessão de auth, CSRF, idioma | Não |
| **Funcionalidade** | Tema, preferências de layout, onboarding | Sim |
| **Desempenho/Analytics** | Páginas visitadas, tempo de uso, cliques em funcionalidades | Sim |
| **Marketing** | Origem do visitante (UTM), conversão signup | Sim |

---

### O que será implementado

**1. Banner de Consentimento de Cookies**
- Componente `CookieBanner` exibido na primeira visita (bottom da tela)
- Mostra resumo das categorias com toggles para cada uma
- Botões: "Aceitar Todos", "Apenas Essenciais", "Personalizar"
- Salva preferência em `localStorage` (`cookie-consent`)
- Aparece em todas as páginas públicas (Index, Features, Pricing, etc.)

**2. Componente de Gerenciamento de Preferências**
- Modal acessível pelo banner ("Personalizar") e pela página de Política de Cookies
- Lista cada categoria com descrição e switch on/off
- Essenciais ficam sempre ativados e desabilitados para toggle

**3. Hook `useCookieConsent`**
- Retorna as preferências atuais do usuário
- Funções: `acceptAll()`, `rejectNonEssential()`, `updatePreferences()`
- Outras partes do sistema consultam esse hook antes de coletar dados

**4. Coleta de Analytics (tabela no banco)**
- Nova tabela `analytics_events` com colunas:
  - `id`, `event_type`, `page_url`, `referrer`, `utm_source`, `utm_medium`, `utm_campaign`, `session_id` (anon UUID), `user_id` (nullable), `metadata` (jsonb), `created_at`
- RLS: insert público (anon), select apenas admin
- Edge function ou insert direto via service role

**5. Rastreamento de Eventos (só se consentido)**
- Hook `useAnalytics` que verifica consentimento antes de enviar eventos
- Eventos rastreados:
  - `page_view` — navegação entre páginas
  - `signup_started` / `signup_completed` — funil de conversão
  - `feature_click` — cliques em funcionalidades-chave
  - `pricing_view` — visualização de planos
  - Captura UTM params da URL na primeira visita

**6. Atualizar a página de Política de Cookies**
- Adicionar botão "Gerenciar preferências de cookies" que abre o modal de gerenciamento

---

### Como usar os dados a seu favor

- **Funil de Conversão**: Saber quantos visitantes chegam → veem pricing → criam conta → usam o sistema
- **Features mais populares**: Identificar quais funcionalidades atraem mais cliques na landing page para priorizar marketing
- **Origem do tráfego (UTM)**: Medir qual canal (redes sociais, Google, indicação) traz mais conversões
- **Painel Admin**: Visualizar esses dados na página Admin com gráficos de visitas, conversões e features populares
- **Otimização**: Identificar onde os visitantes abandonam o site para melhorar essas páginas

---

### Arquivos a criar/editar

| Ação | Arquivo |
|------|---------|
| Criar | `src/components/CookieBanner.tsx` |
| Criar | `src/components/CookiePreferencesDialog.tsx` |
| Criar | `src/hooks/use-cookie-consent.ts` |
| Criar | `src/hooks/use-analytics.ts` |
| Criar | Migration para tabela `analytics_events` |
| Editar | `src/App.tsx` — adicionar CookieBanner global |
| Editar | `src/pages/CookiePolicy.tsx` — botão gerenciar preferências |
| Editar | `src/pages/Index.tsx` — tracking de page_view e UTM |

---

### Detalhes Técnicos

- Consentimento armazenado em `localStorage` como JSON (`{ essential: true, functionality: true, analytics: false, marketing: false }`)
- A tabela `analytics_events` terá insert habilitado para `anon` role (visitantes não logados) e select apenas para admins
- UTM params capturados do `window.location.search` e persistidos em `sessionStorage`
- Todos os eventos passam pelo check de consentimento antes de serem enviados ao banco

