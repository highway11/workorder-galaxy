
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClockIcon, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { getScheduleTypeName } from "@/lib/utils";
import type { WorkOrderSchedule } from "../WorkOrderScheduleInfo";

interface ScheduleData {
  type: 'has-schedule' | 'from-schedule' | 'no-schedule';
  schedule?: WorkOrderSchedule;
}

interface WorkOrderScheduleDisplayProps {
  scheduleData: ScheduleData;
  renderDeactivateButton: () => React.ReactNode;
  renderStatusMessage: () => React.ReactNode;
}

export const WorkOrderScheduleDisplay = ({ 
  scheduleData, 
  renderDeactivateButton,
  renderStatusMessage
}: WorkOrderScheduleDisplayProps) => {
  const { schedule, type } = scheduleData;
  const isFromSchedule = type === 'from-schedule';
  const isHasSchedule = type === 'has-schedule';
  
  if (!schedule) return null;

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
        
        {renderDeactivateButton()}
        {renderStatusMessage()}
      </CardContent>
    </Card>
  );
};
