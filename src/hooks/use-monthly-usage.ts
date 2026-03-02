import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export function useMonthlyQuestionCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setLoading(false); return; }

    const { count: total, error } = await supabase
      .from("question_bank")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.user.id)
      .gte("created_at", getMonthStart())
      .is("deleted_at", null);

    if (!error && total !== null) setCount(total);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);
  return { count, loading, refresh };
}

export function useMonthlyExamCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setLoading(false); return; }

    const { count: total, error } = await supabase
      .from("exams")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.user.id)
      .gte("created_at", getMonthStart())
      .is("deleted_at", null);

    if (!error && total !== null) setCount(total);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);
  return { count, loading, refresh };
}
