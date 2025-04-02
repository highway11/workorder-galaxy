
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Search, MapPin, ArrowUp, ArrowDown } from "lucide-react";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { useGroup } from "@/contexts/GroupContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type LocationStats = {
  id: string;
  name: string;
  group_id: string;
  totalWorkorders: number;
  openWorkorders: number;
  lastWorkorderDate: string | null;
};

type SortField = "name" | "totalWorkorders" | "openWorkorders" | "lastWorkorderDate";
type SortDirection = "asc" | "desc";

export function LocationsTable() {
  const { locationStats } = useDashboardStats();
  const { selectedGroupId } = useGroup();
  const { profile, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  // Fetch user's groups if they are a manager
  const { data: userGroups = [] } = useQuery({
    queryKey: ['user-groups', user?.id],
    queryFn: async () => {
      if (!user || profile?.role !== 'manager') return [];
      
      const { data, error } = await supabase
        .from('user_groups')
        .select('group_id')
        .eq('user_id', user.id);
        
      if (error) {
        console.error("Error fetching user groups:", error);
        return [];
      }
      
      return data.map(g => g.group_id);
    },
    enabled: !!user && profile?.role === 'manager'
  });

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter locations based on user role and groups
  const filteredLocations = locationStats.data
    ? locationStats.data.filter(location => {
        // For admins with selected group
        if (profile?.role === 'admin' && selectedGroupId) {
          return location.group_id === selectedGroupId;
        }
        // For admins without selected group, show all
        else if (profile?.role === 'admin') {
          return true;
        }
        // For managers, show locations from their groups
        else if (profile?.role === 'manager') {
          return userGroups.includes(location.group_id);
        }
        // For regular users, only show their created locations or default to group if selected
        else {
          return selectedGroupId ? location.group_id === selectedGroupId : true;
        }
      })
    : [];

  // Sort and filter locations
  const sortedAndFilteredLocations = filteredLocations
    ? [...filteredLocations]
        .filter((location) => 
          location.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
          // Handle different field types
          if (sortField === "name") {
            return sortDirection === "asc" 
              ? a.name.localeCompare(b.name)
              : b.name.localeCompare(a.name);
          } else if (sortField === "lastWorkorderDate") {
            // Handle null dates
            if (!a.lastWorkorderDate && !b.lastWorkorderDate) return 0;
            if (!a.lastWorkorderDate) return sortDirection === "asc" ? -1 : 1;
            if (!b.lastWorkorderDate) return sortDirection === "asc" ? 1 : -1;
            
            return sortDirection === "asc" 
              ? new Date(a.lastWorkorderDate).getTime() - new Date(b.lastWorkorderDate).getTime()
              : new Date(b.lastWorkorderDate).getTime() - new Date(a.lastWorkorderDate).getTime();
          } else {
            // For number fields
            return sortDirection === "asc" 
              ? a[sortField] - b[sortField]
              : b[sortField] - a[sortField];
          }
        })
    : [];

  // Render sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  if (locationStats.isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Loading locations...</div>;
  }

  if (locationStats.isError) {
    return <div className="py-10 text-center text-destructive">Error loading locations</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search locations..."
          className="pl-8 w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="rounded-md border">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead 
                  className="w-[50%] cursor-pointer" 
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Name
                    {renderSortIndicator("name")}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-center cursor-pointer" 
                  onClick={() => handleSort("totalWorkorders")}
                >
                  <div className="flex items-center justify-center">
                    Total Workorders
                    {renderSortIndicator("totalWorkorders")}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-center cursor-pointer" 
                  onClick={() => handleSort("openWorkorders")}
                >
                  <div className="flex items-center justify-center">
                    Open Workorders
                    {renderSortIndicator("openWorkorders")}
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer" 
                  onClick={() => handleSort("lastWorkorderDate")}
                >
                  <div className="flex items-center justify-end">
                    Last Workorder Date
                    {renderSortIndicator("lastWorkorderDate")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    {searchTerm ? 'No locations match your search' : 'No locations found'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedAndFilteredLocations.map((location) => (
                  <TableRow key={location.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Link 
                        to={`/locations/${location.id}`} 
                        className="flex items-start space-x-3 font-medium hover:underline"
                      >
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <span>{location.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">{location.totalWorkorders}</TableCell>
                    <TableCell className="text-center">
                      {location.openWorkorders > 0 ? (
                        <Badge variant="secondary" className="mx-auto">
                          {location.openWorkorders}
                        </Badge>
                      ) : (
                        location.openWorkorders
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {location.lastWorkorderDate 
                        ? format(new Date(location.lastWorkorderDate), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
