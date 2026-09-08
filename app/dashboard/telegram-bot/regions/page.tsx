"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  MapPin, 
  Plus, 
  Pencil, 
  Trash2,
  RefreshCw,
  Save,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api, getCurrentUser } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { ShieldAlert } from "lucide-react";

interface Region {
  id: number;
  name: string;
  code: string;
  order: number;
  is_active: boolean;
}

export default function TelegramBotRegionsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    order: 0,
    is_active: true
  });

  const loadRegions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ results?: Region[] } | Region[]>("/telegram-bot/regions/");
      const data = response.data;
      if (Array.isArray(data)) {
        setRegions(data);
      } else {
        setRegions(data.results || []);
      }
    } catch (err) {
      setError("Hududlarni yuklashda xato yuz berdi");
      toast({
        title: "Xato",
        description: "Hududlarni yuklashda xato yuz berdi",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  const openCreate = useCallback(() => {
    setSelectedRegion(null);
    setFormData({
      name: "",
      code: "",
      order: regions.length + 1,
      is_active: true
    });
    setShowDialog(true);
  }, [regions.length]);

  const openEdit = useCallback((region: Region) => {
    setSelectedRegion(region);
    setFormData({
      name: region.name,
      code: region.code,
      order: region.order,
      is_active: region.is_active
    });
    setShowDialog(true);
  }, []);

  const openDeleteDialog = useCallback((region: Region) => {
    setSelectedRegion(region);
    setShowDelete(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.name) {
      toast({
        title: "Xato",
        description: "Hudud nomini kiriting",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      if (selectedRegion) {
        await api.put(`/telegram-bot/regions/${selectedRegion.id}/`, formData);
        toast({
          title: "Muvaffaqiyat",
          description: "Hudud yangilandi"
        });
      } else {
        await api.post("/telegram-bot/regions/", formData);
        toast({
          title: "Muvaffaqiyat",
          description: "Yangi hudud qo'shildi"
        });
      }
      setShowDialog(false);
      loadRegions();
    } catch (err) {
      toast({
        title: "Xato",
        description: "Saqlashda xato yuz berdi",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }, [formData, selectedRegion, toast, loadRegions]);

  const handleDelete = useCallback(async () => {
    if (!selectedRegion) return;

    try {
      setDeleting(true);
      await api.delete(`/telegram-bot/regions/${selectedRegion.id}/`);
      toast({
        title: "Muvaffaqiyat",
        description: "Hudud o'chirildi"
      });
      setShowDelete(false);
      loadRegions();
    } catch (err) {
      toast({
        title: "Xato",
        description: "O'chirishda xato yuz berdi",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  }, [selectedRegion, toast, loadRegions]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={loadRegions} variant="outline">
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
            <MapPin className="h-6 w-6 text-orange-500" />
            Hududlar
          </h1>
          <p className="text-muted-foreground">
            Mahalla va qishloqlar ro'yxati
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadRegions} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Yangilash
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Qo'shish
          </Button>
        </div>
      </div>

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
                  <TableHead>Tartib</TableHead>
                  <TableHead>Nomi</TableHead>
                  <TableHead>Kod</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Hududlar topilmadi
                    </TableCell>
                  </TableRow>
                ) : (
                  regions.map((region) => (
                    <TableRow key={region.id}>
                      <TableCell>{region.order}</TableCell>
                      <TableCell className="font-medium">{region.name}</TableCell>
                      <TableCell>{region.code || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={region.is_active ? "default" : "secondary"}>
                          {region.is_active ? "Faol" : "Nofaol"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => openEdit(region)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => openDeleteDialog(region)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRegion ? "Hududni tahrirlash" : "Yangi hudud"}
            </DialogTitle>
            <DialogDescription>
              Mahalla yoki qishloq ma'lumotlarini kiriting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nomi *</Label>
              <Input 
                id="name"
                placeholder="Misol: Hatirchi shaharchasi"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Kod</Label>
              <Input 
                id="code"
                placeholder="Misol: hatirchi"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Tartib raqami</Label>
              <Input 
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Faol</Label>
              <Switch 
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
              Bekor qilish
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hududni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              "{selectedRegion?.name}" hududini o'chirishni tasdiqlaysizmi?
              Bu amalni bekor qilib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleting}
            >
              {deleting ? "O'chirilmoqda..." : "O'chirish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
