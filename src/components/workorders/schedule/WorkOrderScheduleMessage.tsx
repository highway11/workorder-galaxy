
interface WorkOrderScheduleMessageProps {
  scheduleType: 'has-schedule' | 'from-schedule' | 'no-schedule';
  isActive?: boolean;
}

export const WorkOrderScheduleMessage = ({ 
  scheduleType, 
  isActive 
}: WorkOrderScheduleMessageProps) => {
  if (scheduleType === 'has-schedule' && isActive === false) {
    return (
      <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
        This schedule is currently inactive. No new work orders will be created.
      </div>
    );
  }
  
  if (scheduleType === 'from-schedule') {
    return (
      <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
        This work order was automatically created based on a recurring schedule.
      </div>
    );
  }
  
  return null;
};
