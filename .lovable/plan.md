

## Diagnóstico: Bug na Divisão de Salas + Materiais

### Bug encontrado

Quando a sala é dividida (`SplitRoomDialog.tsx`, linha 128), os alunos são movidos para a nova sala mas **mantêm os valores antigos de `pair_index` e `pair_position`** da sala original:

```typescript
// Linha 128 — SplitRoomDialog.tsx
.update({ room_id: newRoom.id, status: "waiting", assigned_role: "waiting" })
.eq("id", studentId);
// ❌ NÃO reseta pair_index nem pair_position
```

Consequência: na nova sala, o professor não consegue formar novas duplas porque os alunos já aparecem como "pareados" (pair_index >= 0, pair_position = "A"/"B"). Sem duplas válidas na nova sala, a distribuição de rodadas fica quebrada e os materiais nunca chegam.

### Plano de correção

**Arquivo: `src/components/SplitRoomDialog.tsx`**
- Na linha 128, adicionar `pair_index: -1, pair_position: "X"` ao update dos alunos movidos, resetando o estado de pareamento

Essa é a única mudança necessária — uma linha. Todo o resto da lógica de materiais, ciclos e estudo já funciona corretamente quando as duplas são formadas do zero na nova sala.

| Arquivo | Mudança |
|---------|---------|
| `src/components/SplitRoomDialog.tsx` | Resetar `pair_index` e `pair_position` ao mover alunos |

