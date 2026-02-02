"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Play,
  Pause,
  History,
  RefreshCw,
  Calendar,
  Clock,
  Repeat,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { format, formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface RecurringTask {
  id: string;
  title: string;
  description: string;
  frequency: string;
  frequency_display: string;
  cron_expression: string;
  start_date: string;
  end_date: string | null;
  next_run_date: string | null;
  last_run_date: string | null;
  priority: string;
  deadline_days: number;
  organizations: string[];
  organizations_count: number;
  status: string;
  status_display: string;
  total_created: number;
  created_at: string;
}

interface Statistics {
  total: number;
  active: number;
  paused: number;
  by_frequency: Record<string, number>;
  total_tasks_created: number;
}

const FREQUENCY_OPTIONS = [
  { value: "DAILY", label: "Har kuni" },
  { value: "WEEKLY", label: "Har hafta" },
  { value: "BIWEEKLY", label: "Ikki haftada bir" },
  { value: "MONTHLY", label: "Har oy" },
  { value: "QUARTERLY", label: "Har chorakda" },
  { value: "YEARLY", label: "Har yili" },
  { value: "CUSTOM", label: "Maxsus (cron)" },
];

const PRIORITY_OPTIONS = [
  { value: "PAST", label: "Past" },
  { value: "ODDIY", label: "Oddiy" },
  { value: "YUQORI", label: "Yuqori" },
  { value: "FAVQULODDA", label: "Favqulodda" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500",
  PAUSED: "bg-yellow-500",
  COMPLETED: "bg-blue-500",
  CANCELLED: "bg-red-500",
};

export default function RecurringTasksPage() {
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    frequency: "MONTHLY",
    cron_expression: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    priority: "ODDIY",
    deadline_days: 7,
  });

  useEffect(() => {
    loadTasks();
    loadStatistics();
  }, [statusFilter]);

  const loadTasks = async () => {
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const response = await api.get<RecurringTask[] | { results: RecurringTask[] }>(
        `/tasks/recurring/${params}`
      );
      const data = response.data;
      const items = Array.isArray(data) ? data : data?.results || [];
      setTasks(items);
    } catch (error) {
      console.error("Error loading recurring tasks:", error);
      toast({
        title: "Xatolik",
        description: "Takrorlanuvchi topshiriqlarni yuklashda xatolik",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await api.get<Statistics>("/tasks/recurring/statistics/");
      setStatistics(response.data);
    } catch (error) {
      console.error("Error loading statistics:", error);
    }
  };

  const createRecurringTask = async () => {
    if (!formData.title || !formData.description) {
      toast({
        title: "Xatolik",
        description: "Sarlavha va tavsif to'ldirilishi shart",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/tasks/recurring/", formData);
      toast({
        title: "Muvaffaqiyat",
        description: "Takrorlanuvchi topshiriq yaratildi",
      });
      setIsDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        frequency: "MONTHLY",
        cron_expression: "",
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: "",
        priority: "ODDIY",
        deadline_days: 7,
      });
      loadTasks();
      loadStatistics();
    } catch (error) {
      console.error("Error creating recurring task:", error);
      toast({
        title: "Xatolik",
        description: "Yaratishda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pauseTask = async (id: string) => {
    try {
      await api.post(`/tasks/recurring/${id}/pause/`);
      toast({ title: "To'xtatildi" });
      loadTasks();
      loadStatistics();
    } catch (error) {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  const resumeTask = async (id: string) => {
    try {
      await api.post(`/tasks/recurring/${id}/resume/`);
      toast({ title: "Davom ettirildi" });
      loadTasks();
      loadStatistics();
    } catch (error) {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  const runNow = async (id: string) => {
    try {
      const response = await api.post<{ task_id: number }>(`/tasks/recurring/${id}/run_now/`);
      toast({
        title: "Topshiriq yaratildi",
        description: `Topshiriq #${response.data.task_id} yaratildi`,
      });
      loadTasks();
      loadStatistics();
    } catch (error) {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Repeat className="h-6 w-6" />
            Takrorlanuvchi Topshiriqlar
          </h1>
          <p className="text-muted-foreground">
            Avtomatik ravishda yaratiluvchi muntazam topshiriqlar
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Yangi yaratish
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Yangi takrorlanuvchi topshiriq</DialogTitle>
              <DialogDescription>
                Avtomatik ravishda yaratiluvchi topshiriq shabloni
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Sarlavha</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Topshiriq sarlavhasi"
                />
              </div>
              <div>
                <Label htmlFor="description">Tavsif</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Topshiriq tavsifi"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Takrorlanish</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Muhimlik</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.frequency === "CUSTOM" && (
                <div>
                  <Label htmlFor="cron">Cron ifodasi</Label>
                  <Input
                    id="cron"
                    value={formData.cron_expression}
                    onChange={(e) =>
                      setFormData({ ...formData, cron_expression: e.target.value })
                    }
                    placeholder="0 9 * * 1 (har dushanba 9:00)"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Boshlanish sanasi</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Tugash sanasi (ixtiyoriy)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="deadline_days">Muddat (kun)</Label>
                <Input
                  id="deadline_days"
                  type="number"
                  min={1}
                  value={formData.deadline_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deadline_days: parseInt(e.target.value) || 7,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Bekor qilish
              </Button>
              <Button onClick={createRecurringTask} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Yaratish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{statistics.total}</p>
                  <p className="text-sm text-muted-foreground">Jami</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{statistics.active}</p>
                  <p className="text-sm text-muted-foreground">Faol</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Pause className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{statistics.paused}</p>
                  <p className="text-sm text-muted-foreground">To&apos;xtatilgan</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {statistics.total_tasks_created}
                  </p>
                  <p className="text-sm text-muted-foreground">Yaratilgan topshiriqlar</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Holat bo'yicha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            <SelectItem value="ACTIVE">Faol</SelectItem>
            <SelectItem value="PAUSED">To&apos;xtatilgan</SelectItem>
            <SelectItem value="COMPLETED">Yakunlangan</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={loadTasks}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Yangilash
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Takrorlanuvchi topshiriqlar yo&apos;q
              </h3>
              <p className="text-muted-foreground mb-4">
                Yangi takrorlanuvchi topshiriq yarating
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Yaratish
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sarlavha</TableHead>
                  <TableHead>Takrorlanish</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead>Keyingi ishga tushish</TableHead>
                  <TableHead>Yaratilgan</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {task.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {task.frequency_display}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${STATUS_COLORS[task.status]} text-white`}
                      >
                        {task.status_display}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.next_run_date ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {formatDistanceToNow(new Date(task.next_run_date), {
                            addSuffix: true,
                            locale: uz,
                          })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {task.total_created} ta topshiriq
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => runNow(task.id)}>
                            <Play className="h-4 w-4 mr-2" />
                            Hozir ishga tushirish
                          </DropdownMenuItem>
                          {task.status === "ACTIVE" ? (
                            <DropdownMenuItem onClick={() => pauseTask(task.id)}>
                              <Pause className="h-4 w-4 mr-2" />
                              To&apos;xtatib turish
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => resumeTask(task.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Davom ettirish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <History className="h-4 w-4 mr-2" />
                            Tarixni ko&apos;rish
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
