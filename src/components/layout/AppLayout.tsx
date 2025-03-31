import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, Users, FileText, MapPin, 
  Settings, LogOut, Menu, X, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
  restrictTo?: ('admin')[];
};

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: <LayoutGrid className="h-5 w-5" />,
  },
  {
    title: "Work Orders",
    href: "/workorders",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    title: "Locations",
    href: "/locations",
    icon: <MapPin className="h-5 w-5" />,
  },
  {
    title: "Users",
    href: "/users",
    icon: <Users className="h-5 w-5" />,
    restrictTo: ['admin'],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: <Settings className="h-5 w-5" />,
    restrictTo: ['admin'],
  },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    console.log("AppLayout: Current profile:", profile);
    console.log("AppLayout: Is admin?", profile?.role === 'admin');
  }, [profile]);
  
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isMobile) {
      setIsMenuOpen(false);
    }
  }, [location.pathname, isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setIsMenuOpen(true);
    } else {
      setIsMenuOpen(false);
    }
  }, [isMobile]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {isMobile && isMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <aside 
        className={cn(
          "fixed lg:relative z-50 flex flex-col h-full bg-white border-r border-border transition-all duration-300 ease-in-out",
          isMenuOpen 
            ? "w-64 translate-x-0 shadow-xl lg:shadow-none" 
            : "w-0 -translate-x-full lg:w-20 lg:translate-x-0"
        )}
      >
        <div className="flex items-center h-16 px-4">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className={cn("transition-opacity", 
              isMenuOpen && !isMobile ? "opacity-100" : "opacity-0 lg:opacity-0"
            )}>
              <h1 className="text-lg font-semibold">WorkOrder</h1>
            </div>
          </div>
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-auto"
              onClick={() => setIsMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        <Separator />
        
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems
              .filter(item => !item.restrictTo || (item.restrictTo.includes('admin') && isAdmin))
              .map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center h-10 px-3 rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 group",
                      location.pathname === item.href && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <span className="flex items-center justify-center w-5 h-5 mr-3">
                      {item.icon}
                    </span>
                    <span className={cn(
                      "transition-opacity duration-200", 
                      isMenuOpen ? "opacity-100" : "opacity-0 hidden lg:block"
                    )}>
                      {item.title}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
        
        <Separator />
        
        <div className="p-4">
          <Button
            variant="ghost"
            className={cn(
              "flex items-center justify-start w-full h-10 px-3 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
              !isMenuOpen && "justify-center"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span className={cn(
              "transition-opacity duration-200",
              isMenuOpen ? "opacity-100" : "opacity-0 hidden lg:block"
            )}>
              Logout
            </span>
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-border flex items-center px-4 bg-background/80 backdrop-blur-sm">
          {!isMenuOpen && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsMenuOpen(true)}
              className="mr-4"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <div className="flex items-center">
            <div className="text-sm text-muted-foreground flex items-center">
              <span>
                {location.pathname === "/" 
                  ? "Dashboard" 
                  : location.pathname.split("/").map((part, i, arr) => {
                      if (part === "") return null;
                      const href = arr.slice(0, i + 1).join("/");
                      const formattedPart = part.charAt(0).toUpperCase() + part.slice(1);
                      
                      return (
                        <span key={href} className="flex items-center">
                          {i > 0 && <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground/50" />}
                          <Link 
                            to={href} 
                            className="hover:text-foreground transition-colors"
                          >
                            {formattedPart}
                          </Link>
                        </span>
                      );
                    }).filter(Boolean)}
              </span>
            </div>
          </div>
          
          {profile && (
            <div className="ml-auto flex items-center">
              <span className="text-sm font-medium mr-2">{profile.name}</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {profile.role}
              </span>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
