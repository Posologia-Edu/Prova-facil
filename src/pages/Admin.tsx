import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  CheckCircle,
  XCircle,
  Trash2,
  ShieldCheck,
  FileEdit,
  Library,
  Loader2,
  Clock,
  Mail,
  UserPlus,
  Circle,
  Key,
  CreditCard,
  Crown,
  Gift,
  CalendarDays,
} from "lucide-react";
import AdminApiKeys from "@/components/AdminApiKeys";
import AdminAnalytics from "@/components/AdminAnalytics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  institution: string | null;
  is_approved: boolean;
  created_at: string;
  roles: string[];
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  invited_at: string;
  completed_at: string | null;
}

interface Subscriber {
  subscription_id: string;
  customer_email: string;
  customer_name: string;
  status: string;
  product_id: string | null;
  amount: number;
  currency: string;
  interval: string;
  current_period_start: string;
  current_period_end: string;
  created: string;
}

interface Stats {
  totalUsers: number;
  pendingUsers: number;
  totalQuestions: number;
  totalExams: number;
}

async function adminAction(action: string, userId?: string, extra?: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const res = await supabase.functions.invoke("admin-users", {
    body: { action, userId, ...extra },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subscriberInvitations, setSubscriberInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, statsData, invitationsData] = await Promise.all([
        adminAction("list_users"),
        adminAction("get_stats"),
        adminAction("list_invitations"),
      ]);
      setUsers(usersData);
      setStats(statsData);
      setInvitations(invitationsData || []);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const loadSubscribers = async () => {
    setSubscribersLoading(true);
    try {
      const data = await adminAction("list_subscribers");
      setSubscribers(data.subscribers || []);
      setSubscriberInvitations(data.invitations || []);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setSubscribersLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleAction = async (action: string, userId: string, label: string) => {
    setActionLoading(userId);
    try {
      await adminAction(action, userId);
      toast({ title: "Sucesso", description: label });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-invite", {
        body: { email: inviteEmail.trim() },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast({ title: "Convite enviado!", description: `E-mail enviado para ${inviteEmail}` });
      setInviteEmail("");
      loadData();
    } catch (err: any) {
      toast({ title: "Erro ao enviar convite", description: err.message, variant: "destructive" });
    }
    setInviteLoading(false);
  };

  const pendingUsers = users.filter((u) => !u.is_approved);
  const approvedUsers = users.filter((u) => u.is_approved);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel Administrativo</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie usuários, aprovações e visualize estatísticas do sistema.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                <p className="text-xs text-muted-foreground">Total de Usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pendingUsers || 0}</p>
                <p className="text-xs text-muted-foreground">Aguardando Aprovação</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Library className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalQuestions || 0}</p>
                <p className="text-xs text-muted-foreground">Questões no Sistema</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                <FileEdit className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalExams || 0}</p>
                <p className="text-xs text-muted-foreground">Provas no Sistema</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" />
            Convidar Usuário Premium
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleInvite} className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-email">E-mail do convidado</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="professor@universidade.br"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={inviteLoading} className="gap-2">
              {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Enviar convite
            </Button>
          </form>

          {invitations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Convites enviados</p>
              <div className="divide-y rounded-lg border">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Circle
                        className={`h-3 w-3 fill-current ${
                          inv.status === "completed" ? "text-green-500" : "text-red-500"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Convidado em {new Date(inv.invited_at).toLocaleDateString("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-600 bg-amber-500/10">
                        <Gift className="h-3 w-3" />
                        Premium Convidado
                      </Badge>
                      <Badge variant={inv.status === "completed" ? "success" : "destructive"}>
                        {inv.status === "completed" ? "Cadastro completo" : "Pendente"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Keys */}
      <AdminApiKeys />

      {/* Tabs: Users + Subscribers */}
      <Tabs defaultValue="pending" onValueChange={(v) => { if (v === "subscribers" && subscribers.length === 0) loadSubscribers(); }}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pendentes ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Aprovados ({approvedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Assinantes
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingUsers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p className="font-medium">Nenhum usuário pendente</p>
                <p className="text-sm">Todos os cadastros foram processados.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((u) => (
                <UserCard
                  key={u.user_id}
                  user={u}
                  actionLoading={actionLoading}
                  onApprove={() => handleAction("approve_user", u.user_id, `${u.full_name} aprovado(a)`)}
                  onDelete={() => handleAction("delete_user", u.user_id, `${u.full_name} removido(a)`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          <div className="space-y-3">
            {approvedUsers.map((u) => (
              <UserCard
                key={u.user_id}
                user={u}
                actionLoading={actionLoading}
                onReject={() => handleAction("reject_user", u.user_id, `Acesso de ${u.full_name} revogado`)}
                onDelete={() => handleAction("delete_user", u.user_id, `${u.full_name} removido(a)`)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subscribers" className="mt-4">
          {subscribersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Paying Subscribers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Assinantes Pagantes ({subscribers.length})
                  </h3>
                  <Button size="sm" variant="outline" onClick={loadSubscribers} className="gap-1">
                    <Loader2 className={`h-3 w-3 ${subscribersLoading ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                </div>

                {subscribers.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Nenhum assinante pagante</p>
                      <p className="text-sm">Ainda não há assinaturas ativas no Stripe.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {subscribers.map((sub) => (
                      <div key={sub.subscription_id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{sub.customer_name || sub.customer_email}</p>
                            <Badge className="gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                              <Crown className="h-3 w-3" />
                              Premium
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{sub.customer_email}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="text-right">
                            <p className="font-medium text-foreground">
                              {(sub.amount / 100).toLocaleString("pt-BR", { style: "currency", currency: sub.currency })}
                              <span className="text-muted-foreground font-normal">/{sub.interval === "month" ? "mês" : sub.interval === "year" ? "ano" : sub.interval}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              <span>Desde {new Date(sub.created).toLocaleDateString("pt-BR")}</span>
                            </div>
                            <p>Renova em {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invited Premium Users */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Convidados Premium ({subscriberInvitations.filter((i) => i.status === "completed").length})
                </h3>
                {subscriberInvitations.filter((i) => i.status === "completed").length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <p className="text-sm">Nenhum convidado completou o cadastro ainda.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {subscriberInvitations.filter((i) => i.status === "completed").map((inv) => (
                      <div key={inv.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{inv.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Cadastro em {new Date(inv.completed_at || inv.invited_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-600 bg-amber-500/10">
                          <Gift className="h-3 w-3" />
                          Premium Convidado (Vitalício)
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <AdminAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UserCard({
  user,
  actionLoading,
  onApprove,
  onReject,
  onDelete,
}: {
  user: UserProfile;
  actionLoading: string | null;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete: () => void;
}) {
  const isLoading = actionLoading === user.user_id;
  const isAdminUser = user.roles.includes("admin");

  return (
    <Card>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{user.full_name || "Sem nome"}</p>
            {isAdminUser && (
              <Badge variant="default" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                Admin
              </Badge>
            )}
            {user.is_approved ? (
              <Badge variant="success">Aprovado</Badge>
            ) : (
              <Badge variant="destructive">Pendente</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {user.institution ? `${user.institution} · ` : ""}
            Cadastro: {new Date(user.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          {onApprove && (
            <Button size="sm" onClick={onApprove} disabled={isLoading} className="gap-1">
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              Aprovar
            </Button>
          )}
          {onReject && !isAdminUser && (
            <Button size="sm" variant="outline" onClick={onReject} disabled={isLoading} className="gap-1">
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              Revogar
            </Button>
          )}
          {!isAdminUser && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={isLoading} className="gap-1">
                  <Trash2 className="h-3 w-3" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir permanentemente {user.full_name || user.email}?
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
