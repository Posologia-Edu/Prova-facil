import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [approved, setApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async (userId: string) => {
      // Check approval
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("user_id", userId)
        .maybeSingle();

      const userApproved = profile?.is_approved ?? false;
      setApproved(userApproved);

      // Check admin
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      const admin = !!role;
      setIsAdmin(admin);

      // Admins are always approved
      if (admin) setApproved(true);

      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        setAuthenticated(false);
        setLoading(false);
        navigate("/auth");
        return;
      }
      setAuthenticated(true);
      checkAccess(session.user.id);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setAuthenticated(false);
        setLoading(false);
        navigate("/auth");
        return;
      }
      setAuthenticated(true);
      checkAccess(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (!authenticated) return null;

  if (!approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md space-y-4">
          <ShieldX className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-bold">Aguardando Aprovação</h2>
          <p className="text-muted-foreground text-sm">
            Seu cadastro está sendo analisado pelo administrador.
            Você receberá acesso assim que for aprovado.
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/");
            }}
          >
            Sair
          </Button>
        </div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md space-y-4">
          <ShieldX className="h-16 w-16 mx-auto text-destructive" />
          <h2 className="text-xl font-bold">Acesso Restrito</h2>
          <p className="text-muted-foreground text-sm">
            Esta área é exclusiva para administradores.
          </p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Voltar ao Painel
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
