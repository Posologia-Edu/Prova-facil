# Cópia de segurança do protótipo de interface (Lote 1)

Fonte da verdade: o artefato https://claude.ai/artifact/37TBntBk1VMcF8Cs1cKPww (versão 6 em 2026-10-24: Lote 1 + Lote 2).
Esta pasta guarda só a casca (`index.html`) e os módulos `v2-*` dos Lotes 1 e 2 (14). Os módulos antigos (v1) existem apenas no artefato.

Para publicar de novo: ler o artefato com a ferramenta Artifact (action read), editar a casca e os módulos, e publicar com `url`, `file_path` = index.html e `files` = {"modules/<id>.html": "modules/<id>.html"} (com `root` apontando para uma cópia desta pasta).
Novos módulos precisam entrar na lista GROUPS e na lista V2 dentro de `index.html`.
