
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, FileTextIcon, MapPinIcon, UserIcon, TagIcon } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

type WorkOrderStatus = 'open' | 'in-progress' | 'completed';

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
};

const WorkOrderDetail = () => {
  const { id } = useParams<{ id: string }>();

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
          gl_number
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        console.error("Error fetching work order:", error);
        throw error;
      }
      
      // Only cast to WorkOrder if we have valid data
      if (data) {
        return data as WorkOrder;
      }
      
      throw new Error("Work order not found");
    },
    enabled: !!id,
  });

  const getStatusColor = (status: WorkOrderStatus) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'in-progress':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
      case 'completed':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
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
      <div className="space-y-8">
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
      </div>
    </AppLayout>
  );
};

export default WorkOrderDetail;
