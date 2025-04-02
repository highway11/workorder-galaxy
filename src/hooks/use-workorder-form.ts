
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGroup } from "@/contexts/GroupContext";

// Schema for work order form validation
const workOrderSchema = z.object({
  item: z.string().min(1, { message: "Item is required" }),
  description: z.string().optional(),
  requestedBy: z.string().min(1, { message: "Requestor is required" }),
  locationId: z.string().min(1, { message: "Location is required" }),
  completeBy: z.date({ required_error: "Complete by date is required" }),
  status: z.enum(["open", "in-progress", "completed", "closed"]),
  glNumber: z.string().optional(),
  groupId: z.string().min(1, { message: "Group is required" }),
});

export type WorkOrderFormValues = z.infer<typeof workOrderSchema>;

export type WorkOrderFormData = {
  locations: { id: string; name: string; group_id: string }[];
  groups: { id: string; name: string }[];
};

export const useWorkOrderForm = (initialData?: Partial<WorkOrderFormValues>) => {
  const { selectedGroupId } = useGroup();
  
  // Set up form with zod resolver
  const form = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      item: initialData?.item || "",
      description: initialData?.description || "",
      requestedBy: initialData?.requestedBy || "",
      locationId: initialData?.locationId || "",
      completeBy: initialData?.completeBy || new Date(),
      status: initialData?.status || "open",
      glNumber: initialData?.glNumber || "",
      groupId: initialData?.groupId || selectedGroupId || "",
    },
  });

  // Fetch locations based on the selected group
  const { data: locations = [], isLoading: isLocationsLoading } = useQuery({
    queryKey: ["locations", form.watch("groupId")],
    queryFn: async () => {
      const groupId = form.watch("groupId");
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, group_id")
        .eq("group_id", groupId)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!form.watch("groupId"),
  });

  // Fetch all groups
  const { data: groups = [], isLoading: isGroupsLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
  });

  return {
    form,
    schema: workOrderSchema,
    formData: {
      locations,
      groups,
    },
    isLoading: isLocationsLoading || isGroupsLoading,
  };
};
