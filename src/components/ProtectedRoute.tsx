import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldX, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [approved, setApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const checkAccess = async (userId: string, email?: string) => {
      if (email) setUserEmail(email);

      // Check if user was invited by admin — invited users are always treated as teachers
      if (email) {
        const { data: invitation } = await supabase
          .from("admin_invitations")
          .select("status")
          .eq("email", email)
          .maybeSingle();

        if (invitation) {
          // Invited users bypass student check — they have premium teacher access
          setApproved(true);
          setLoading(false);
          return;
        }
      }

      const { data: studentRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "student")
        .maybeSingle();

      if (studentRole) {
        setIsStudent(true);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("user_id", userId)
        .maybeSingle();

      const userApproved = profile?.is_approved ?? false;
      setApproved(userApproved);

      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      const admin = !!role;
      setIsAdmin(admin);
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
      checkAccess(session.user.id, session.user.email);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setAuthenticated(false);
        setLoading(false);
        navigate("/auth");
        return;
      }
      setAuthenticated(true);
      checkAccess(session.user.id, session.user.email);
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

  if (isStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md space-y-4">
          <ShieldX className="h-16 w-16 mx-auto text-destructive" />
          <h2 className="text-xl font-bold">{t("protected_student_title")}</h2>
          <p className="text-muted-foreground text-sm">{t("protected_student_desc")}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}>
              {t("nav_logout")}
            </Button>
            <Button onClick={() => navigate("/student/dashboard")}>
              {t("protected_student_portal")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md space-y-5">
          <div className="relative inline-block">
            <Clock className="h-16 w-16 mx-auto text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-bold">{t("protected_pending_title")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("protected_pending_desc")}
          </p>
          {userEmail && (
            <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 inline-block">
              <Mail className="inline h-3 w-3 mr-1" />
              {userEmail}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t("protected_pending_time")}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}>
              {t("nav_logout")}
            </Button>
            <Button variant="secondary" onClick={() => navigate("/contact")}>
              {t("protected_contact_admin")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md space-y-4">
          <ShieldX className="h-16 w-16 mx-auto text-destructive" />
          <h2 className="text-xl font-bold">{t("protected_admin_title")}</h2>
          <p className="text-muted-foreground text-sm">{t("protected_admin_desc")}</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            {t("protected_back_dashboard")}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
