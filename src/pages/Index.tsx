import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, CalendarDays, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/layout/AppLayout';
import { Link } from 'react-router-dom';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { LocationWorkOrdersChart } from '@/components/dashboard/LocationWorkOrdersChart';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardCard = ({ 
  title, 
  description, 
  count, 
  icon, 
  href,
  delay = 0,
  isLoading = false
}: { 
  title: string; 
  description: string; 
  count: number; 
  icon: React.ReactNode; 
  href: string;
  delay?: number;
  isLoading?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Link to={href}>
      <Card className="h-full hover:shadow-md transition-all duration-300">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              {icon}
            </div>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-16" />
          ) : (
            <div className="text-3xl font-bold">{count}</div>
          )}
        </CardContent>
      </Card>
    </Link>
  </motion.div>
);

const Dashboard = () => {
  const { 
    openWorkOrders, 
    workOrdersThisMonth, 
    workOrdersByLocation 
  } = useDashboardStats();

  useEffect(() => {
    document.title = "Dashboard | WorkOrder App";
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to your work order management system.</p>
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

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
          <DashboardCard
            title="Open Work Orders"
            description="Currently active work orders"
            count={openWorkOrders.data || 0}
            icon={<FileText className="h-5 w-5" />}
            href="/workorders"
            delay={0.1}
            isLoading={openWorkOrders.isLoading}
          />
          
          <DashboardCard
            title="This Month"
            description="Work orders created this month"
            count={workOrdersThisMonth.data || 0}
            icon={<CalendarDays className="h-5 w-5" />}
            href="/workorders"
            delay={0.2}
            isLoading={workOrdersThisMonth.isLoading}
          />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {workOrdersByLocation.isLoading ? (
            <Card>
              <CardHeader>
                <CardTitle>Work Orders by Location</CardTitle>
                <CardDescription>
                  Distribution of work orders across different locations this year
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center h-60">
                <Skeleton className="h-52 w-full" />
              </CardContent>
            </Card>
          ) : (
            <LocationWorkOrdersChart data={workOrdersByLocation.data || []} />
          )}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Work Orders</CardTitle>
              <CardDescription>
                Your most recently created or updated work orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Connect to Supabase to load your work orders
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
