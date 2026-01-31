"use client";

import { useEffect, useState } from "react";
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
  Calendar
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<TelegramUser | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadUsers();
  }, [page, filter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
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
      
      const response = await api.get(`/telegram-bot/users/?${params}`);
      setUsers(response.data.results || response.data);
      if (response.data.count) {
        setTotalPages(Math.ceil(response.data.count / 20));
      }
    } catch (error) {
      toast({
        title: "Xato",
        description: "Foydalanuvchilarni yuklashda xato yuz berdi",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const openDetail = (user: TelegramUser) => {
    setSelectedUser(user);
    setShowDetail(true);
  };

  const toggleBlock = async (user: TelegramUser) => {
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
    } catch (error) {
      toast({
        title: "Xato",
        description: "Amalni bajarishda xato yuz berdi",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-500" />
            Telegram Foydalanuvchilar
          </h1>
          <p className="text-muted-foreground">
            Bot foydalanuvchilari ro'yxati
          </p>
        </div>
        <Button onClick={loadUsers} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yangilash
        </Button>
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
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className={user.is_blocked ? "text-green-500" : "text-red-500"}
                            onClick={() => toggleBlock(user)}
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
                    variant={selectedUser.is_blocked ? "default" : "destructive"}
                    onClick={() => {
                      toggleBlock(selectedUser);
                      setShowDetail(false);
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
    </div>
  );
}
