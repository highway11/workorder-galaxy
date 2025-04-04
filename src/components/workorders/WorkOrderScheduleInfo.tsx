
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WorkOrderScheduleDisplay } from "./schedule/WorkOrderScheduleDisplay";
import { WorkOrderScheduleDeactivate } from "./schedule/WorkOrderScheduleDeactivate";
import { WorkOrderScheduleMessage } from "./schedule/WorkOrderScheduleMessage";

export interface WorkOrderScheduleInfoProps {
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

interface ScheduleData {
  type: 'has-schedule' | 'from-schedule' | 'no-schedule';
  schedule?: WorkOrderSchedule;
}

const WorkOrderScheduleInfo = ({ workOrderId }: WorkOrderScheduleInfoProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query to get the workorder schedule
  const { data: scheduleData, isLoading, error } = useQuery({
    queryKey: ['workorder-schedule', workOrderId],
    queryFn: async () => {
      // First check if this work order has a schedule
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('workorder_schedules')
        .select('*')
        .eq('workorder_id', workOrderId)
        .limit(1);
      
      if (scheduleError) {
        throw new Error("Failed to fetch schedule data");
      }
      
      const schedule = scheduleData.length > 0 ? scheduleData[0] : null;

      // If there's a schedule, return it
      if (schedule) {
        return { type: 'has-schedule', schedule } as ScheduleData;
      }
      
      // Check if this work order was created from a schedule
      const { data: workorderData, error: workorderError } = await supabase
        .from('workorders')
        .select('parent_schedule_id')
        .eq('id', workOrderId)
        .limit(1);
      
      if (workorderError) {
        throw new Error("Failed to fetch workorder data");
      }
      
      const workorder = workorderData.length > 0 ? workorderData[0] : null;
      
      // If this work order was created from a schedule, fetch that schedule
      if (workorder && workorder.parent_schedule_id) {
        const { data: parentScheduleData, error: parentScheduleError } = await supabase
          .from('workorder_schedules')
          .select('*')
          .eq('id', workorder.parent_schedule_id)
          .limit(1);
        
        if (parentScheduleError) {
          throw new Error("Failed to fetch parent schedule data");
        }
        
        const parentSchedule = parentScheduleData.length > 0 ? parentScheduleData[0] : null;
        
        if (parentSchedule) {
          return { type: 'from-schedule', schedule: parentSchedule } as ScheduleData;
        }
      }
      
      // If no schedule is found
      return { type: 'no-schedule' } as ScheduleData;
    },
    enabled: !!workOrderId
  });
  
  const deactivateScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from('workorder_schedules')
        .update({ active: false })
        .eq('id', scheduleId);
      
      if (error) {
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

  if (!scheduleData.schedule) {
    return null;
  }
  
  const handleDeactivate = () => {
    if (window.confirm("Are you sure you want to deactivate this schedule? This will stop future work orders from being created automatically.")) {
      deactivateScheduleMutation.mutate(scheduleData.schedule!.id);
    }
  };
  
  return (
    <WorkOrderScheduleDisplay
      scheduleData={scheduleData}
      renderDeactivateButton={() => (
        scheduleData.type === 'has-schedule' && scheduleData.schedule?.active && (
          <WorkOrderScheduleDeactivate 
            onDeactivate={handleDeactivate}
            isPending={deactivateScheduleMutation.isPending}
          />
        )
      )}
      renderStatusMessage={() => (
        <WorkOrderScheduleMessage 
          scheduleType={scheduleData.type}
          isActive={scheduleData.schedule?.active}
        />
      )}
    />
  );
};

export default WorkOrderScheduleInfo;
