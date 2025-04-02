
import React from "react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarTrigger, SidebarInset, SidebarFooter, SidebarSeparator } from "@/components/ui/sidebar";
import AppHeader from "./AppHeader";
import AppNav from "./AppNav";
import GroupSelector from "./GroupSelector";
import { useAuth } from "@/contexts/AuthContext";
import UserProfileDropdown from "./UserProfileDropdown";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen">
        <Sidebar>
          <SidebarHeader>
            <div className="h-14 flex items-center px-4">
              <div className="flex items-center gap-2">
                <img 
                  src="/logo.svg" 
                  alt="Logo" 
                  className="h-6 w-6" 
                />
                <h1 className="text-xl font-bold tracking-tight">WorkOrder App</h1>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <AppNav />
          </SidebarContent>
          <SidebarFooter>
            <GroupSelector />
            <SidebarSeparator />
            <div className="p-3">
              <UserProfileDropdown />
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 px-4 md:px-8 py-4 md:py-8 max-w-7xl mx-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
