
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash, Users, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Define types for our data
type Group = {
  id: string;
  name: string;
  created_at: string;
};

// Group schema for validation
const groupSchema = z.object({
  name: z.string().min(2, { message: "Group name must be at least 2 characters" })
});

const GroupsManager = () => {
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form setup
  const form = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
    },
  });

  // Reset form when we change which group we're editing
  useEffect(() => {
    if (editingGroup) {
      form.reset({ name: editingGroup.name });
    } else {
      form.reset({ name: "" });
    }
  }, [editingGroup, form]);

  // Query to fetch groups
  const { data: groups, isLoading, error } = useQuery({
    queryKey: ['groups'],
    queryFn: async (): Promise<Group[]> => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('name');
      
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  // Mutation to add a new group
  const addGroupMutation = useMutation({
    mutationFn: async (values: z.infer<typeof groupSchema>) => {
      const { data, error } = await supabase
        .from('groups')
        .insert([{ name: values.name }])
        .select();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({
        title: "Success",
        description: "Group has been created",
      });
      setIsAddingGroup(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation to update a group
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string, values: z.infer<typeof groupSchema> }) => {
      const { data, error } = await supabase
        .from('groups')
        .update({ name: values.name })
        .eq('id', id)
        .select();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({
        title: "Success",
        description: "Group has been updated",
      });
      setEditingGroup(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation to delete a group
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({
        title: "Success",
        description: "Group has been deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (values: z.infer<typeof groupSchema>) => {
    setIsSubmitting(true);
    
    if (editingGroup) {
      updateGroupMutation.mutate({ id: editingGroup.id, values });
    } else {
      addGroupMutation.mutate(values);
    }
    
    setIsSubmitting(false);
  };

  // Cancel editing/adding
  const handleCancel = () => {
    setIsAddingGroup(false);
    setEditingGroup(null);
    form.reset();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Groups
          </div>
          <Button 
            onClick={() => {
              setEditingGroup(null);
              setIsAddingGroup(!isAddingGroup);
            }}
            variant="outline" 
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Group
          </Button>
        </CardTitle>
        <CardDescription>
          Create and manage groups for work order assignments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add/Edit Form */}
        <Collapsible open={isAddingGroup || !!editingGroup} className="mb-4">
          <CollapsibleContent>
            <Card className="border-dashed">
              <CardHeader className="py-3">
                <CardTitle className="text-lg">
                  {editingGroup ? "Edit Group" : "Add New Group"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Group Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter group name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCancel}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={isSubmitting}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {editingGroup ? "Update" : "Save"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Groups Table */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <p>Loading groups...</p>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            <p>Error loading groups: {(error as Error).message}</p>
          </div>
        ) : groups && groups.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.name}</TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setEditingGroup(group)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${group.name}"?`)) {
                          deleteGroupMutation.mutate(group.id);
                        }
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mb-2 opacity-20" />
            <p>No groups found</p>
            <p className="text-sm">Create a new group to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GroupsManager;
