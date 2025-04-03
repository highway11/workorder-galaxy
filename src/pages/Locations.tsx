
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { LocationsTable } from '@/components/locations/LocationsTable';
import { useGroup } from '@/contexts/GroupContext';
import { useAuth } from '@/contexts/AuthContext';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Location schema for validation
const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(100, 'Name is too long'),
});

type LocationFormValues = z.infer<typeof locationSchema>;

const Locations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { selectedGroupId } = useGroup();
  const { profile } = useAuth();
  
  // Setup form with zod validation
  const addForm = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    document.title = "Locations | WorkOrder App";
  }, []);

  // Mutation to add a new location
  const addLocationMutation = useMutation({
    mutationFn: async (values: LocationFormValues) => {
      if (!selectedGroupId) {
        throw new Error("No group selected");
      }
      
      const { data, error } = await supabase
        .from('locations')
        .insert([{ 
          name: values.name,
          group_id: selectedGroupId 
        }])
        .select('*')
        .single();

      if (error) {
        console.error('Error adding location:', error);
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['locationStats'] });
      toast({
        title: 'Success',
        description: 'Location added successfully',
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add location: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Form submission handler
  const onAddSubmit = (values: LocationFormValues) => {
    addLocationMutation.mutate(values);
  };

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-8 w-full px-4">
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
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Location
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
              <CardTitle>All Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <LocationsTable />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Add Location Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>Enter the details for the new location.</DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter location name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addLocationMutation.isPending}>
                  {addLocationMutation.isPending ? 'Adding...' : 'Add Location'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Locations;
