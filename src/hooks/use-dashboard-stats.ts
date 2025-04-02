
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGroup } from "@/contexts/GroupContext";

export function useDashboardStats() {
  const { selectedGroupId } = useGroup();

  // Query to fetch count of work orders by status
  const workOrdersStats = useQuery({
    queryKey: ["workOrdersStats", selectedGroupId],
    queryFn: async () => {
      const query = supabase
        .from("workorders")
        .select("status", { count: "exact" });
      
      // Filter by selected group if any
      if (selectedGroupId) {
        query.eq("group_id", selectedGroupId);
      }
        
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Count by status
      const stats = {
        total: count || 0,
        open: 0,
        "in-progress": 0,
        completed: 0,
        closed: 0
      };
      
      data?.forEach(item => {
        if (stats.hasOwnProperty(item.status)) {
          stats[item.status as keyof typeof stats] += 1;
        }
      });
      
      return stats;
    }
  });

  // Query to fetch stats for locations
  const locationStats = useQuery({
    queryKey: ["locationStats", selectedGroupId],
    queryFn: async () => {
      // First, get all locations
      const { data: locations, error: locError } = await supabase
        .from("locations")
        .select("id, name, group_id");
        
      if (locError) throw locError;
      
      // For each location, get work order counts
      const locationPromises = locations.map(async location => {
        let query = supabase
          .from("workorders")
          .select("id, status, date", { count: "exact" })
          .eq("location_id", location.id);
          
        // Filter by selected group if any
        if (selectedGroupId) {
          query.eq("group_id", selectedGroupId);
        }
        
        const { data: workorders, count } = await query;
        
        // Get count of open work orders
        const openWorkorders = workorders?.filter(wo => 
          wo.status === "open" || wo.status === "in-progress"
        ).length || 0;
        
        // Get the date of the most recent work order
        let lastWorkorderDate = null;
        if (workorders && workorders.length > 0) {
          // Sort by date descending
          workorders.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          lastWorkorderDate = workorders[0].date;
        }
        
        return {
          id: location.id,
          name: location.name,
          group_id: location.group_id,
          totalWorkorders: count || 0,
          openWorkorders,
          lastWorkorderDate
        };
      });
      
      const locationStatsData = await Promise.all(locationPromises);
      
      // If we have a selected group, filter the locations
      return selectedGroupId 
        ? locationStatsData.filter(loc => loc.group_id === selectedGroupId)
        : locationStatsData;
    }
  });

  // Query to fetch recent work orders
  const recentWorkOrders = useQuery({
    queryKey: ["recentWorkOrders", selectedGroupId],
    queryFn: async () => {
      let query = supabase
        .from("workorders")
        .select(`
          id,
          wo_number,
          item,
          status,
          date,
          location:locations(name)
        `)
        .order("date", { ascending: false })
        .limit(5);
        
      // Filter by selected group if any
      if (selectedGroupId) {
        query.eq("group_id", selectedGroupId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });

  return {
    workOrdersStats,
    locationStats,
    recentWorkOrders
  };
}
