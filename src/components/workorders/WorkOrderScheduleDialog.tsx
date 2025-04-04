
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
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>('monthly');
  const queryClient = useQueryClient();
  
  const createScheduleMutation = useMutation({
    mutationFn: async (scheduleType: string) => {
      // Calculate next run date based on schedule type
      const now = new Date();
      let nextRun = new Date(now);
      
      switch (scheduleType) {
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case '3week':
          nextRun.setDate(nextRun.getDate() + 21);
          break;
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
        case 'bimonthly':
          nextRun.setMonth(nextRun.getMonth() + 2);
          break;
        case 'quarterly':
          nextRun.setMonth(nextRun.getMonth() + 3);
          break;
        case 'semiannual':
          nextRun.setMonth(nextRun.getMonth() + 6);
          break;
        case 'annual':
          nextRun.setFullYear(nextRun.getFullYear() + 1);
          break;
        case 'biannual':
          nextRun.setFullYear(nextRun.getFullYear() + 2);
          break;
        case '5year':
          nextRun.setFullYear(nextRun.getFullYear() + 5);
          break;
        case '6year':
          nextRun.setFullYear(nextRun.getFullYear() + 6);
          break;
        default:
          nextRun.setMonth(nextRun.getMonth() + 1);
      }
      
      // Insert directly into workorder_schedules table
      const { data, error } = await supabase
        .from('workorder_schedules')
        .insert([{
          workorder_id: workOrderId,
          schedule_type: scheduleType,
          next_run: nextRun.toISOString(),
          active: true
        }])
        .select();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workorder-schedule', workOrderId] });
      
      toast({
        title: "Schedule Created",
        description: "This work order will now be automatically recreated on schedule."
      });
      onSuccess();
      onClose();
    },
    onError: (error) => {
      console.error("Error creating schedule:", error);
      toast({
        title: "Error",
        description: `Failed to create schedule: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    if (!selectedType) {
      toast({
        title: "Selection Required",
        description: "Please select a schedule type",
        variant: "destructive"
      });
      return;
    }
    
    createScheduleMutation.mutate(selectedType);
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
              value={selectedType}
              onValueChange={setSelectedType}
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
          <Button onClick={handleSubmit} disabled={createScheduleMutation.isPending || !selectedType}>
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
