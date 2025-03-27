
import { Badge } from '@/components/ui/badge';

type WorkOrderStatus = 'open' | 'in-progress' | 'completed' | 'closed';

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus;
}

const WorkOrderStatusBadge = ({ status }: WorkOrderStatusBadgeProps) => {
  const getStatusColor = (status: WorkOrderStatus) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'in-progress':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
      case 'completed':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'closed':
        return 'bg-slate-100 text-slate-800 hover:bg-slate-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const formatStatus = (status: WorkOrderStatus) => {
    switch (status) {
      case 'open':
        return 'Open';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'closed':
        return 'Closed';
      default:
        return status;
    }
  };

  return (
    <Badge variant="secondary" className={getStatusColor(status)}>
      {formatStatus(status)}
    </Badge>
  );
};

export default WorkOrderStatusBadge;
