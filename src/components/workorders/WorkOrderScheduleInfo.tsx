
import { useQuery } from "@tanstack/react-query";
import { ClockIcon, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { WorkOrderSchedule, scheduleTypeNames, scheduleIntervals } from "@/lib/schedule-types";

interface WorkOrderScheduleInfoProps {
  workOrderId: string;
}

// These interfaces are just for our component's internal use
interface WorkOrderWithScheduleId {
  parent_schedule_id: string | null;
}

interface ParentWorkOrder {
  id: string;
  wo_number: string | null;
}

// This custom wrapper helps us deal with the raw database queries
interface RawWorkOrderScheduleData {
  id: string;
  workorder_id: string;
  schedule_type: string;
  next_run: string;
  created_at: string;
  created_by: string;
  active: boolean;
}

interface RawParentScheduleData extends RawWorkOrderScheduleData {
  parent_workorder: {
    id: string;
    wo_number: string | null;
  };
}

const WorkOrderScheduleInfo = ({ workOrderId }: WorkOrderScheduleInfoProps) => {
  // Fetch schedule information for the current work order
  const { data: schedule, isLoading, error } = useQuery({
    queryKey: ['workorder-schedules', workOrderId],
    queryFn: async () => {
      // Use fetch to directly call the database (bypass typing issues)
      const { data, error } = await supabase.functions.invoke('get-schedule', {
        body: { workorder_id: workOrderId }
      });
      
      if (error) {
        throw error;
      }
      
      if (!data || !data.schedule) {
        return null;
      }
      
      // Cast to our custom interface
      return data.schedule as WorkOrderSchedule;
    },
  });
  
  // Check if this work order was created from a schedule
  const { data: parentSchedule } = useQuery({
    queryKey: ['workorder-parent-schedule', workOrderId],
    queryFn: async () => {
      // Use fetch to directly call the database (bypass typing issues)
      const { data, error } = await supabase.functions.invoke('get-parent-schedule', {
        body: { workorder_id: workOrderId }
      });
      
      if (error || !data || !data.parentSchedule) {
        return null;
      }
      
      // Return the properly typed data
      return {
        ...data.parentSchedule as WorkOrderSchedule,
        parent_workorder: data.parentSchedule.parent_workorder as ParentWorkOrder
      };
    },
    enabled: !!workOrderId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-muted-foreground" />
            Schedule Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    console.error("Error loading schedule information:", error);
    return null;
  }
  
  // If there's no schedule and no parent schedule, don't render anything
  if (!schedule && !parentSchedule) {
    return null;
  }
  
  // Render schedule information if this work order is scheduled to recur
  if (schedule) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-muted-foreground" />
            Schedule Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">
                {scheduleTypeNames[schedule.schedule_type] || 'Recurring Schedule'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {scheduleIntervals[schedule.schedule_type] || 'Custom Schedule'}
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">Recurring</Badge>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>Next run: {format(new Date(schedule.next_run), "MMMM d, yyyy")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render parent schedule information if this was created from a schedule
  if (parentSchedule) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-muted-foreground" />
            Schedule Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">
                Auto-Generated Work Order
              </h3>
              <p className="text-sm text-muted-foreground">
                Created from a {scheduleTypeNames[parentSchedule.schedule_type] || 'recurring'} schedule
              </p>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700">Auto-Generated</Badge>
          </div>
          
          {parentSchedule.parent_workorder && (
            <div className="text-sm">
              <span className="text-muted-foreground">Parent work order: </span>
              <a 
                href={`/workorders/${parentSchedule.parent_workorder.id}`}
                className="text-primary hover:underline"
              >
                {parentSchedule.parent_workorder.wo_number || parentSchedule.parent_workorder.id.substring(0, 8)}
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  return null;
};

export default WorkOrderScheduleInfo;
