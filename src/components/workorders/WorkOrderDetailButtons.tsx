
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DetailType = "Comment" | "Hours" | "Parts" | "File";

interface WorkOrderDetailButtonsProps {
  onAddDetail: (type: DetailType) => void;
}

const WorkOrderDetailButtons = ({ onAddDetail }: WorkOrderDetailButtonsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={() => onAddDetail("Comment")}
        className="flex items-center"
      >
        <Plus className="mr-1 h-4 w-4" />
        Add Comment
      </Button>
      
      <Button
        variant="outline"
        onClick={() => onAddDetail("Hours")}
        className="flex items-center"
      >
        <Plus className="mr-1 h-4 w-4" />
        Add Hours
      </Button>
      
      <Button
        variant="outline"
        onClick={() => onAddDetail("Parts")}
        className="flex items-center"
      >
        <Plus className="mr-1 h-4 w-4" />
        Add Parts
      </Button>
      
      <Button
        variant="outline"
        onClick={() => onAddDetail("File")}
        className="flex items-center"
      >
        <Plus className="mr-1 h-4 w-4" />
        Add File
      </Button>
    </div>
  );
};

export default WorkOrderDetailButtons;
