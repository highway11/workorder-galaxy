
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardStats() {
  const fetchOpenWorkOrders = async () => {
    const { count, error } = await supabase
      .from("workorders")
      .select("*", { count: "exact", head: true })
      .eq("status", "open");
      
    if (error) {
      console.error("Error fetching open workorders:", error);
      throw error;
    }
    
    return count || 0;
  };
  
  const fetchWorkOrdersThisMonth = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    const { count, error } = await supabase
      .from("workorders")
      .select("*", { count: "exact", head: true })
      .gte("date", startOfMonth)
      .lte("date", endOfMonth);
      
    if (error) {
      console.error("Error fetching monthly workorders:", error);
      throw error;
    }
    
    return count || 0;
  };
  
  const fetchWorkOrdersByLocation = async () => {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).toISOString();
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();
    
    const { data, error } = await supabase
      .from("workorders")
      .select(`
        location_id,
        location:locations(name)
      `)
      .gte("date", startOfYear)
      .lte("date", endOfYear);
      
    if (error) {
      console.error("Error fetching workorders by location:", error);
      throw error;
    }
    
    // Count workorders per location
    const locationCounts: Record<string, number> = {};
    const locationNames: Record<string, string> = {};
    
    data.forEach(workorder => {
      const locationId = workorder.location_id;
      const locationName = workorder.location?.name || "Unknown";
      
      locationCounts[locationId] = (locationCounts[locationId] || 0) + 1;
      locationNames[locationId] = locationName;
    });
    
    // Format data for the chart
    return Object.keys(locationCounts).map(locationId => ({
      name: locationNames[locationId],
      count: locationCounts[locationId]
    }));
  };
  
  const openWorkOrders = useQuery({
    queryKey: ["openWorkOrders"],
    queryFn: fetchOpenWorkOrders
  });
  
  const workOrdersThisMonth = useQuery({
    queryKey: ["workOrdersThisMonth"],
    queryFn: fetchWorkOrdersThisMonth
  });
  
  const workOrdersByLocation = useQuery({
    queryKey: ["workOrdersByLocation"],
    queryFn: fetchWorkOrdersByLocation
  });
  
  return {
    openWorkOrders,
    workOrdersThisMonth,
    workOrdersByLocation
  };
}
