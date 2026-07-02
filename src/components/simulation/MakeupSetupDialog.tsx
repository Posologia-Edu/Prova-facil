import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { generateMakeupRounds, type ReusedRole } from "@/lib/simulation-distribution";
import { UserPlus, Users, Eye, Stethoscope } from "lucide-react";

type Participant = {
  id: string;
  student_name: string;
  student_email?: string;
  participant_role: string;
  pair_index: number;
  pair_position: string;
  makeup_status?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  allParticipants: Participant[];
  allRounds: any[];
  allResponses: any[];
  numCases: number;
  onSaved: () => void | Promise<void>;
};

export default function MakeupSetupDialog({
  open, onOpenChange, roomId, allParticipants, allRounds, allResponses, numCases, onSaved,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pairs, setPairs] = useState<string[][]>([]);
  const [reusedPatientByPair, setReusedPatientByPair] = useState<Record<number, string>>({});
  const [reusedObserverByPair, setReusedObserverByPair] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const students = useMemo(
    () => allParticipants.filter(p => p.participant_role === "student"),
    [allParticipants]
  );

  // Alunos que já responderam alguma rodada (aptos a serem reaproveitados)
  const respondedIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of allResponses || []) set.add(r.participant_id);
    return set;
  }, [allResponses]);

  const reusableStudents = useMemo(
    () => students.filter(s => respondedIds.has(s.id) && !selectedIds.has(s.id)),
    [students, respondedIds, selectedIds]
  );

  // Sugestão padrão: alunos sem resposta
  const initializeSuggested = () => {
    const suggested = new Set<string>();
    students.forEach(s => { if (!respondedIds.has(s.id)) suggested.add(s.id); });
    setSelectedIds(suggested);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const goToPairing = () => {
    if (selectedIds.size === 0) {
      toast({ title: "Selecione ao menos 1 aluno para a reposição", variant: "destructive" });
      return;
    }
    // Auto-pair sequentially
    const ids = Array.from(selectedIds);
    const auto: string[][] = [];
    for (let i = 0; i < ids.length; i += 2) {
      auto.push(ids.slice(i, i + 2));
    }
    setPairs(auto);
    setReusedPatientByPair({});
    setReusedObserverByPair({});
    setStep(2);
  };

  const nameOf = (id: string) => students.find(s => s.id === id)?.student_name || id;

  const nextBatch = useMemo(() => {
    const max = Math.max(0, ...(allRounds || []).map((r: any) => r.makeup_batch ?? 0));
    return max + 1;
  }, [allRounds]);

  const startingRoundNumber = useMemo(() => {
    const max = Math.max(0, ...(allRounds || []).map((r: any) => r.round_number ?? 0));
    return max + 1;
  }, [allRounds]);

  const soloPairsNeedingPatient = pairs
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => p.length === 1);

  const singlePairNeedsObserver = pairs.length === 1;

  const handleSave = async () => {
    // Validate reused roles when needed
    for (const { idx } of soloPairsNeedingPatient) {
      if (!reusedPatientByPair[idx]) {
        toast({ title: "Escolha um paciente reaproveitado para cada aluno solo", variant: "destructive" });
        return;
      }
    }
    if (singlePairNeedsObserver && !reusedObserverByPair[0]) {
      toast({ title: "Escolha um observador reaproveitado (só há 1 dupla)", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Build pair objects
      const pairParticipants = pairs.map((ids, listIdx) => {
        // reuse next pair_index available
        const usedIdx = allParticipants
          .map((p: any) => p.pair_index)
          .filter((n: number) => n >= 0);
        const basePairIndex = (Math.max(-1, ...usedIdx) + 1) + listIdx;
        return ids.map((id, posIdx) => {
          const s = students.find(x => x.id === id)!;
          return {
            id: s.id,
            student_name: s.student_name,
            pair_index: basePairIndex,
            pair_position: ids.length === 1 ? "S" : (posIdx === 0 ? "A" : "B"),
          };
        });
      });

      // Update participants: assign new pair_index/pair_position + mark makeup_status
      for (const pair of pairParticipants) {
        for (const p of pair) {
          await supabase.from("simulation_participants")
            .update({
              pair_index: p.pair_index,
              pair_position: p.pair_position,
              makeup_status: "included",
              status: "waiting",
            })
            .eq("id", p.id);
        }
      }

      // Reused roles
      const reusedRoles: ReusedRole[] = [];
      Object.entries(reusedPatientByPair).forEach(([idx, pid]) => {
        if (pid) reusedRoles.push({ participantId: pid, role: "patient", targetPairListIndex: Number(idx) });
      });
      Object.entries(reusedObserverByPair).forEach(([idx, pid]) => {
        if (pid) reusedRoles.push({ participantId: pid, role: "observer", targetPairListIndex: Number(idx) });
      });

      // Mark reused participants
      for (const r of reusedRoles) {
        await supabase.from("simulation_participants")
          .update({
            makeup_status: r.role === "patient" ? "reused_as_patient" : "reused_as_observer",
          })
          .eq("id", r.participantId);
      }

      const makeupRounds = generateMakeupRounds(
        pairParticipants,
        reusedRoles,
        numCases > 0 ? numCases : undefined,
        startingRoundNumber,
        nextBatch,
      );

      for (const round of makeupRounds) {
        const { data: roundData, error: roundError } = await supabase
          .from("simulation_rounds")
          .insert({
            room_id: roomId,
            round_number: round.roundNumber,
            cycle: round.cycle,
            status: "pending",
            is_makeup: true,
            makeup_batch: nextBatch,
          } as any)
          .select()
          .single();
        if (roundError || !roundData) continue;

        const assignments = round.assignments.map((a: any) => ({
          round_id: roundData.id,
          participant_id: a.participantId,
          assigned_role: a.role,
          pair_index: a.pairIndex,
          case_index: a.caseIndex ?? null,
          is_reused_role: round.reusedParticipantIds.includes(a.participantId),
        }));
        await supabase.from("simulation_round_assignments").insert(assignments as any);
      }

      // Reactivate room if needed
      await supabase.from("simulation_rooms").update({ status: "active" }).eq("id", roomId);

      toast({ title: "Reposição criada", description: `${makeupRounds.length} nova(s) rodada(s) — Leva ${nextBatch}` });
      await onSaved();
      onOpenChange(false);
      setStep(1);
      setSelectedIds(new Set());
      setPairs([]);
    } catch (err: any) {
      toast({ title: "Erro ao criar reposição", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) { setStep(1); initializeSuggested(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Nova reposição de anamnese — Leva {nextBatch}
          </DialogTitle>
          <DialogDescription>
            Reutilize esta sala para os alunos que faltaram. Se não houver alunos suficientes para preencher
            paciente ou observador, você pode escolher entre os alunos que já fizeram anamnese.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Passo 1 — Quem fará a reposição?</p>
            <p className="text-xs text-muted-foreground">
              Marcamos automaticamente os alunos que ainda não têm resposta registrada. Ajuste conforme necessário.
            </p>
            <ScrollArea className="h-72 border rounded-md p-3">
              <div className="space-y-2">
                {students.map(s => {
                  const responded = respondedIds.has(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedIds.has(s.id)}
                        onCheckedChange={() => toggleSelected(s.id)}
                      />
                      <span className="flex-1">{s.student_name}</span>
                      {responded ? (
                        <Badge variant="secondary" className="text-xs">já respondeu</Badge>
                      ) : (
                        <Badge className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-300">sem resposta</Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="text-xs text-muted-foreground">
              {selectedIds.size} aluno(s) selecionado(s) — {Math.ceil(selectedIds.size / 2)} dupla(s) potencial(is).
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">Passo 2 — Confirmar duplas e preencher papéis</p>
            <p className="text-xs text-muted-foreground">
              As duplas são formadas automaticamente na ordem selecionada. Alunos solo ou dupla única precisam
              de paciente/observador reaproveitados.
            </p>
            <div className="space-y-3">
              {pairs.map((pair, idx) => {
                const isSolo = pair.length === 1;
                const needsObserver = pairs.length === 1 && idx === 0;
                return (
                  <div key={idx} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Users className="h-4 w-4" />
                      Dupla {idx + 1} {isSolo && <Badge variant="outline" className="text-xs">Solo</Badge>}
                    </div>
                    <div className="text-sm">
                      {pair.map(id => nameOf(id)).join("  ↔  ")}
                    </div>
                    {isSolo && (
                      <div className="pt-2">
                        <Label className="text-xs flex items-center gap-1">
                          <Stethoscope className="h-3 w-3" /> Paciente reaproveitado
                        </Label>
                        <Select
                          value={reusedPatientByPair[idx] || ""}
                          onValueChange={(v) => setReusedPatientByPair(prev => ({ ...prev, [idx]: v }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Escolher entre alunos já anamnesados..." /></SelectTrigger>
                          <SelectContent>
                            {reusableStudents.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.student_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {needsObserver && (
                      <div className="pt-2">
                        <Label className="text-xs flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Observador reaproveitado
                        </Label>
                        <Select
                          value={reusedObserverByPair[idx] || ""}
                          onValueChange={(v) => setReusedObserverByPair(prev => ({ ...prev, [idx]: v }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Escolher entre alunos já anamnesados..." /></SelectTrigger>
                          <SelectContent>
                            {reusableStudents.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.student_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={goToPairing}>Continuar</Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Criando..." : "Criar rodadas de reposição"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
