
import { useState } from "react";
import { CalendarIcon, CheckIcon, ClockIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { scheduleTypeNames, scheduleIntervals } from "@/lib/schedule-types";

// Schedule types available for recurring workorders
const scheduleTypes = [
  { id: 'weekly', name: 'Weekly Maintenance', description: 'Every 7 Days' },
  { id: '3-weeks', name: '3 Weeks', description: 'Every 21 Days' },
  { id: 'monthly', name: 'Monthly Maintenance', description: 'Every Month' },
  { id: 'bi-monthly', name: 'Bi-Monthly Maintenance', description: 'Every 2 Months' },
  { id: 'quarterly', name: 'Quarterly Maintenance', description: 'Every 3 Months' },
  { id: 'semi-annual', name: 'Semi Annual Maintenance', description: 'Every 6 Months' },
  { id: 'annual', name: 'Annual Maintenance', description: 'Every Year' },
  { id: 'bi-annual', name: 'Bi-Annual Maintenance', description: 'Every 2 Years' },
  { id: '5-year', name: '5 Year Maintenance', description: 'Every 5 Years' },
  { id: '6-year', name: '6 Year Maintenance', description: 'Every 6 Years' },
];

interface WorkOrderScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workOrderId: string;
}

const WorkOrderScheduleDialog = ({ isOpen, onClose, workOrderId }: WorkOrderScheduleDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scheduleType, setScheduleType] = useState("monthly");
  const [startDate, setStartDate] = useState<Date>(new Date());
  
  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("You must be logged in to create a schedule");
      }
      
      // Use a raw SQL call to the stored procedure instead of typed API
      const { data, error } = await supabase.rpc('create_workorder_schedule', {
        p_workorder_id: workOrderId,
        p_schedule_type: scheduleType,
        p_next_run: startDate.toISOString(),
        p_created_by: user.id
      });
      
      if (error) {
        console.error("Error creating schedule:", error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Schedule Created",
        description: "The workorder has been scheduled to recur automatically.",
      });
      queryClient.invalidateQueries({ queryKey: ['workorder', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['workorder-schedules', workOrderId] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create schedule: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  });
  
  const handleClose = () => {
    if (!createScheduleMutation.isPending) {
      onClose();
    }
  };
  
  const handleCreateSchedule = () => {
    createScheduleMutation.mutate();
  };
  
  const selectedSchedule = scheduleTypes.find(s => s.id === scheduleType);
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Make Work Order Recurring
          </DialogTitle>
          <DialogDescription>
            Set up a schedule to automatically create new copies of this work order.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <Label>Select Recurrence Schedule</Label>
            <RadioGroup 
              value={scheduleType} 
              onValueChange={setScheduleType}
              className="grid gap-4"
            >
              {scheduleTypes.map((schedule) => (
                <div key={schedule.id} className="flex items-center">
                  <RadioGroupItem value={schedule.id} id={schedule.id} className="peer sr-only" />
                  <Label
                    htmlFor={schedule.id}
                    className="flex flex-col justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{schedule.name}</div>
                      <CheckIcon className="h-5 w-5 text-primary opacity-0 peer-data-[state=checked]:opacity-100 [&:has([data-state=checked])]:opacity-100" />
                    </div>
                    <div className="text-sm text-muted-foreground">{schedule.description}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label>First Run Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              This is when the first recurring work order will be created.
            </p>
          </div>
          
          {selectedSchedule && (
            <div className="rounded-md bg-muted p-4">
              <h4 className="font-medium mb-2">Summary</h4>
              <p className="text-sm text-muted-foreground">
                This work order will recur <strong>{selectedSchedule.description.toLowerCase()}</strong>, starting on <strong>{format(startDate, "MMMM d, yyyy")}</strong>.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={createScheduleMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateSchedule} 
            disabled={createScheduleMutation.isPending}
          >
            {createScheduleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Schedule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkOrderScheduleDialog;
