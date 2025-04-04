
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, ClockIcon, XCircleIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getScheduleTypeName } from "@/lib/utils";

interface WorkOrderScheduleInfoProps {
  workOrderId: string;
}

export interface WorkOrderSchedule {
  id: string;
  workorder_id: string;
  schedule_type: string;
  next_run: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const WorkOrderScheduleInfo = ({ workOrderId }: WorkOrderScheduleInfoProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query to get the workorder schedule
  const { data: scheduleData, isLoading, error } = useQuery({
    queryKey: ['workorder-schedule', workOrderId],
    queryFn: async () => {
      // First check if this work order has a schedule using direct query
      const scheduleResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/workorder_schedules?workorder_id=eq.${workOrderId}&select=*&limit=1`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      if (!scheduleResponse.ok) {
        throw new Error("Failed to fetch schedule data");
      }
      
      const scheduleData = await scheduleResponse.json();
      const schedule = scheduleData.length > 0 ? scheduleData[0] : null;

      // If there's a schedule, return it
      if (schedule) {
        return { type: 'has-schedule', schedule };
      }
      
      // Check if this work order was created from a schedule
      const workorderResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/workorders?id=eq.${workOrderId}&select=parent_schedule_id`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      if (!workorderResponse.ok) {
        throw new Error("Failed to fetch workorder data");
      }
      
      const workorderData = await workorderResponse.json();
      const workorder = workorderData.length > 0 ? workorderData[0] : null;
      
      // If this work order was created from a schedule, fetch that schedule
      if (workorder && workorder.parent_schedule_id) {
        const parentScheduleResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/workorder_schedules?id=eq.${workorder.parent_schedule_id}&select=*&limit=1`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json"
            }
          }
        );
        
        if (!parentScheduleResponse.ok) {
          throw new Error("Failed to fetch parent schedule data");
        }
        
        const parentScheduleData = await parentScheduleResponse.json();
        const parentSchedule = parentScheduleData.length > 0 ? parentScheduleData[0] : null;
        
        if (parentSchedule) {
          return { type: 'from-schedule', schedule: parentSchedule };
        }
      }
      
      // If no schedule is found
      return { type: 'no-schedule' };
    },
    enabled: !!workOrderId
  });
  
  const deactivateScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/workorder_schedules?id=eq.${scheduleId}`,
        {
          method: 'PATCH',
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({ active: false })
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to deactivate schedule");
      }
      
      return scheduleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workorder-schedule', workOrderId] });
      toast({
        title: "Schedule Deactivated",
        description: "The work order schedule has been deactivated."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to deactivate schedule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  });
  
  if (isLoading || !scheduleData) {
    return null;
  }
  
  if (error) {
    console.error("Error loading schedule info:", error);
    return null;
  }
  
  if (scheduleData.type === 'no-schedule') {
    return null;
  }
  
  const schedule = scheduleData.schedule as WorkOrderSchedule;
  const isFromSchedule = scheduleData.type === 'from-schedule';
  const isHasSchedule = scheduleData.type === 'has-schedule';
  
  const handleDeactivate = () => {
    if (window.confirm("Are you sure you want to deactivate this schedule? This will stop future work orders from being created automatically.")) {
      deactivateScheduleMutation.mutate(schedule.id);
    }
  };
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center">
          <ClockIcon className="h-5 w-5 mr-2 text-muted-foreground" />
          {isFromSchedule ? "Created from Schedule" : "Recurring Schedule"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Schedule Type</p>
            <p>{getScheduleTypeName(schedule.schedule_type)}</p>
          </div>
        </div>
        
        {isHasSchedule && (
          <div className="flex items-start gap-3">
            <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Next Creation Date</p>
              <p>{format(new Date(schedule.next_run), 'PPP')}</p>
            </div>
          </div>
        )}
        
        {isHasSchedule && schedule.active && (
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              className="text-destructive hover:text-destructive" 
              onClick={handleDeactivate}
              disabled={deactivateScheduleMutation.isPending}
            >
              <XCircleIcon className="h-4 w-4 mr-2" />
              {deactivateScheduleMutation.isPending ? "Deactivating..." : "Deactivate Schedule"}
            </Button>
          </div>
        )}
        
        {isHasSchedule && !schedule.active && (
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
            This schedule is currently inactive. No new work orders will be created.
          </div>
        )}
        
        {isFromSchedule && (
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
            This work order was automatically created based on a recurring schedule.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkOrderScheduleInfo;
