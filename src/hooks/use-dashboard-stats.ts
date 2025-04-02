
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGroup } from "@/contexts/GroupContext";

export const useDashboardStats = () => {
  const { selectedGroupId } = useGroup();

  // Fetch work orders statistics (counts by status)
  const workOrdersStats = useQuery({
    queryKey: ["workorder-stats", selectedGroupId],
    queryFn: async () => {
      const { count: total, error: totalError } = await supabase
        .from("workorders")
        .select("*", { count: "exact", head: true })
        .eq(selectedGroupId ? "group_id" : "id", selectedGroupId || "id");
      
      if (totalError) throw totalError;
      
      const statuses = ["open", "in-progress", "completed", "closed"];
      const statusCounts: Record<string, number> = {};
      
      for (const status of statuses) {
        let query = supabase
          .from("workorders")
          .select("*", { count: "exact", head: true })
          .eq("status", status);
        
        if (selectedGroupId) {
          query = query.eq("group_id", selectedGroupId);
        }
        
        const { count, error } = await query;
        
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
      let locationsQuery = supabase.from("locations").select("id, name, group_id");
      
      if (selectedGroupId) {
        locationsQuery = locationsQuery.eq("group_id", selectedGroupId);
      }
      
      const { data: locations, error: locationsError } = await locationsQuery;
        
      if (locationsError) throw locationsError;
      
      const locationStats = await Promise.all(
        (locations || []).map(async (location) => {
          // Get total work orders for this location
          let totalQuery = supabase
            .from("workorders")
            .select("*", { count: "exact", head: true })
            .eq("location_id", location.id);
            
          if (selectedGroupId) {
            totalQuery = totalQuery.eq("group_id", selectedGroupId);
          }
          
          const { count: totalWorkorders, error: totalError } = await totalQuery;
          
          if (totalError) throw totalError;
          
          // Get open work orders for this location
          let openQuery = supabase
            .from("workorders")
            .select("*", { count: "exact", head: true })
            .eq("location_id", location.id)
            .eq("status", "open");
            
          if (selectedGroupId) {
            openQuery = openQuery.eq("group_id", selectedGroupId);
          }
          
          const { count: openWorkorders, error: openError } = await openQuery;
          
          if (openError) throw openError;
          
          // Get latest work order date for this location
          let latestQuery = supabase
            .from("workorders")
            .select("created_at")
            .eq("location_id", location.id)
            .order("created_at", { ascending: false })
            .limit(1);
            
          if (selectedGroupId) {
            latestQuery = latestQuery.eq("group_id", selectedGroupId);
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
      let query = supabase
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
        query = query.eq("group_id", selectedGroupId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate open work orders count (derived from workOrdersStats)
  const openWorkOrdersCount = workOrdersStats.data?.open || 0;

  // Calculate work orders this month
  const workOrdersThisMonthQuery = useQuery({
    queryKey: ["workorders-this-month", selectedGroupId],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      
      let query = supabase
        .from("workorders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth);
        
      if (selectedGroupId) {
        query = query.eq("group_id", selectedGroupId);
      }
      
      const { count, error } = await query;
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Extract work orders by location data for the chart
  // Map the data to match the expected LocationData format with 'name' and 'count' properties
  const workOrdersByLocationData = locationStats.data 
    ? locationStats.data.map(location => ({
        name: location.name,
        count: location.totalWorkorders
      }))
    : [];

  return {
    workOrdersStats,
    locationStats,
    recentWorkOrders,
    // Convenience properties to match what Index.tsx is expecting
    openWorkOrders: {
      data: openWorkOrdersCount,
      isLoading: workOrdersStats.isLoading,
      error: workOrdersStats.error
    },
    workOrdersThisMonth: workOrdersThisMonthQuery,
    workOrdersByLocation: {
      data: workOrdersByLocationData,
      isLoading: locationStats.isLoading,
      error: locationStats.error
    }
  };
};

export default useDashboardStats;
