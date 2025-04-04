
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getScheduleTypes } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface WorkOrderScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workOrderId: string;
  onSuccess: () => void;
}

const WorkOrderScheduleDialog = ({ isOpen, onClose, workOrderId, onSuccess }: WorkOrderScheduleDialogProps) => {
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createScheduleMutation = useMutation({
    mutationFn: async (scheduleType: string) => {
      if (!workOrderId) {
        throw new Error("Work order ID is required");
      }
      
      console.log(`Creating schedule for work order ${workOrderId} with type ${scheduleType}`);
      
      // Use a raw POST request instead of the RPC method since the TypeScript definitions weren't updated
      const { data, error } = await supabase.functions.invoke('create-workorder-schedule', {
        body: {
          workorderId: workOrderId,
          scheduleType: scheduleType
        }
      });
      
      if (error) {
        console.error("Error creating work order schedule:", error);
        throw new Error(`Failed to create schedule: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: (scheduleId) => {
      console.log("Schedule created successfully:", scheduleId);
      queryClient.invalidateQueries({ queryKey: ['workorder', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['workorder-schedule', workOrderId] });
      toast({
        title: "Schedule Created",
        description: "The work order has been scheduled for recurring creation."
      });
      onSuccess();
      onClose();
    },
    onError: (error) => {
      console.error("Error in create schedule mutation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while creating the schedule",
        variant: "destructive"
      });
    }
  });
  
  const handleSubmit = () => {
    if (!selectedSchedule) {
      toast({
        title: "Selection Required",
        description: "Please select a schedule type",
        variant: "destructive"
      });
      return;
    }
    
    createScheduleMutation.mutate(selectedSchedule);
  };
  
  const scheduleOptions = getScheduleTypes();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make Work Order Recurring</DialogTitle>
          <DialogDescription>
            Select how often this work order should be automatically recreated.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schedule-select">Select Schedule Type</Label>
            <Select
              value={selectedSchedule}
              onValueChange={setSelectedSchedule}
            >
              <SelectTrigger id="schedule-select" className="w-full">
                <SelectValue placeholder="Select a schedule type" />
              </SelectTrigger>
              <SelectContent>
                {scheduleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Next creation date will be calculated based on the selected schedule.</p>
            <p className="mt-2">Note: This will create a new schedule that will automatically create copies of this work order at the specified interval.</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createScheduleMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createScheduleMutation.isPending || !selectedSchedule}>
            {createScheduleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : "Create Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkOrderScheduleDialog;
