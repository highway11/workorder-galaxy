
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
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

type Location = {
  id: string;
  name: string;
  workOrderCount: number;
};

const Locations = () => {
  useEffect(() => {
    document.title = "Locations | WorkOrder App";
  }, []);

  // Mock data
  const locations: Location[] = [
    {
      id: "L001",
      name: "Main Building",
      workOrderCount: 5
    },
    {
      id: "L002",
      name: "West Wing",
      workOrderCount: 3
    },
    {
      id: "L003",
      name: "Cafeteria",
      workOrderCount: 2
    },
    {
      id: "L004",
      name: "Aquatic Centre",
      workOrderCount: 8
    },
    {
      id: "L005",
      name: "Gymnasium",
      workOrderCount: 1
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
            <p className="text-muted-foreground">Manage work order locations</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Button asChild>
              <Link to="/locations/new">
                <Plus className="mr-2 h-4 w-4" />
                New Location
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
                <CardTitle>All Locations</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search locations..."
                    className="pl-8 w-full sm:w-[260px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map((location) => (
                  <Link 
                    key={location.id} 
                    to={`/locations/${location.id}`}
                    className="block"
                  >
                    <Card className="h-full transition-all duration-300 hover:shadow-md hover:bg-muted/5">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="p-2 rounded-full bg-primary/10 text-primary">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-medium truncate">{location.name}</h3>
                            <p className="text-sm text-muted-foreground">Location ID: {location.id}</p>
                            <div className="mt-2 flex items-center">
                              <Badge variant="secondary" className="mt-1">
                                {location.workOrderCount} Work Order{location.workOrderCount !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Locations;
