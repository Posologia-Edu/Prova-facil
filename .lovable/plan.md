

## Plano: Acessibilidade nas Provas Online

### Resumo
Adicionar um painel de acessibilidade flutuante no `StudentExam.tsx` que permite ao aluno personalizar sua experiência de prova, garantindo inclusão para pessoas com deficiência visual, motora, cognitiva e dislexia.

---

### Funcionalidades

#### 1. Painel de Acessibilidade (botão flutuante com ícone ♿)
Barra lateral ou popover com controles:

| Recurso | Descrição |
|---|---|
| **Aumentar/diminuir fonte** | Slider de 14px a 28px aplicado ao conteúdo da prova |
| **Alto contraste** | Modo escuro forçado com bordas mais visíveis e contraste WCAG AAA |
| **Fonte para dislexia** | Troca para OpenDyslexic (Google Fonts) |
| **Espaçamento ampliado** | Aumenta `line-height` e `letter-spacing` para facilitar leitura |
| **Leitor de tela (TTS)** | Botão "Ler questão" que usa `SpeechSynthesis API` nativa do navegador |
| **Máscara de leitura** | Régua horizontal semi-transparente que segue o mouse, isolando a linha de leitura |
| **Navegação por teclado** | Atalhos: setas ←→ para navegar questões, 1-5 para alternativas, Enter para confirmar |
| **Tempo extra** | Indicador visual quando o professor configurou tempo extra (campo futuro) |

#### 2. Persistência de preferências
- Salvar preferências no `sessionStorage` para manter durante a prova
- Opcional: salvar no `localStorage` para provas futuras do mesmo navegador

---

### Arquitetura

```text
StudentExam.tsx
  └── AccessibilityPanel.tsx (novo componente)
        ├── FontSizeControl (slider)
        ├── HighContrastToggle
        ├── DyslexiaFontToggle
        ├── SpacingToggle
        ├── TextToSpeechButton
        ├── ReadingMaskToggle
        └── KeyboardShortcutsInfo
```

### Etapas de implementação

#### 1. Componente `AccessibilityPanel`
- Botão flutuante fixo (canto inferior esquerdo) com ícone de acessibilidade
- Abre popover/sheet com todos os controles
- Estado gerenciado via `useState` + `sessionStorage`
- Emite classes CSS ou variáveis CSS para o container pai

#### 2. Integrar no `StudentExam.tsx`
- Envolver o conteúdo da prova em um `div` que recebe as classes de acessibilidade
- Aplicar estilos condicionais: `font-size`, `font-family`, `line-height`, `letter-spacing`, filtros de contraste
- Adicionar `aria-label`, `role`, e `tabIndex` nos elementos interativos existentes
- Implementar `onKeyDown` para atalhos de teclado

#### 3. CSS para acessibilidade
- Classe `.a11y-high-contrast`: bordas mais fortes, fundo escuro, texto branco
- Classe `.a11y-dyslexia`: `font-family: 'OpenDyslexic'`
- Classe `.a11y-spacing`: `line-height: 2; letter-spacing: 0.05em; word-spacing: 0.1em`
- Classe `.a11y-reading-mask`: overlay com janela transparente que segue cursor

#### 4. Melhorias semânticas no HTML existente
- Adicionar `aria-live="polite"` no timer
- Adicionar `aria-current="step"` na questão atual
- Melhorar labels dos botões de navegação do grid lateral
- Garantir foco visível (`focus-visible`) em todos os elementos interativos

---

### Detalhes Técnicos

**Leitura por voz (TTS)**: Usa `window.speechSynthesis` nativo, sem dependências externas. Botão "Ler questão" lê o enunciado + alternativas. Funciona em Chrome, Edge, Firefox e Safari.

**Máscara de leitura**: `div` com `position: fixed`, `pointer-events: none`, backdrop escurecido exceto uma faixa horizontal de ~60px que acompanha `mousemove`.

**Fonte OpenDyslexic**: Importada via `@import url()` do Google Fonts ou CDN, carregada sob demanda apenas quando ativada.

**Sem alteração no backend**: Todas as funcionalidades são client-side. Nenhuma migração de banco necessária.

**Arquivos a criar**: `src/components/AccessibilityPanel.tsx`
**Arquivos a editar**: `src/pages/StudentExam.tsx`, `src/index.css`

