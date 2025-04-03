import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, FileTextIcon, MapPinIcon, UserIcon, TagIcon, ClockIcon, PlusCircle, CalculatorIcon } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatCurrency, invalidateWorkOrderQueries } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import WorkOrderEditForm from "./WorkOrderEditForm";
import WorkOrderDetailButtons, { DetailType } from "./WorkOrderDetailButtons";
import WorkOrderDetailForm from "./WorkOrderDetailForm";
import WorkOrderDetailsList from "./WorkOrderDetailsList";

type WorkOrderStatus = 'open' | 'in-progress' | 'completed' | 'closed';

type WorkOrder = {
  id: string;
  wo_number: string | null;
  item: string;
  description: string | null;
  requested_by: string;
  location: {
    name: string;
  };
  group: {
    name: string;
  };
  date: string;
  complete_by: string;
  status: WorkOrderStatus;
  gl_number: string | null;
  closed_on: string | null;
};

type WorkOrderDetail = {
  id: string;
  workorder_id: string;
  detail_type: DetailType;
  hours: number | null;
  amount: number | null;
};

const WorkOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [closeDate, setCloseDate] = useState<Date>(new Date());
  const [activeDetailType, setActiveDetailType] = useState<DetailType | null>(null);

  const { data: workOrder, isLoading, error } = useQuery({
    queryKey: ['workorder', id],
    queryFn: async () => {
      if (!id) throw new Error("Work Order ID is required");
      
      const { data, error } = await supabase
        .from('workorders')
        .select(`
          id, 
          wo_number,
          item, 
          description, 
          requested_by, 
          location:locations(name),
          group:groups(name),
          date, 
          complete_by, 
          status,
          gl_number,
          closed_on
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        console.error("Error fetching work order:", error);
        throw error;
      }
      
      if (data) {
        return data as WorkOrder;
      }
      
      throw new Error("Work order not found");
    },
    enabled: !!id,
  });

  const { data: workOrderTotals, isLoading: isTotalsLoading } = useQuery({
    queryKey: ['workorder-totals', id],
    queryFn: async () => {
      if (!id) throw new Error("Work Order ID is required");
      
      console.log("Fetching work order totals for ID:", id);
      
      const { data, error } = await supabase
        .from('workorder_details')
        .select('id, workorder_id, detail_type, hours, amount')
        .eq('workorder_id', id);
      
      if (error) {
        console.error("Error fetching work order details for totals:", error);
        throw error;
      }
      
      const details = data as WorkOrderDetail[];
      let totalHours = 0;
      let totalParts = 0;
      
      details.forEach(detail => {
        if (detail.detail_type === 'Hours' && detail.hours) {
          totalHours += Number(detail.hours);
        }
        if (detail.detail_type === 'Parts' && detail.amount) {
          totalParts += Number(detail.amount);
        }
      });
      
      return {
        totalHours,
        totalParts,
        details: details.length
      };
    },
    enabled: !!id,
    staleTime: 0,
  });

  const closeWorkOrderMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Work Order ID is required");
      
      console.log("Closing work order with status: closed");
      
      const { error } = await supabase
        .from('workorders')
        .update({
          status: 'closed',
          closed_on: closeDate.toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error("Update error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      invalidateWorkOrderQueries(queryClient, id || '');
      setIsCloseDialogOpen(false);
      toast({
        title: "Work Order Closed",
        description: "The work order has been successfully closed.",
      });
    },
    onError: (error) => {
      console.error("Error closing work order:", error);
      toast({
        title: "Error",
        description: "Failed to close the work order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reopenWorkOrderMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Work Order ID is required");
      
      console.log("Reopening work order with ID:", id);
      
      const { error } = await supabase
        .from('workorders')
        .update({
          status: 'open',
          closed_on: null
        })
        .eq('id', id);
      
      if (error) {
        console.error("Reopen error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      invalidateWorkOrderQueries(queryClient, id || '');
      toast({
        title: "Work Order Reopened",
        description: "The work order has been successfully reopened.",
      });
    },
    onError: (error) => {
      console.error("Error reopening work order:", error);
      toast({
        title: "Error",
        description: "Failed to reopen the work order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCloseWorkOrder = () => {
    closeWorkOrderMutation.mutate();
  };

  const handleReopenWorkOrder = () => {
    reopenWorkOrderMutation.mutate();
  };

  const handleAddDetail = (type: DetailType) => {
    setActiveDetailType(type);
  };

  const handleCloseDetailForm = () => {
    setActiveDetailType(null);
  };

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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd');
    } catch (error) {
      console.error("Invalid date:", dateString);
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Work Order</h2>
          <p>{error instanceof Error ? error.message : "Unknown error occurred"}</p>
        </div>
      </AppLayout>
    );
  }

  if (!workOrder) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Work Order Not Found</h2>
          <p>The requested work order could not be found.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-8 w-full px-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-sm font-normal">
                {workOrder.wo_number || workOrder.id.substring(0, 8)}
              </Badge>
              <Badge 
                variant="secondary" 
                className={getStatusColor(workOrder.status)}
              >
                {formatStatus(workOrder.status)}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold">{workOrder.item}</h1>
          </div>
          <div className="flex gap-2">
            {workOrder.status === 'closed' ? (
              <Button 
                onClick={handleReopenWorkOrder}
                disabled={reopenWorkOrderMutation.isPending}
                variant="secondary"
              >
                {reopenWorkOrderMutation.isPending ? "Reopening..." : "Re-open Work Order"}
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => setIsEditDialogOpen(true)}
                  variant="outline"
                >
                  Edit
                </Button>
                <Button 
                  onClick={() => setIsCloseDialogOpen(true)}
                  variant="secondary"
                >
                  Close Work Order
                </Button>
              </>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <TagIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Work Order #</p>
                  <p>{workOrder.wo_number || workOrder.id.substring(0, 8)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <UserIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Requested By</p>
                  <p>{workOrder.requested_by}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPinIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <p>{workOrder.location.name}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <FileTextIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p>{workOrder.group.name}</p>
                </div>
              </div>
              
              {workOrder.gl_number && (
                <div className="flex items-start gap-3">
                  <TagIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">G.L. #</p>
                    <p>{workOrder.gl_number}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created On</p>
                  <p>{formatDate(workOrder.date)}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Due By</p>
                  <p>{formatDate(workOrder.complete_by)}</p>
                </div>
              </div>

              {workOrder.closed_on && (
                <div className="flex items-start gap-3">
                  <ClockIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Closed On</p>
                    <p>{formatDate(workOrder.closed_on)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {workOrder.description && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{workOrder.description}</p>
            </CardContent>
          </Card>
        )}

        {workOrderTotals && (workOrderTotals.totalHours > 0 || workOrderTotals.totalParts > 0) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center">
                <CalculatorIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                Totals
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {workOrderTotals.totalHours > 0 && (
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-semibold">{workOrderTotals.totalHours}</p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-blue-500" />
                </div>
              )}
              
              {workOrderTotals.totalParts > 0 && (
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Parts</p>
                    <p className="text-2xl font-semibold">{formatCurrency(workOrderTotals.totalParts)}</p>
                  </div>
                  <TagIcon className="h-8 w-8 text-green-500" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Work Order Details</h2>
            {workOrder.status !== 'closed' && (
              <WorkOrderDetailButtons onAddDetail={handleAddDetail} />
            )}
          </div>
          
          {activeDetailType && workOrder.status !== 'closed' && (
            <Card>
              <CardContent className="p-0">
                <WorkOrderDetailForm 
                  workOrderId={workOrder.id} 
                  detailType={activeDetailType} 
                  onClose={handleCloseDetailForm} 
                />
              </CardContent>
            </Card>
          )}
          
          <WorkOrderDetailsList workOrderId={workOrder.id} />
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Work Order</DialogTitle>
          </DialogHeader>
          {workOrder && (
            <WorkOrderEditForm 
              workOrder={workOrder} 
              onSuccess={() => {
                setIsEditDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['workorder', id] });
                toast({
                  title: "Work Order Updated",
                  description: "The work order has been successfully updated.",
                });
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Work Order</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Please select the date when this work order was completed:</p>
            <div className="flex flex-col space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !closeDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {closeDate ? format(closeDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={closeDate}
                    onSelect={(date) => date && setCloseDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCloseWorkOrder}
              disabled={closeWorkOrderMutation.isPending}
            >
              {closeWorkOrderMutation.isPending ? "Closing..." : "Close Work Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default WorkOrderDetail;
