
import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

const AppHeader = () => {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-muted-foreground" />
        <h2 className="font-semibold md:text-lg text-muted-foreground">WorkOrder App</h2>
      </div>
    </header>
  );
};

export default AppHeader;
