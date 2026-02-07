"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Edit,
  Trash2,
  Eye,
  Building2,
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
  ACTIVE: "bg-emerald-500",
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
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const initialFormState = {
    title: "",
    description: "",
    frequency: "MONTHLY",
    cron_expression: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    priority: "ODDIY",
    deadline_days: 7,
  };
  const [formData, setFormData] = useState(initialFormState);

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
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
  }, [statusFilter, toast]);

  const loadStatistics = useCallback(async () => {
    try {
      const response = await api.get<Statistics>("/tasks/recurring/statistics/");
      setStatistics(response.data);
    } catch (error) {
      console.error("Error loading statistics:", error);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadStatistics();
  }, [loadTasks, loadStatistics]);

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

  const openEditDialog = (task: RecurringTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      frequency: task.frequency,
      cron_expression: task.cron_expression || "",
      start_date: task.start_date ? task.start_date.split("T")[0] : "",
      end_date: task.end_date ? task.end_date.split("T")[0] : "",
      priority: task.priority,
      deadline_days: task.deadline_days,
    });
    setIsDialogOpen(true);
  };

  const updateRecurringTask = async () => {
    if (!editingTask) return;
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
      await api.patch(`/tasks/recurring/${editingTask.id}/`, formData);
      toast({
        title: "Muvaffaqiyat",
        description: "Takrorlanuvchi topshiriq yangilandi",
      });
      closeDialog();
      loadTasks();
    } catch (error) {
      console.error("Error updating recurring task:", error);
      toast({
        title: "Xatolik",
        description: "Yangilashda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecurringTask = async (id: string) => {
    if (!confirm("Haqiqatan ham bu takrorlanuvchi topshiriqni o'chirmoqchimisiz?")) return;
    
    try {
      await api.delete(`/tasks/recurring/${id}/`);
      toast({
        title: "O'chirildi",
        description: "Takrorlanuvchi topshiriq o'chirildi",
      });
      loadTasks();
      loadStatistics();
    } catch (error) {
      console.error("Error deleting recurring task:", error);
      toast({
        title: "Xatolik",
        description: "O'chirishda xatolik yuz berdi",
        variant: "destructive",
      });
    }
  };

  const viewHistory = async (task: RecurringTask) => {
    setEditingTask(task);
    setHistoryLoading(true);
    setIsHistoryOpen(true);
    try {
      const response = await api.get<any[]>(`/tasks/recurring/${task.id}/history/`);
      setHistoryData(response.data || []);
    } catch (error) {
      console.error("Error loading history:", error);
      toast({
        title: "Xatolik",
        description: "Tarixni yuklashda xatolik",
        variant: "destructive",
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTask(null);
    setFormData(initialFormState);
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
    <>
      <Header 
        title="Takrorlanuvchi topshiriqlar" 
        description="Avtomatik ravishda yaratiluvchi muntazam topshiriqlar" 
      />
      <div className="p-6 space-y-6">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-slate-100">
                <Repeat className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Boshqaruv</h2>
                <p className="text-sm text-slate-500">
                  Takrorlanuvchi topshiriqlarni yarating va boshqaring
                </p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsDialogOpen(true); }}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingTask(null); setFormData(initialFormState); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Yangi yaratish
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? "Takrorlanuvchi topshiriqni tahrirlash" : "Yangi takrorlanuvchi topshiriq"}
              </DialogTitle>
              <DialogDescription>
                {editingTask 
                  ? "Takrorlanuvchi topshiriq sozlamalarini yangilang" 
                  : "Avtomatik ravishda yaratiluvchi topshiriq shabloni"
                }
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
                onClick={closeDialog}
                disabled={isSubmitting}
              >
                Bekor qilish
              </Button>
              <Button 
                onClick={editingTask ? updateRecurringTask : createRecurringTask} 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingTask ? "Saqlash" : "Yaratish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50">
                <Repeat className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-800">{statistics.total}</p>
                <p className="text-sm text-slate-500">Jami</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-800">{statistics.active}</p>
                <p className="text-sm text-slate-500">Faol</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50">
                <Pause className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-800">{statistics.paused}</p>
                <p className="text-sm text-slate-500">To&apos;xtatilgan</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-50">
                <History className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-800">
                  {statistics.total_tasks_created}
                </p>
                <p className="text-sm text-slate-500">Yaratilgan</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-white border-slate-200">
            <SelectValue placeholder="Holat bo'yicha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            <SelectItem value="ACTIVE">Faol</SelectItem>
            <SelectItem value="PAUSED">To&apos;xtatilgan</SelectItem>
            <SelectItem value="COMPLETED">Yakunlangan</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={loadTasks} className="border-slate-200">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yangilash
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <Repeat className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">
                Takrorlanuvchi topshiriqlar yo&apos;q
              </h3>
              <p className="text-slate-500 mb-4">
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
                <TableRow className="bg-gradient-to-r from-slate-100 to-slate-50 hover:bg-slate-100 border-b-2 border-slate-200">
                  <TableHead className="font-bold text-slate-800 py-4 text-sm">Sarlavha</TableHead>
                  <TableHead className="font-bold text-slate-800 py-4 text-sm">Takrorlanish</TableHead>
                  <TableHead className="font-bold text-slate-800 py-4 text-sm">Holat</TableHead>
                  <TableHead className="font-bold text-slate-800 py-4 text-sm">Keyingi ishga tushish</TableHead>
                  <TableHead className="font-bold text-slate-800 py-4 text-sm">Yaratilgan</TableHead>
                  <TableHead className="w-16 py-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow 
                    key={task.id}
                    className="border-b border-slate-100 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-violet-50/50 transition-all duration-200"
                  >
                    <TableCell className="py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{task.title}</p>
                        <p className="text-sm text-slate-500 truncate max-w-xs font-medium">
                          {task.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm text-slate-700 font-medium">
                        {task.frequency_display}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold border px-3 py-1.5 shadow-sm rounded-lg ${
                          task.status === 'ACTIVE' ? 'border-emerald-300 bg-emerald-100 text-emerald-700' :
                          task.status === 'PAUSED' ? 'border-yellow-300 bg-yellow-100 text-yellow-700' :
                          task.status === 'COMPLETED' ? 'border-blue-300 bg-blue-100 text-blue-700' :
                          'border-red-300 bg-red-100 text-red-700'
                        }`}
                      >
                        {task.status_display}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      {task.next_run_date ? (
                        <span className="text-sm text-slate-700 font-medium">
                          {formatDistanceToNow(new Date(task.next_run_date), {
                            addSuffix: true,
                            locale: uz,
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <code className="rounded-lg bg-gradient-to-r from-purple-100 to-violet-100 border border-purple-200 px-3 py-1.5 text-sm font-mono font-bold text-purple-700 shadow-sm">
                        {task.total_created} ta
                      </code>
                    </TableCell>
                    <TableCell className="py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                          ) : task.status === "PAUSED" ? (
                            <DropdownMenuItem onClick={() => resumeTask(task.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Davom ettirish
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEditDialog(task)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Tahrirlash
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => viewHistory(task)}>
                            <History className="h-4 w-4 mr-2" />
                            Tarixni ko&apos;rish
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteRecurringTask(task.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            O&apos;chirish
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </div>
      
      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <History className="h-5 w-5 text-slate-600" />
              Yaratilgan topshiriqlar tarixi
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {editingTask?.title} - oxirgi 20 ta topshiriq
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>Hali topshiriq yaratilmagan</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {historyData.map((item: any, index: number) => (
                    <div 
                      key={item.id || index} 
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50">
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-slate-800">
                            Topshiriq #{item.created_task?.id || item.task_id}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.created_at 
                              ? format(new Date(item.created_at), "dd.MM.yyyy HH:mm", { locale: uz })
                              : "—"
                            }
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(`/dashboard/tasks/${item.created_task?.id || item.task_id}`, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ko&apos;rish
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
