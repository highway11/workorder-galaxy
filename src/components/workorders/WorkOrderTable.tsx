
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Trash2, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WorkOrderStatusBadge from './WorkOrderStatusBadge';
import { useIsMobile } from '@/hooks/use-mobile';

export type WorkOrderStatus = 'open' | 'in-progress' | 'completed' | 'closed';

export type WorkOrder = {
  id: string;
  wo_number: string | null;
  item: string;
  description: string | null;
  requested_by: string;
  location_id: string;
  location: {
    name: string;
  };
  date: string;
  complete_by: string;
  status: WorkOrderStatus;
  gl_number: string | null;
  parent_schedule_id?: string | null;
};

interface WorkOrderTableProps {
  workOrders: WorkOrder[];
  onDeleteClick: (id: string) => void;
  isLoading: boolean;
  error: Error | null;
  searchTerm: string;
}

const WorkOrderTable = ({ 
  workOrders, 
  onDeleteClick, 
  isLoading, 
  error,
  searchTerm 
}: WorkOrderTableProps) => {
  const isMobile = useIsMobile();
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');  
    } catch (error) {
      console.error("Invalid date:", dateString);
      return dateString;
    }
  };

  const filteredWorkOrders = workOrders?.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (order.wo_number?.toLowerCase().includes(searchLower) || false) ||
      order.id.toLowerCase().includes(searchLower) ||
      order.item.toLowerCase().includes(searchLower) ||
      order.description?.toLowerCase().includes(searchLower) ||
      order.requested_by.toLowerCase().includes(searchLower) ||
      order.location.name.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return <div className="py-10 text-center">Loading work orders...</div>;
  }

  if (error) {
    return (
      <div className="py-10 text-center text-red-500">
        Error loading work orders: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  if (!filteredWorkOrders || filteredWorkOrders.length === 0) {
    return (
      <div className="py-10 text-center">
        {searchTerm ? "No work orders matching your search" : "No work orders found"}
      </div>
    );
  }

  // Mobile optimized table view
  if (isMobile) {
    return (
      <div className="w-full space-y-4 px-4">
        {filteredWorkOrders.map((order) => (
          <div 
            key={order.id} 
            className="p-4 border rounded-md shadow-sm bg-white w-full"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-1">
                <Link 
                  to={`/workorders/${order.id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {order.wo_number || order.id.substring(0, 8)}
                </Link>
                {order.parent_schedule_id && (
                  <Repeat className="h-4 w-4 text-blue-500" title="Recurring work order" />
                )}
              </div>
              <WorkOrderStatusBadge status={order.status} />
            </div>
            
            <div className="space-y-1 text-sm mb-3">
              <p className="font-medium">{order.item}</p>
              <p className="text-muted-foreground">{order.location.name}</p>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  Due: {formatDate(order.complete_by)}
                </span>
                <span className="text-xs text-muted-foreground">
                  By: {order.requested_by}
                </span>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onDeleteClick(order.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="rounded-md border w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Work Order #</TableHead>
            <TableHead>Item</TableHead>
            <TableHead className="hidden md:table-cell">Location</TableHead>
            <TableHead className="hidden lg:table-cell">Requested By</TableHead>
            <TableHead className="hidden lg:table-cell">Created</TableHead>
            <TableHead>Due By</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredWorkOrders.map((order) => (
            <TableRow key={order.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">
                <div className="flex items-center gap-1">
                  <Link 
                    to={`/workorders/${order.id}`}
                    className="text-primary hover:underline"
                  >
                    {order.wo_number || order.id.substring(0, 8)}
                  </Link>
                  {order.parent_schedule_id && (
                    <Repeat className="h-4 w-4 text-blue-500" title="Recurring work order" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{order.item}</span>
                  <span className="text-xs text-muted-foreground md:hidden">
                    {order.location.name}
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">{order.location.name}</TableCell>
              <TableCell className="hidden lg:table-cell">{order.requested_by}</TableCell>
              <TableCell className="hidden lg:table-cell">{formatDate(order.date)}</TableCell>
              <TableCell>{formatDate(order.complete_by)}</TableCell>
              <TableCell>
                <WorkOrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDeleteClick(order.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default WorkOrderTable;
