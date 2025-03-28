import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Import our new components
import WorkOrderSearch from '@/components/workorders/WorkOrderSearch';
import WorkOrderTable, { WorkOrder } from '@/components/workorders/WorkOrderTable';
import WorkOrderDeleteDialog from '@/components/workorders/WorkOrderDeleteDialog';
import CreateWorkOrderDialog from '@/components/workorders/CreateWorkOrderDialog';

const WorkOrders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewWorkOrderOpen, setIsNewWorkOrderOpen] = useState(false);
  const [workOrderToDelete, setWorkOrderToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Work Orders | WorkOrder App";
  }, []);

  const { data: workOrders, isLoading, error } = useQuery({
    queryKey: ['workorders'],
    queryFn: async () => {
      console.log("Fetching work orders");
      const { data, error } = await supabase
        .from('workorders')
        .select(`
          id, 
          wo_number,
          item, 
          description, 
          requested_by, 
          location_id,
          location:locations(name),
          date, 
          complete_by, 
          status,
          gl_number
        `)
        .order('wo_number', { ascending: false });
      
      if (error) {
        console.error("Error fetching work orders:", error);
        throw new Error(error.message);
      }
      
      console.log("Fetched work orders:", data);
      return (data || []) as WorkOrder[];
    }
  });

  const deleteWorkOrderMutation = useMutation({
    mutationFn: async (workOrderId: string) => {
      console.log("Deleting work order with ID:", workOrderId);
      
      if (!user) {
        throw new Error("You must be logged in to delete work orders");
      }
      
      // First delete related work order details
      const { error: detailsError } = await supabase
        .from('workorder_details')
        .delete()
        .eq('workorder_id', workOrderId);
      
      if (detailsError) {
        console.error("Error deleting work order details:", detailsError);
        throw new Error(`Error deleting details: ${detailsError.message}`);
      }
      
      console.log("Successfully deleted related details, now deleting work order");
      
      // Then delete the work order
      const { data: deletedWorkOrder, error: workOrderError } = await supabase
        .from('workorders')
        .delete()
        .eq('id', workOrderId)
        .select();
      
      if (workOrderError) {
        console.error("Error deleting work order:", workOrderError);
        throw new Error(`Error deleting work order: ${workOrderError.message}`);
      }
      
      console.log("Successfully deleted work order, returned data:", deletedWorkOrder);
      return workOrderId;
    },
    onSuccess: (deletedId) => {
      console.log("Delete mutation completed successfully for ID:", deletedId);
      queryClient.invalidateQueries({ queryKey: ['workorders'] });
      toast({
        title: "Success!",
        description: "Work order has been deleted.",
      });
      setWorkOrderToDelete(null);
    },
    onError: (error) => {
      console.error("Delete mutation error:", error);
      toast({
        title: "Error",
        description: `Failed to delete work order: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      setWorkOrderToDelete(null);
    }
  });

  // Fix the type mismatch by making the function accept a workOrderId parameter
  const handleNewWorkOrderSuccess = async (workOrderId: string) => {
    setIsNewWorkOrderOpen(false);
    queryClient.invalidateQueries({ queryKey: ['workorders'] });
    
    // Send notification email for the new work order
    try {
      console.log("Sending notification for new work order:", workOrderId);
      const { data, error } = await supabase.functions.invoke('send-workorder-notification', {
        body: { workOrderId },
      });
      
      if (error) {
        console.error("Error sending notification:", error);
        toast({
          title: "Warning",
          description: "Work order created but notification emails could not be sent.",
          variant: "destructive",
        });
      } else {
        console.log("Notification sent successfully:", data);
        toast({
          title: "Success!",
          description: `Work order has been created and notifications sent to ${data.message}.`,
        });
      }
    } catch (err) {
      console.error("Exception sending notification:", err);
      toast({
        title: "Success!",
        description: "Work order has been created but notification emails could not be sent.",
      });
    }
  };

  const handleDeleteClick = (workOrderId: string) => {
    console.log("Delete clicked for work order ID:", workOrderId);
    setWorkOrderToDelete(workOrderId);
  };

  const handleConfirmDelete = () => {
    if (workOrderToDelete) {
      console.log("Confirming deletion of work order ID:", workOrderToDelete);
      deleteWorkOrderMutation.mutate(workOrderToDelete);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold tracking-tight">Work Orders</h1>
            <p className="text-muted-foreground">View and manage all work orders</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Button onClick={() => setIsNewWorkOrderOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Work Order
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <CardTitle>All Work Orders</CardTitle>
                <WorkOrderSearch 
                  searchTerm={searchTerm} 
                  setSearchTerm={setSearchTerm} 
                />
              </div>
            </CardHeader>
            <CardContent>
              <WorkOrderTable 
                workOrders={workOrders || []}
                onDeleteClick={handleDeleteClick}
                isLoading={isLoading}
                error={error instanceof Error ? error : null}
                searchTerm={searchTerm}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <CreateWorkOrderDialog 
        isOpen={isNewWorkOrderOpen}
        setIsOpen={setIsNewWorkOrderOpen}
        onSuccess={handleNewWorkOrderSuccess}
      />

      <WorkOrderDeleteDialog 
        workOrderToDelete={workOrderToDelete}
        onClose={() => setWorkOrderToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </AppLayout>
  );
};

export default WorkOrders;
