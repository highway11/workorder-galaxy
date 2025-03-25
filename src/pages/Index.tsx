
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, MapPin, Users, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/layout/AppLayout';
import { Link } from 'react-router-dom';

const DashboardCard = ({ 
  title, 
  description, 
  count, 
  icon, 
  href,
  delay = 0
}: { 
  title: string; 
  description: string; 
  count: number; 
  icon: React.ReactNode; 
  href: string;
  delay?: number;
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
          <div className="text-3xl font-bold">{count}</div>
        </CardContent>
      </Card>
    </Link>
  </motion.div>
);

const Dashboard = () => {
  useEffect(() => {
    document.title = "Dashboard | WorkOrder App";
  }, []);

  // Placeholder data
  const stats = {
    workOrders: 12,
    locations: 5,
    users: 8
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

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Work Orders"
            description="Manage all work orders"
            count={stats.workOrders}
            icon={<FileText className="h-5 w-5" />}
            href="/workorders"
            delay={0.1}
          />
          
          <DashboardCard
            title="Locations"
            description="View all locations"
            count={stats.locations}
            icon={<MapPin className="h-5 w-5" />}
            href="/locations"
            delay={0.2}
          />
          
          <DashboardCard
            title="Users"
            description="Manage system users"
            count={stats.users}
            icon={<Users className="h-5 w-5" />}
            href="/users"
            delay={0.3}
          />
        </div>
        
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
