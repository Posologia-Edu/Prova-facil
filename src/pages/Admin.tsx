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
} from "lucide-react";
import AdminApiKeys from "@/components/AdminApiKeys";
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
  const [loading, setLoading] = useState(true);
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

          {/* Invitation List */}
          {invitations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Convites enviados</p>
              <div className="divide-y rounded-lg border">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Circle
                        className={`h-3 w-3 fill-current ${
                          inv.status === "completed"
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Convidado em {new Date(inv.invited_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={inv.status === "completed" ? "success" : "destructive"}>
                      {inv.status === "completed" ? "Cadastro completo" : "Pendente"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Keys */}
      <AdminApiKeys />

      {/* User Management */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pendentes ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Aprovados ({approvedUsers.length})
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
