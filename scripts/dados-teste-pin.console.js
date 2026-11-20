// Versão para COLAR NO CONSOLE do navegador, já logado como professor em https://provafacil.posologia.app (serve para login pelo Google).
// Faz o mesmo que scripts/dados-teste-pin.mjs: cria os dados de teste com a sua sessão, sem mostrar nem enviar o token a ninguém além do banco do sistema.
// Uso: abra o sistema logado, F12 > Console, cole este arquivo inteiro (o Chrome pede para digitar "allow pasting" na primeira vez) e rode:
//   await __testePin.criar()    -> cria e baixa testes-pin.local.json (mova para a pasta scripts/ do projeto)
//   await __testePin.apagar()   -> apaga o que foi criado (use o mesmo navegador: os ids ficam salvos nele)
(() => {
  const URL_BASE = "https://oeltgtllcxynhoirbfey.supabase.co", CHAVE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lbHRndGxsY3h5bmhvaXJiZmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTI3ODksImV4cCI6MjA4NjkyODc4OX0.2K1Viz_H-2M16CN0BNft0XKVAsSReYVP9eh4_TivR60", NOME = "[TESTE-AUTO]", LS_DADOS = "teste-pin-dados";
  const lerSessao = () => {
    const k = Object.keys(localStorage).find((x) => /^sb-.*-auth-token$/.test(x));
    if (!k) throw new Error("Sessão não encontrada: faça login no sistema nesta aba.");
    const s = JSON.parse(localStorage.getItem(k));
    if (!s?.access_token || !s?.user?.id) throw new Error("Sessão inválida: entre de novo no sistema.");
    return { token: s.access_token, eu: s.user.id };
  };
  const rest = async (metodo, caminho, corpo) => {
    const { token } = lerSessao();
    const r = await fetch(`${URL_BASE}/rest/v1/${caminho}`, {
      method: metodo, headers: { apikey: CHAVE, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
    if (!r.ok) throw new Error(`${metodo} ${caminho.split("?")[0]}: ${j?.message || t || r.status}`);
    return j;
  };
  const baixar = (nome, obj) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
    a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  };

  async function criar() {
    if (localStorage.getItem(LS_DADOS)) throw new Error("Já existem dados de teste neste navegador. Rode await __testePin.apagar() antes.");
    const { eu } = lerSessao();
    const criados = [], cfg = {}, aviso = [];
    const salvar = () => localStorage.setItem(LS_DADOS, JSON.stringify({ criados }));
    const linha = async (tabela, l) => { const [r] = await rest("POST", tabela, l); criados.push({ tabela, id: r.id }); salvar(); return r; };
    const bloco = async (rotulo, fn) => {
      try { await fn(); console.log("criado  ", rotulo); }
      catch (e) { aviso.push(`${rotulo}: ${e.message}`); console.warn("FALHOU  ", rotulo, e.message); }
    };

    await bloco("Documentação (sala ativa)", async () => {
      const s = await linha("documentation_rooms", { user_id: eu, title: `${NOME} Documentação`, status: "active" });
      cfg.documentacao = { codigo: s.access_code };
    });
    await bloco("Módulo de saúde: Enfermagem (sala ativa)", async () => {
      const s = await linha("nursing_rooms", { user_id: eu, title: `${NOME} Enfermagem`, status: "active" });
      cfg.area = { modulo: "nursing", codigo: s.access_code };
    });
    await bloco("Reconciliação (sala ativa)", async () => {
      const s = await linha("reconciliation_rooms", { user_id: eu, title: `${NOME} Reconciliação`, status: "active" });
      cfg.reconciliacao = { codigo: s.access_code };
    });
    await bloco("Júri (2 grupos, 1 caso, sessão aberta, 1 formulário)", async () => {
      const jr = await linha("mock_trials", { user_id: eu, title: `${NOME} Júri`, status: "active" });
      const ga = await linha("mock_trial_groups", { mock_trial_id: jr.id, name: "Grupo A (teste)", group_number: 1 });
      const gb = await linha("mock_trial_groups", { mock_trial_id: jr.id, name: "Grupo B (teste)", group_number: 2 });
      const emailA = "aluno.a.teste-auto@example.invalid", emailB = "aluno.b.teste-auto@example.invalid";
      await linha("mock_trial_students", { mock_trial_id: jr.id, group_id: ga.id, student_name: "Aluno A (teste)", student_email: emailA });
      await linha("mock_trial_students", { mock_trial_id: jr.id, group_id: gb.id, student_name: "Aluno B (teste)", student_email: emailB });
      const caso = await linha("mock_trial_cases", { mock_trial_id: jr.id, position: 1, case_number: 1, title: `${NOME} Caso`, process_content: "Processo de teste.", generation_status: "done" });
      await linha("mock_trial_assignments", { case_id: caso.id, group_id: ga.id, role: "prosecution" });
      const ses = await linha("mock_trial_sessions", { case_id: caso.id, status: "prosecution", phase_duration_seconds: 600, current_phase_started_at: new Date().toISOString() });
      const form = await linha("mock_trial_forms", { mock_trial_id: jr.id, target_role: "prosecution", title: `${NOME} Formulário`, fields_json: [] });
      cfg.juri = { codigo: jr.access_code, emailGrupoA: emailA, emailGrupoB: emailB, formId: form.id, sessionId: ses.id };
    });
    await bloco("Paciente virtual (uma sessão aberta e uma concluída)", async () => {
      const aberta = await linha("virtual_patient_sessions", { patient_id: "pain_helena", user_id: eu, student_name: `${NOME} aluno`, status: "active" });
      const concl = await linha("virtual_patient_sessions", { patient_id: "pain_helena", user_id: eu, student_name: `${NOME} aluno`, status: "completed" });
      cfg.pacienteVirtual = { sessaoAbertaId: aberta.id, pacienteDaSessao: "pain_helena", sessaoConcluidaId: concl.id, pacienteDaSessaoConcluida: "pain_helena" };
    });
    await bloco("OSCE (prova, estação com paciente virtual, circuito em andamento)", async () => {
      const ex = await linha("osce_exams", { user_id: eu, title: `${NOME} OSCE` });
      const est = await linha("osce_stations", { osce_exam_id: ex.id, title: `${NOME} Estação`, position: 1, virtual_patient_enabled: true, patient_script: "Paciente de teste." });
      await linha("osce_circuits", { osce_exam_id: ex.id, user_id: eu, status: "running" });
      cfg.osce = { estacaoId: est.id };
    });
    await bloco("Gamificação (prova, publicação, sessão de aluno e pontos)", async () => {
      const ex = await linha("exams", { user_id: eu, title: `${NOME} Prova` });
      const pub = await linha("exam_publications", { exam_id: ex.id, user_id: eu });
      const emailG = "aluno.gami.teste-auto@example.invalid";
      const ss = await linha("exam_sessions", { publication_id: pub.id, student_email: emailG, student_name: `${NOME} aluno` });
      cfg.gamificacao = { sessionId: ss.id, email: emailG };
      try {
        await linha("student_points", { student_email: emailG, source: "teste-auto", points: 10 });
        await linha("student_points", { student_email: "colega.teste-auto@example.invalid", source: "teste-auto", points: 20 });
      } catch (e) { aviso.push(`pontos para o ranking: ${e.message}`); }
    });

    baixar("testes-pin.local.json", cfg);
    baixar("testes-pin.dados.json", { criados });
    console.log(`${criados.length} registros criados. Dois arquivos foram baixados: mova testes-pin.local.json (e, para guardar, testes-pin.dados.json) para a pasta scripts/ do projeto.`);
    if (aviso.length) console.warn("Avisos:\n - " + aviso.join("\n - "));
    return { criados: criados.length, avisos: aviso.length };
  }

  async function apagar() {
    const bruto = localStorage.getItem(LS_DADOS);
    if (!bruto) { console.log("Nada para apagar neste navegador."); return; }
    const { criados } = JSON.parse(bruto);
    for (const c of criados.filter((x) => x.tabela === "mock_trial_sessions")) {
      try { await rest("DELETE", `mock_trial_responses?session_id=eq.${c.id}`); } catch (e) { console.warn("aviso:", e.message); }
    }
    let falhas = 0;
    for (const c of [...criados].reverse()) {
      try { await rest("DELETE", `${c.tabela}?id=eq.${encodeURIComponent(c.id)}`); console.log("apagado ", c.tabela, c.id); }
      catch (e) { falhas++; console.warn("FALHOU  ", e.message); }
    }
    if (!falhas) { localStorage.removeItem(LS_DADOS); console.log("Dados de teste removidos. Apague também scripts/testes-pin.local.json no projeto."); }
    else console.warn(`${falhas} item(ns) não apagado(s); os ids continuam salvos. Rode de novo.`);
  }

  window.__testePin = { criar, apagar };
  console.log("Pronto. Rode: await __testePin.criar()   e depois   await __testePin.apagar()");
})();
