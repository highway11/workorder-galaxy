
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutGrid, 
  FileText, 
  MapPin, 
  Users, 
  Settings,
  LogOut
} from "lucide-react";
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton 
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const AppNav = () => {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const isAdmin = profile?.role === "admin";

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isActive("/")}
          tooltip="Dashboard"
          className="text-primary"
        >
          <Link to="/">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <span className="text-base">Dashboard</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isActive("/workorders") || location.pathname.startsWith("/workorders/")}
          tooltip="Work Orders"
          className="text-muted-foreground"
        >
          <Link to="/workorders">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="text-base">Work Orders</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isActive("/locations")}
          tooltip="Locations"
          className="text-muted-foreground"
        >
          <Link to="/locations">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <span className="text-base">Locations</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {isAdmin && (
        <>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/users") || location.pathname.startsWith("/users/")}
              tooltip="Users"
              className="text-muted-foreground"
            >
              <Link to="/users">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-base">Users</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/settings")}
              tooltip="Settings"
              className="text-muted-foreground"
            >
              <Link to="/settings">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span className="text-base">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </>
      )}

      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip="Logout"
          onClick={signOut}
          className="text-muted-foreground"
        >
          <Link to="/logout">
            <LogOut className="h-5 w-5 text-muted-foreground" />
            <span className="text-base">Logout</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export default AppNav;
