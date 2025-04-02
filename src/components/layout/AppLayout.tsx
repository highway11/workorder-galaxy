
import React from "react";
import { FileText } from "lucide-react";
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
        <Sidebar className="bg-background border-r border-border">
          <SidebarHeader>
            <div className="h-14 flex items-center px-4">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold tracking-tight">WorkOrder</h1>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-2 py-2">
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
