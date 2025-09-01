import type { Metadata } from "next";
import { ProtectedRoute } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: "EF Admin Dashboard",
  description: "Admin panel for managing exams, questions, and analytics",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="admin">
      {children}
    </ProtectedRoute>
  );
}
