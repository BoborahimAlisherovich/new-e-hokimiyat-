"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface AdminOnlyProps {
  children: React.ReactNode;
  title?: string;
}

export function AdminOnly({ children, title = "Admin Panel" }: AdminOnlyProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        
        // Only ADMIN role can access
        if (user.role !== 'ADMIN') {
          setAccessDenied(true);
        }
      } catch (err) {
        console.error("Failed to check user access:", err);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    checkAccess();
  }, [router]);

  if (loading) {
    return (
      <>
        <Header title={title} />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-muted-foreground">Yuklanmoqda...</p>
          </div>
        </div>
      </>
    );
  }

  if (accessDenied) {
    return (
      <>
        <Header title="Ruxsat yo'q" />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-4"
          >
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-6">
                <ShieldAlert className="h-16 w-16 text-red-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Ruxsat yo'q</h2>
              <p className="text-muted-foreground max-w-md">
                Bu sahifa faqat Administrator uchun mavjud.
              </p>
              <p className="text-sm text-muted-foreground">
                Sizning rolingiz: <span className="font-semibold">{currentUser?.role || 'Noma\'lum'}</span>
              </p>
            </div>
            <Button 
              onClick={() => router.push('/dashboard')}
              className="mt-4"
            >
              Bosh sahifaga qaytish
            </Button>
          </motion.div>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
