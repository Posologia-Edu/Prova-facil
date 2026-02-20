import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

const FloatingAuth = () => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: t("auth_error_login"), description: error.message, variant: "destructive" });
    } else {
      setOpen(false);
      navigate("/dashboard");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: t("auth_error_signup"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("auth_signup_success_title"), description: t("auth_signup_success_desc") });
      setOpen(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setGoogleLoading(false);
    if (error) {
      toast({ title: t("auth_error_login"), description: String(error), variant: "destructive" });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {t("landing_enter")}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-none rounded-t-md">
            <TabsTrigger value="login">{t("auth_login")}</TabsTrigger>
            <TabsTrigger value="signup">{t("auth_signup")}</TabsTrigger>
          </TabsList>

          <div className="p-4">
            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="float-login-email" className="text-xs">{t("auth_email")}</Label>
                  <Input id="float-login-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="float-login-password" className="text-xs">{t("auth_password")}</Label>
                  <Input id="float-login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-9 text-sm" />
                </div>
                <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 h-9 text-sm" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  {t("auth_login")}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="float-signup-name" className="text-xs">{t("auth_full_name")}</Label>
                  <Input id="float-signup-name" type="text" placeholder="Prof. João Silva" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="float-signup-email" className="text-xs">{t("auth_email")}</Label>
                  <Input id="float-signup-email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="float-signup-password" className="text-xs">
                    {t("auth_password")} <span className="text-muted-foreground">(min. 6)</span>
                  </Label>
                  <Input id="float-signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-9 text-sm" />
                </div>
                <Button type="submit" className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 h-9 text-sm" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  {t("auth_create_account")}
                </Button>
              </form>
            </TabsContent>

            <div className="mt-3">
              <Separator className="mb-3" />
              <Button
                type="button"
                variant="outline"
                className="w-full h-9 text-sm gap-2"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Entrar com Google
              </Button>
            </div>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default FloatingAuth;
