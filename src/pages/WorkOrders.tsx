
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Calendar, User, MapPin, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import WorkOrderForm from '@/components/workorders/WorkOrderForm';

type WorkOrderStatus = 'open' | 'in-progress' | 'completed';

type WorkOrder = {
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
};

const WorkOrders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewWorkOrderOpen, setIsNewWorkOrderOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "Work Orders | WorkOrder App";
  }, []);

  const { data: workOrders, isLoading, error } = useQuery({
    queryKey: ['workorders'],
    queryFn: async () => {
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
        .order('date', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data as WorkOrder[];
    }
  });

  const handleNewWorkOrderSuccess = () => {
    setIsNewWorkOrderOpen(false);
    queryClient.invalidateQueries({ queryKey: ['workorders'] });
    toast({
      title: "Success!",
      description: "Work order has been created.",
    });
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
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search work orders..."
                      className="pl-8 w-full sm:w-[260px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-10 text-center">Loading work orders...</div>
              ) : error ? (
                <div className="py-10 text-center text-red-500">
                  Error loading work orders: {error instanceof Error ? error.message : 'Unknown error'}
                </div>
              ) : filteredWorkOrders && filteredWorkOrders.length > 0 ? (
                <div className="rounded-md border">
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWorkOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <Link 
                              to={`/workorders/${order.id}`}
                              className="text-primary hover:underline"
                            >
                              {order.wo_number || order.id.substring(0, 8)}
                            </Link>
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
                            <Badge variant="secondary" className={getStatusColor(order.status)}>
                              {formatStatus(order.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-10 text-center">
                  {searchTerm ? "No work orders matching your search" : "No work orders found"}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={isNewWorkOrderOpen} onOpenChange={setIsNewWorkOrderOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Work Order</DialogTitle>
          </DialogHeader>
          <WorkOrderForm onSuccess={handleNewWorkOrderSuccess} />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default WorkOrders;
