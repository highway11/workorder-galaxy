
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGroup } from "@/contexts/GroupContext";

export const useDashboardStats = () => {
  const { selectedGroupId } = useGroup();

  // Fetch work orders statistics (counts by status)
  const workOrdersStats = useQuery({
    queryKey: ["workorder-stats", selectedGroupId],
    queryFn: async () => {
      const queryBuilder = supabase
        .from("workorders")
        .select("status, count")
        .select("status", { count: "exact" });
      
      if (selectedGroupId) {
        queryBuilder.eq("group_id", selectedGroupId);
      }
      
      const { count: total, error: totalError } = await queryBuilder;
      
      if (totalError) throw totalError;
      
      const statuses = ["open", "in-progress", "completed", "closed"];
      const statusCounts: Record<string, number> = {};
      
      for (const status of statuses) {
        const queryBuilder = supabase
          .from("workorders")
          .select("id", { count: "exact" })
          .eq("status", status);
        
        if (selectedGroupId) {
          queryBuilder.eq("group_id", selectedGroupId);
        }
        
        const { count, error } = await queryBuilder;
        
        if (error) throw error;
        statusCounts[status] = count || 0;
      }
      
      return {
        total: total || 0,
        open: statusCounts.open || 0,
        "in-progress": statusCounts["in-progress"] || 0,
        completed: statusCounts.completed || 0,
        closed: statusCounts.closed || 0,
      };
    },
  });

  // Get locations with most open work orders
  const locationStats = useQuery({
    queryKey: ["location-stats", selectedGroupId],
    queryFn: async () => {
      const { data: locations, error: locationsError } = await supabase
        .from("locations")
        .select("id, name, group_id");
        
      if (locationsError) throw locationsError;
      
      let filteredLocations = locations;
      if (selectedGroupId) {
        filteredLocations = locations.filter(location => location.group_id === selectedGroupId);
      }
      
      const locationStats = await Promise.all(
        filteredLocations.map(async (location) => {
          // Get total work orders for this location
          const totalQuery = supabase
            .from("workorders")
            .select("id", { count: "exact" })
            .eq("location_id", location.id);
            
          if (selectedGroupId) {
            totalQuery.eq("group_id", selectedGroupId);
          }
          
          const { count: totalWorkorders, error: totalError } = await totalQuery;
          
          if (totalError) throw totalError;
          
          // Get open work orders for this location
          const openQuery = supabase
            .from("workorders")
            .select("id", { count: "exact" })
            .eq("location_id", location.id)
            .eq("status", "open");
            
          if (selectedGroupId) {
            openQuery.eq("group_id", selectedGroupId);
          }
          
          const { count: openWorkorders, error: openError } = await openQuery;
          
          if (openError) throw openError;
          
          // Get latest work order date for this location
          const latestQuery = supabase
            .from("workorders")
            .select("created_at")
            .eq("location_id", location.id)
            .order("created_at", { ascending: false })
            .limit(1);
            
          if (selectedGroupId) {
            latestQuery.eq("group_id", selectedGroupId);
          }
          
          const { data: latestWorkorder, error: latestError } = await latestQuery;
          
          if (latestError) throw latestError;
          
          return {
            id: location.id,
            name: location.name,
            group_id: location.group_id,
            totalWorkorders: totalWorkorders || 0,
            openWorkorders: openWorkorders || 0,
            lastWorkorderDate: latestWorkorder?.[0]?.created_at || null,
          };
        })
      );
      
      // Sort by total work orders, descending
      return locationStats.sort((a, b) => b.totalWorkorders - a.totalWorkorders);
    },
  });

  // Get recent work orders
  const recentWorkOrders = useQuery({
    queryKey: ["recent-workorders", selectedGroupId],
    queryFn: async () => {
      const queryBuilder = supabase
        .from("workorders")
        .select(`
          id,
          wo_number,
          item,
          status,
          created_at,
          locations (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5);
        
      if (selectedGroupId) {
        queryBuilder.eq("group_id", selectedGroupId);
      }
      
      const { data, error } = await queryBuilder;
      
      if (error) throw error;
      return data;
    },
  });

  return {
    workOrdersStats,
    locationStats,
    recentWorkOrders,
  };
};

export default useDashboardStats;
