"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { 
  Users, 
  Search,
  Filter,
  Eye,
  Ban,
  CheckCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
  Calendar,
  Send,
  Image,
  Video,
  FileText,
  MessageSquare,
  Megaphone,
  Upload,
  X,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface TelegramUser {
  id: number;
  telegram_id: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  gender: string;
  region: {
    id: number;
    name: string;
  } | null;
  region_name: string;
  language: string;
  is_registered: boolean;
  is_blocked: boolean;
  appeals_count: number;
  created_at: string;
  last_activity: string;
}

const GENDER_LABELS: Record<string, string> = {
  male: "Erkak",
  female: "Ayol"
};

const LANGUAGE_LABELS: Record<string, string> = {
  uz: "O'zbek",
  ru: "Rus",
  en: "Ingliz"
};

export default function TelegramBotUsersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<TelegramUser | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // File input refs
  const messageFileInputRef = useRef<HTMLInputElement>(null);
  const broadcastFileInputRef = useRef<HTMLInputElement>(null);
  
  // Message form state
  const [messageText, setMessageText] = useState("");
  const [messageMediaType, setMessageMediaType] = useState<string>("");
  const [messageFileUrl, setMessageFileUrl] = useState("");
  const [messageFile, setMessageFile] = useState<File | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Broadcast form state
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastMediaType, setBroadcastMediaType] = useState<string>("");
  const [broadcastFileUrl, setBroadcastFileUrl] = useState("");
  const [broadcastFile, setBroadcastFile] = useState<File | null>(null);
  const [broadcastFilterRegistered, setBroadcastFilterRegistered] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      
      if (filter === "registered") {
        params.append("is_registered", "true");
      } else if (filter === "blocked") {
        params.append("is_blocked", "true");
      }
      
      if (search) {
        params.append("search", search);
      }
      
      const response = await api.get<{ results?: TelegramUser[]; count?: number } | TelegramUser[]>(`/telegram-bot/users/?${params}`);
      const data = response.data;
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        setUsers(data.results || []);
        if (data.count) {
          setTotalUsers(data.count);
          setTotalPages(Math.ceil(data.count / 20));
        }
      }
    } catch (err) {
      setError("Foydalanuvchilarni yuklashda xato yuz berdi");
      toast({
        title: "Xato",
        description: "Foydalanuvchilarni yuklashda xato yuz berdi",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [page, filter, search, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = useCallback(() => {
    setPage(1);
    loadUsers();
  }, [loadUsers]);

  const openDetail = useCallback((user: TelegramUser) => {
    setSelectedUser(user);
    setShowDetail(true);
  }, []);

  const openMessageDialog = useCallback((user: TelegramUser) => {
    setSelectedUser(user);
    setMessageText("");
    setMessageMediaType("");
    setMessageFileUrl("");
    setMessageFile(null);
    setShowMessageDialog(true);
  }, []);

  const toggleBlock = useCallback(async (user: TelegramUser) => {
    try {
      const action = user.is_blocked ? "unblock" : "block";
      await api.post(`/telegram-bot/users/${user.id}/${action}/`);
      
      toast({
        title: "Muvaffaqiyat",
        description: user.is_blocked 
          ? "Foydalanuvchi blokdan chiqarildi" 
          : "Foydalanuvchi bloklandi"
      });
      
      loadUsers();
      if (showDetail) {
        setSelectedUser(prev => prev ? { ...prev, is_blocked: !prev.is_blocked } : null);
      }
    } catch (err) {
      toast({
        title: "Xato",
        description: "Amalni bajarishda xato yuz berdi",
        variant: "destructive"
      });
    }
  }, [toast, loadUsers, showDetail]);

  const sendMessage = useCallback(async () => {
    if (!selectedUser || (!messageText && !messageFileUrl && !messageFile)) return;
    
    try {
      setSendingMessage(true);
      
      if (messageMediaType && (messageFile || messageFileUrl)) {
        // Media bilan yuborish
        const formData = new FormData();
        formData.append('media_type', messageMediaType);
        formData.append('caption', messageText);
        
        if (messageFile) {
          formData.append('file', messageFile);
        } else if (messageFileUrl) {
          formData.append('file_url', messageFileUrl);
        }
        
        await api.postFormData(`/telegram-bot/users/${selectedUser.id}/send_media/`, formData);
      } else {
        // Oddiy xabar
        await api.post(`/telegram-bot/users/${selectedUser.id}/send_message/`, {
          text: messageText
        });
      }
      
      toast({
        title: "Muvaffaqiyat",
        description: "Xabar yuborildi"
      });
      
      setShowMessageDialog(false);
    } catch (err: any) {
      toast({
        title: "Xato",
        description: err?.response?.data?.error || err?.message || "Xabar yuborishda xato",
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  }, [selectedUser, messageText, messageFileUrl, messageFile, messageMediaType, toast]);

  const sendBroadcast = useCallback(async () => {
    if (!broadcastText && !broadcastFileUrl && !broadcastFile) return;
    
    try {
      setSendingBroadcast(true);
      
      type BroadcastResponse = { success: boolean; success_count: number; fail_count: number; error?: string };
      let response: { data: BroadcastResponse };
      
      if (broadcastMediaType && (broadcastFile || broadcastFileUrl)) {
        // Media bilan yuborish
        const formData = new FormData();
        formData.append('text', broadcastText);
        formData.append('media_type', broadcastMediaType);
        formData.append('filter_registered', broadcastFilterRegistered.toString());
        
        if (broadcastFile) {
          formData.append('file', broadcastFile);
        } else if (broadcastFileUrl) {
          formData.append('file_url', broadcastFileUrl);
        }
        
        response = await api.postFormData<BroadcastResponse>(`/telegram-bot/users/broadcast/`, formData);
      } else {
        response = await api.post<BroadcastResponse>(`/telegram-bot/users/broadcast/`, {
          text: broadcastText,
          media_type: broadcastMediaType || null,
          file_url: broadcastFileUrl || null,
          filter_registered: broadcastFilterRegistered
        });
      }
      
      toast({
        title: "Muvaffaqiyat",
        description: `Xabar yuborildi: ${response.data.success_count} ta muvaffaqiyatli, ${response.data.fail_count} ta xato`
      });
      
      setShowBroadcastDialog(false);
      setBroadcastText("");
      setBroadcastMediaType("");
      setBroadcastFileUrl("");
      setBroadcastFile(null);
    } catch (err: any) {
      toast({
        title: "Xato",
        description: err?.response?.data?.error || "Xabar yuborishda xato",
        variant: "destructive"
      });
    } finally {
      setSendingBroadcast(false);
    }
  }, [broadcastText, broadcastFileUrl, broadcastFile, broadcastMediaType, broadcastFilterRegistered, toast]);

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={loadUsers} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Qayta urinish
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-500" />
            Telegram Foydalanuvchilar
            <Badge variant="secondary" className="ml-2">{totalUsers}</Badge>
          </h1>
          <p className="text-muted-foreground">
            Bot foydalanuvchilari ro'yxati va boshqaruvi
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowBroadcastDialog(true)} 
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Megaphone className="h-4 w-4 mr-2" />
            Barchaga xabar
          </Button>
          <Button onClick={loadUsers} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Yangilash
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input 
                placeholder="Qidirish (ism, telefon, username...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtr" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="registered">Ro'yxatdan o'tgan</SelectItem>
                <SelectItem value="blocked">Bloklangan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foydalanuvchi</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Hudud</TableHead>
                  <TableHead>Murojaatlar</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead>Qo'shilgan</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Foydalanuvchilar topilmadi
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            @{user.username || user.telegram_id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>{user.region_name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.appeals_count}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_blocked ? (
                          <Badge variant="destructive">Bloklangan</Badge>
                        ) : user.is_registered ? (
                          <Badge variant="default">Faol</Badge>
                        ) : (
                          <Badge variant="secondary">Ro'yxatdan o'tmagan</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString("uz")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => openDetail(user)}
                            title="Ko'rish"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-blue-500"
                            onClick={() => openMessageDialog(user)}
                            title="Xabar yuborish"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className={user.is_blocked ? "text-green-500" : "text-red-500"}
                            onClick={() => toggleBlock(user)}
                            title={user.is_blocked ? "Blokdan chiqarish" : "Bloklash"}
                          >
                            {user.is_blocked ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {page} / {totalPages}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent>
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedUser.full_name}</DialogTitle>
                <DialogDescription>
                  @{selectedUser.username || selectedUser.telegram_id}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-4 w-4" /> Telefon
                    </p>
                    <p className="font-medium">{selectedUser.phone || "-"}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> Hudud
                    </p>
                    <p className="font-medium">{selectedUser.region_name || "-"}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Jinsi</p>
                    <p className="font-medium">
                      {GENDER_LABELS[selectedUser.gender] || "-"}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Til</p>
                    <p className="font-medium">
                      {LANGUAGE_LABELS[selectedUser.language] || selectedUser.language}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> Qo'shilgan
                    </p>
                    <p className="font-medium">
                      {new Date(selectedUser.created_at).toLocaleDateString("uz")}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Oxirgi faollik</p>
                    <p className="font-medium">
                      {new Date(selectedUser.last_activity).toLocaleDateString("uz")}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>Jami murojaatlar:</span>
                    <Badge variant="outline" className="text-lg">
                      {selectedUser.appeals_count}
                    </Badge>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowDetail(false);
                      openMessageDialog(selectedUser);
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Xabar yuborish
                  </Button>
                  <Button 
                    variant={selectedUser.is_blocked ? "default" : "destructive"}
                    onClick={() => {
                      toggleBlock(selectedUser);
                    }}
                  >
                    {selectedUser.is_blocked ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Blokdan chiqarish
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4 mr-2" />
                        Bloklash
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Xabar yuborish
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name} ga xabar yuboring
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Xabar matni</Label>
              <Textarea 
                placeholder="Xabar matnini kiriting..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Media turi (ixtiyoriy)</Label>
              <Select value={messageMediaType || "none"} onValueChange={(val) => setMessageMediaType(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Media turini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Oddiy xabar</SelectItem>
                  <SelectItem value="photo">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" /> Rasm
                    </div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" /> Video
                    </div>
                  </SelectItem>
                  <SelectItem value="document">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Fayl
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {messageMediaType && (
              <div className="space-y-4">
                {/* Fayl yuklash */}
                <div className="space-y-2">
                  <Label>Fayl yuklash</Label>
                  <input
                    type="file"
                    ref={messageFileInputRef}
                    className="hidden"
                    accept={messageMediaType === 'photo' ? 'image/*' : messageMediaType === 'video' ? 'video/*' : '*'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setMessageFile(file);
                        setMessageFileUrl("");
                      }
                    }}
                  />
                  {messageFile ? (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <FileText className="h-4 w-4" />
                      <span className="flex-1 text-sm truncate">{messageFile.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setMessageFile(null);
                          if (messageFileInputRef.current) {
                            messageFileInputRef.current.value = "";
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => messageFileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Fayl tanlash
                    </Button>
                  )}
                </div>

                {/* Yoki URL orqali */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">yoki</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fayl URL</Label>
                  <Input 
                    placeholder="https://example.com/file.jpg"
                    value={messageFileUrl}
                    onChange={(e) => {
                      setMessageFileUrl(e.target.value);
                      if (e.target.value) setMessageFile(null);
                    }}
                    disabled={!!messageFile}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
              Bekor qilish
            </Button>
            <Button 
              onClick={sendMessage}
              disabled={sendingMessage || (!messageText && !messageFileUrl && !messageFile)}
            >
              {sendingMessage ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Yuborilmoqda...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Yuborish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Dialog */}
      <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-purple-500" />
              Barchaga xabar yuborish
            </DialogTitle>
            <DialogDescription>
              Barcha foydalanuvchilarga ommaviy xabar yuboring
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Diqqat! Bu xabar barcha {totalUsers} ta bloklanmagan foydalanuvchiga yuboriladi.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Xabar matni</Label>
              <Textarea 
                placeholder="Xabar matnini kiriting..."
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Media turi (ixtiyoriy)</Label>
              <Select value={broadcastMediaType || "none"} onValueChange={(val) => setBroadcastMediaType(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Media turini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Oddiy xabar</SelectItem>
                  <SelectItem value="photo">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" /> Rasm
                    </div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" /> Video
                    </div>
                  </SelectItem>
                  <SelectItem value="document">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Fayl
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {broadcastMediaType && (
              <div className="space-y-4">
                {/* Fayl yuklash */}
                <div className="space-y-2">
                  <Label>Fayl yuklash</Label>
                  <input
                    type="file"
                    ref={broadcastFileInputRef}
                    className="hidden"
                    accept={broadcastMediaType === 'photo' ? 'image/*' : broadcastMediaType === 'video' ? 'video/*' : '*'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBroadcastFile(file);
                        setBroadcastFileUrl("");
                      }
                    }}
                  />
                  {broadcastFile ? (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <FileText className="h-4 w-4" />
                      <span className="flex-1 text-sm truncate">{broadcastFile.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setBroadcastFile(null);
                          if (broadcastFileInputRef.current) {
                            broadcastFileInputRef.current.value = "";
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => broadcastFileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Fayl tanlash
                    </Button>
                  )}
                </div>

                {/* Yoki URL orqali */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">yoki</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fayl URL</Label>
                  <Input 
                    placeholder="https://example.com/file.jpg"
                    value={broadcastFileUrl}
                    onChange={(e) => {
                      setBroadcastFileUrl(e.target.value);
                      if (e.target.value) setBroadcastFile(null);
                    }}
                    disabled={!!broadcastFile}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="filter-registered"
                checked={broadcastFilterRegistered}
                onCheckedChange={(checked) => setBroadcastFilterRegistered(checked as boolean)}
              />
              <Label htmlFor="filter-registered" className="text-sm">
                Faqat ro'yxatdan o'tganlarga yuborish
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBroadcastDialog(false)}>
              Bekor qilish
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={sendBroadcast}
              disabled={sendingBroadcast || (!broadcastText && !broadcastFileUrl && !broadcastFile)}
            >
              {sendingBroadcast ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Yuborilmoqda...
                </>
              ) : (
                <>
                  <Megaphone className="h-4 w-4 mr-2" />
                  Barchaga yuborish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
