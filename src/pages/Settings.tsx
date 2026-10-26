import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Loader2, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsListLine, TabsTriggerLine } from "@/components/ui/tabs";
import Pricing from "@/pages/Pricing";
import Contact from "@/pages/Contact";

const Settings = ({ initialTab = "profile" }: { initialTab?: "profile" | "plan" | "contact" }) => {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingName, setLoadingName] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) setFullName(data.full_name || "");
    };
    fetchProfile();
  }, []);

  const handleChangeName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setLoadingName(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("user_id", session.user.id);
      if (error) throw error;
      toast({ title: t("settings_name_success_title"), description: t("settings_name_success_desc") });
    } catch (error: any) {
      toast({ title: t("settings_error"), description: error.message, variant: "destructive" });
    } finally {
      setLoadingName(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setLoadingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast({ title: t("settings_email_success_title"), description: t("settings_email_success_desc") });
      setNewEmail("");
    } catch (error: any) {
      toast({ title: t("settings_error"), description: error.message, variant: "destructive" });
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: t("settings_error"), description: t("auth_min_chars"), variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("settings_error"), description: t("settings_password_mismatch"), variant: "destructive" });
      return;
    }
    setLoadingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: t("settings_password_success_title"), description: t("settings_password_success_desc") });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: t("settings_error"), description: error.message, variant: "destructive" });
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Conta"
        title={t("settings_title")}
        description="Seu perfil, o acesso, a assinatura e o contato com a equipe, em um só lugar."
      />

      <Tabs defaultValue={initialTab}>
        <TabsListLine>
          <TabsTriggerLine value="profile">Perfil e acesso</TabsTriggerLine>
          <TabsTriggerLine value="plan">Plano</TabsTriggerLine>
          <TabsTriggerLine value="contact">Contato</TabsTriggerLine>
        </TabsListLine>

        <TabsContent value="profile" className="mt-6">
      <div className="grid gap-6 max-w-xl">
        {/* Change Name */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg font-medium flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              {t("settings_change_name")}
            </CardTitle>
            <CardDescription>{t("settings_change_name_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangeName} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name">{t("settings_full_name")}</Label>
                <Input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("auth_full_name")}
                  required
                />
              </div>
              <Button type="submit" disabled={loadingName} className="">
                {loadingName && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("settings_update_name")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Email */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg font-medium flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              {t("settings_change_email")}
            </CardTitle>
            <CardDescription>{t("settings_change_email_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-email">{t("settings_new_email")}</Label>
                <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="novo@email.com" required />
              </div>
              <Button type="submit" disabled={loadingEmail} className="">
                {loadingEmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("settings_update_email")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg font-medium flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              {t("settings_change_password")}
            </CardTitle>
            <CardDescription>{t("settings_change_password_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("settings_new_password")}</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("auth_min_chars")} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("settings_confirm_password")}</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t("settings_confirm_password")} required minLength={6} />
              </div>
              <Button type="submit" disabled={loadingPassword} className="">
                {loadingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t("settings_update_password")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">Idioma e tema continuam no menu do usuário, no rodapé da barra lateral.</p>
        </TabsContent>

        <TabsContent value="plan" className="mt-6"><Pricing embedded /></TabsContent>
        <TabsContent value="contact" className="mt-6"><Contact embedded /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
