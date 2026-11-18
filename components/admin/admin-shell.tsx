"use client";

import React, { useState, createContext, useContext } from "react";
import { AdminSidebar } from "./admin-sidebar";

interface AdminContextType {
  openSidebar: () => void;
  closeSidebar: () => void;
  isSidebarOpen: boolean;
}

const AdminContext = createContext<AdminContextType>({
  openSidebar: () => {},
  closeSidebar: () => {},
  isSidebarOpen: false,
});

export const useAdmin = () => useContext(AdminContext);

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AdminContext.Provider
      value={{
        openSidebar: () => setIsSidebarOpen(true),
        closeSidebar: () => setIsSidebarOpen(false),
        isSidebarOpen,
      }}
    >
      <div className="min-h-screen bg-slate-50/60 dark:bg-black text-slate-900 dark:text-zinc-100 flex">
        <AdminSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all">
          {children}
        </div>
      </div>
    </AdminContext.Provider>
  );
}
