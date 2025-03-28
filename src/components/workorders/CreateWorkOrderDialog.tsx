
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import WorkOrderForm from './WorkOrderForm';

interface CreateWorkOrderDialogProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  onSuccess: (workOrderId: string) => void;
}

const CreateWorkOrderDialog = ({ isOpen, setIsOpen, onSuccess }: CreateWorkOrderDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Work Order</DialogTitle>
        </DialogHeader>
        <WorkOrderForm onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkOrderDialog;
