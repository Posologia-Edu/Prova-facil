import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
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

interface Stats {
  totalUsers: number;
  pendingUsers: number;
  totalQuestions: number;
  totalExams: number;
}

async function adminAction(action: string, userId?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const res = await supabase.functions.invoke("admin-users", {
    body: { action, userId },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        adminAction("list_users"),
        adminAction("get_stats"),
      ]);
      setUsers(usersData);
      setStats(statsData);
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
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-success" />
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
