
import { Button } from "@/components/ui/button";
import { XCircleIcon } from "lucide-react";

interface WorkOrderScheduleDeactivateProps {
  onDeactivate: () => void;
  isPending: boolean;
}

export const WorkOrderScheduleDeactivate = ({ 
  onDeactivate, 
  isPending 
}: WorkOrderScheduleDeactivateProps) => {
  return (
    <div className="flex justify-end">
      <Button 
        variant="outline" 
        className="text-destructive hover:text-destructive" 
        onClick={onDeactivate}
        disabled={isPending}
      >
        <XCircleIcon className="h-4 w-4 mr-2" />
        {isPending ? "Deactivating..." : "Deactivate Schedule"}
      </Button>
    </div>
  );
};
