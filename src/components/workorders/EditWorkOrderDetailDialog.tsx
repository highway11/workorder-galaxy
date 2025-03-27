
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkOrderDetail } from "./WorkOrderDetailsList";
import WorkOrderDetailForm from "./WorkOrderDetailForm";

interface EditWorkOrderDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  detail: WorkOrderDetail | null;
  workOrderId: string;
}

const EditWorkOrderDetailDialog = ({
  isOpen,
  onClose,
  detail,
  workOrderId,
}: EditWorkOrderDetailDialogProps) => {
  if (!detail) return null;

  // Use a controlled pattern for the dialog and ensure proper cleanup
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit {detail.detail_type}</DialogTitle>
          <DialogDescription>
            Make changes to the {detail.detail_type.toLowerCase()} details below.
          </DialogDescription>
        </DialogHeader>
        <WorkOrderDetailForm 
          workOrderId={workOrderId} 
          detailType={detail.detail_type as any} 
          onClose={onClose}
          editMode={true}
          detailToEdit={detail}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditWorkOrderDetailDialog;
