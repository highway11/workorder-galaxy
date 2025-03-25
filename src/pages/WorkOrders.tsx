
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

type WorkOrderStatus = 'open' | 'in-progress' | 'completed';

type WorkOrder = {
  id: string;
  description: string;
  item: string;
  requestedBy: string;
  location: string;
  dateCreated: string;
  completeBy: string;
  status: WorkOrderStatus;
};

const WorkOrders = () => {
  useEffect(() => {
    document.title = "Work Orders | WorkOrder App";
  }, []);

  // Mock data
  const workOrders: WorkOrder[] = [
    {
      id: "WO-001",
      description: "Repair broken window in Room 204",
      item: "Window",
      requestedBy: "John Smith",
      location: "Main Building",
      dateCreated: "2023-05-15",
      completeBy: "2023-05-20",
      status: "open"
    },
    {
      id: "WO-002",
      description: "Replace light bulbs in hallway",
      item: "Lighting",
      requestedBy: "Sarah Johnson",
      location: "West Wing",
      dateCreated: "2023-05-16",
      completeBy: "2023-05-18",
      status: "in-progress"
    },
    {
      id: "WO-003",
      description: "Fix leaking faucet in kitchen",
      item: "Plumbing",
      requestedBy: "Michael Brown",
      location: "Cafeteria",
      dateCreated: "2023-05-14",
      completeBy: "2023-05-19",
      status: "completed"
    }
  ];

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
            <Button asChild>
              <Link to="/workorders/new">
                <Plus className="mr-2 h-4 w-4" />
                New Work Order
              </Link>
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
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="hidden md:table-cell">Location</TableHead>
                      <TableHead className="hidden lg:table-cell">Requested By</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                      <TableHead>Due By</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <Link 
                            to={`/workorders/${order.id}`}
                            className="text-primary hover:underline"
                          >
                            {order.id}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{order.item}</span>
                            <span className="text-xs text-muted-foreground md:hidden">
                              {order.location}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{order.location}</TableCell>
                        <TableCell className="hidden lg:table-cell">{order.requestedBy}</TableCell>
                        <TableCell className="hidden lg:table-cell">{order.dateCreated}</TableCell>
                        <TableCell>{order.completeBy}</TableCell>
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
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default WorkOrders;
