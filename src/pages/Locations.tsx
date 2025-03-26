
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, MapPin, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Location schema for validation
const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(100, 'Name is too long'),
});

type LocationFormValues = z.infer<typeof locationSchema>;

type Location = {
  id: string;
  name: string;
  workOrderCount?: number;
};

const Locations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  // Setup form with zod validation
  const addForm = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
    },
  });

  const editForm = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    document.title = "Locations | WorkOrder App";
  }, []);

  // When editing a location, populate the form
  useEffect(() => {
    if (currentLocation && isEditDialogOpen) {
      editForm.reset({
        name: currentLocation.name,
      });
    }
  }, [currentLocation, isEditDialogOpen, editForm]);

  // Query to fetch locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name');

      if (error) {
        console.error('Error fetching locations:', error);
        toast({
          title: 'Error',
          description: 'Failed to load locations',
          variant: 'destructive',
        });
        throw new Error(error.message);
      }

      // Get work order counts for each location
      if (data) {
        const locationsWithCounts = await Promise.all(
          data.map(async (location) => {
            const { count, error: countError } = await supabase
              .from('workorders')
              .select('*', { count: 'exact', head: true })
              .eq('location_id', location.id);

            if (countError) {
              console.error('Error counting work orders:', countError);
              return { ...location, workOrderCount: 0 };
            }

            return { ...location, workOrderCount: count || 0 };
          })
        );

        return locationsWithCounts;
      }

      return [];
    },
  });

  // Mutation to add a new location
  const addLocationMutation = useMutation({
    mutationFn: async (values: LocationFormValues) => {
      const { data, error } = await supabase
        .from('locations')
        .insert([{ name: values.name }])
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

  // Mutation to update a location
  const updateLocationMutation = useMutation({
    mutationFn: async (values: LocationFormValues & { id: string }) => {
      const { data, error } = await supabase
        .from('locations')
        .update({ name: values.name })
        .eq('id', values.id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating location:', error);
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({
        title: 'Success',
        description: 'Location updated successfully',
      });
      setIsEditDialogOpen(false);
      setCurrentLocation(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update location: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation to delete a location
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting location:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setCurrentLocation(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete location: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Form submission handlers
  const onAddSubmit = (values: LocationFormValues) => {
    addLocationMutation.mutate(values);
  };

  const onEditSubmit = (values: LocationFormValues) => {
    if (currentLocation) {
      updateLocationMutation.mutate({ ...values, id: currentLocation.id });
    }
  };

  const onDeleteConfirm = () => {
    if (currentLocation) {
      deleteLocationMutation.mutate(currentLocation.id);
    }
  };

  // Handle edit button click
  const handleEditClick = (location: Location, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentLocation(location);
    setIsEditDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (location: Location, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentLocation(location);
    setIsDeleteDialogOpen(true);
  };

  // Filter locations based on search term
  const filteredLocations = locations.filter(location => 
    location.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <CardTitle>All Locations</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search locations..."
                    className="pl-8 w-full sm:w-[260px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-10 text-center text-muted-foreground">Loading locations...</div>
              ) : filteredLocations.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  {searchTerm ? 'No locations match your search' : 'No locations found. Add your first location!'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLocations.map((location) => (
                    <Link 
                      key={location.id} 
                      to={`/locations/${location.id}`}
                      className="block group"
                    >
                      <Card className="h-full transition-all duration-300 hover:shadow-md group-hover:bg-muted/5 relative">
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
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => handleEditClick(location, e)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => handleDeleteClick(location, e)}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
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

      {/* Edit Location Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>Update the location details.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
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
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateLocationMutation.isPending}>
                  {updateLocationMutation.isPending ? 'Updating...' : 'Update Location'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{currentLocation?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={onDeleteConfirm} 
              disabled={deleteLocationMutation.isPending}
            >
              {deleteLocationMutation.isPending ? 'Deleting...' : 'Delete Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Locations;
