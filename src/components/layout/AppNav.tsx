
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  ClipboardList, 
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
        >
          <Link to="/">
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isActive("/workorders") || location.pathname.startsWith("/workorders/")}
          tooltip="Work Orders"
        >
          <Link to="/workorders">
            <ClipboardList className="h-4 w-4" />
            <span>Work Orders</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isActive("/locations")}
          tooltip="Locations"
        >
          <Link to="/locations">
            <MapPin className="h-4 w-4" />
            <span>Locations</span>
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
            >
              <Link to="/users">
                <Users className="h-4 w-4" />
                <span>Users</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/settings")}
              tooltip="Settings"
            >
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
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
        >
          <Link to="/logout">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export default AppNav;
