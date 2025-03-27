
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit {detail.detail_type}</DialogTitle>
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
