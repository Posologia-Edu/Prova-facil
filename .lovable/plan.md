

# Exportacao de Provas em PDF Profissional

## O que sera feito

Implementar um sistema completo de exportacao de provas em PDF diretamente do Compositor, incluindo layout profissional, marca d'agua personalizavel, gabarito separado e geracao de versoes embaralhadas (anti-cola).

---

## Funcionalidades

### 1. Dialog de Exportacao
Ao clicar em "Exportar", abre um dialog com opcoes:
- **Marca d'agua**: campo de texto (ex: "CONFIDENCIAL", "RASCUNHO") com toggle on/off
- **Gabarito separado**: checkbox para gerar pagina extra com respostas
- **Versoes embaralhadas**: selecionar quantidade (1 a 4 versoes A/B/C/D) com questoes e alternativas em ordem diferente
- **Botao "Gerar PDF"** que processa e baixa o arquivo

### 2. Geracao de PDF
Usar a biblioteca `jspdf` + `html2canvas` para capturar o layout A4 ja existente e converter em PDF de alta qualidade. O processo:
- Renderiza cada versao da prova em um elemento oculto
- Captura com html2canvas
- Monta o PDF com jspdf (uma pagina por versao + gabarito ao final)

### 3. Marca d'agua
Texto diagonal semi-transparente renderizado sobre cada pagina do PDF usando jspdf nativo (sem depender de CSS).

### 4. Gabarito Separado
Pagina adicional ao final do PDF com:
- Titulo da prova e versao (A/B/C/D)
- Tabela com numero da questao e resposta correta
- Informacoes do cabecalho (instituicao, professor, data)

### 5. Versoes Embaralhadas
Algoritmo Fisher-Yates para embaralhar:
- Ordem das questoes dentro de cada secao
- Ordem das alternativas em questoes de multipla escolha
- Cada versao recebe uma letra (A, B, C, D) impressa no cabecalho

---

## Detalhes Tecnicos

### Dependencia nova
- `jspdf` - Geracao de PDF no navegador
- `html2canvas` - Captura de elementos HTML como imagem

### Arquivos criados
- `src/components/ExamPDFExporter.tsx` - Componente do dialog de exportacao com toda a logica de geracao

### Arquivos alterados
- `src/pages/Composer.tsx` - Conectar o botao "Exportar" ao novo componente ExamPDFExporter, passando os dados da prova (titulo, secoes, cabecalho, questoes)

### Fluxo de exportacao

1. Usuario clica "Exportar" na barra de ferramentas
2. Dialog abre com opcoes de configuracao
3. Usuario seleciona marca d'agua, gabarito, numero de versoes
4. Clica "Gerar PDF"
5. Sistema renderiza cada versao em elemento oculto com layout A4
6. html2canvas captura cada pagina
7. jspdf monta o documento final
8. PDF e baixado automaticamente com nome: `{titulo-da-prova}-v{versao}.pdf`

### Estrutura do componente ExamPDFExporter

```text
Props:
  - examTitle: string
  - sections: Section[]
  - institutionName: string
  - teacherName: string
  - examDate: string
  - instructions: string

State:
  - watermarkText: string
  - watermarkEnabled: boolean
  - includeAnswerKey: boolean
  - versionCount: number (1-4)
  - isGenerating: boolean

Funcoes:
  - shuffleQuestions(sections) -> Section[]
  - generatePDF() -> void
  - renderExamPage(version, sections) -> HTMLElement
  - addWatermark(pdf, text) -> void
  - addAnswerKey(pdf, sections, version) -> void
```

