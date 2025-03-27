
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash, Users, Check, X, Bell } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Define types for our data
type Group = {
  id: string;
  name: string;
  created_at: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  isInGroup: boolean;
  notify: boolean;
};

// Group schema for validation
const groupSchema = z.object({
  name: z.string().min(2, { message: "Group name must be at least 2 characters" })
});

const GroupsManager = () => {
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manageUsersFor, setManageUsersFor] = useState<Group | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
  const [notifyUsers, setNotifyUsers] = useState<Record<string, boolean>>({});
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

  // Query to fetch users when managing group members
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users', manageUsersFor?.id],
    queryFn: async (): Promise<User[]> => {
      // Fetch all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .order('name');
      
      if (profilesError) throw new Error(profilesError.message);
      
      // If we have a group selected, fetch users in that group
      if (manageUsersFor) {
        const { data: userGroups, error: userGroupsError } = await supabase
          .from('user_groups')
          .select('user_id, notify')
          .eq('group_id', manageUsersFor.id);
        
        if (userGroupsError) throw new Error(userGroupsError.message);
        
        // Create a map of user IDs to their group membership status
        const userGroupMap = new Map();
        userGroups?.forEach(ug => {
          userGroupMap.set(ug.user_id, { isInGroup: true, notify: ug.notify });
        });
        
        // Map the users with their group membership status
        return (profiles || []).map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          isInGroup: userGroupMap.has(user.id),
          notify: userGroupMap.get(user.id)?.notify || false,
        }));
      }
      
      // If no group is selected, just return the users without group status
      return (profiles || []).map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isInGroup: false,
        notify: false,
      }));
    },
    enabled: !!manageUsersFor
  });

  // Initialize selected users when opening the dialog
  useEffect(() => {
    if (users && manageUsersFor) {
      const initialSelectedUsers: Record<string, boolean> = {};
      const initialNotifyUsers: Record<string, boolean> = {};
      
      users.forEach(user => {
        initialSelectedUsers[user.id] = user.isInGroup;
        initialNotifyUsers[user.id] = user.notify;
      });
      
      setSelectedUsers(initialSelectedUsers);
      setNotifyUsers(initialNotifyUsers);
    }
  }, [users, manageUsersFor]);

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

  // Mutation to update group members
  const updateGroupMembersMutation = useMutation({
    mutationFn: async ({ groupId, selectedUsers, notifyUsers }: { 
      groupId: string;
      selectedUsers: Record<string, boolean>;
      notifyUsers: Record<string, boolean>;
    }) => {
      if (!users) return;
      
      // Get current group members
      const { data: currentMembers, error: fetchError } = await supabase
        .from('user_groups')
        .select('id, user_id, notify')
        .eq('group_id', groupId);
      
      if (fetchError) throw new Error(fetchError.message);
      
      // Create a map of current members
      const currentMemberMap = new Map();
      currentMembers?.forEach(member => {
        currentMemberMap.set(member.user_id, { 
          id: member.id,
          notify: member.notify
        });
      });
      
      // Users to add
      const usersToAdd = users
        .filter(user => selectedUsers[user.id] && !currentMemberMap.has(user.id))
        .map(user => ({
          user_id: user.id,
          group_id: groupId,
          notify: notifyUsers[user.id] || false
        }));
      
      // Users to remove
      const usersToRemove = Array.from(currentMemberMap.keys())
        .filter(userId => !selectedUsers[userId])
        .map(userId => currentMemberMap.get(userId).id);
      
      // Users to update (notification settings changed)
      const usersToUpdate = users
        .filter(user => {
          const currentMember = currentMemberMap.get(user.id);
          return selectedUsers[user.id] && currentMember && currentMember.notify !== notifyUsers[user.id];
        })
        .map(user => ({
          id: currentMemberMap.get(user.id).id,
          notify: notifyUsers[user.id] || false
        }));
      
      // Execute all operations
      const operations = [];
      
      if (usersToAdd.length > 0) {
        operations.push(
          supabase
            .from('user_groups')
            .insert(usersToAdd)
        );
      }
      
      for (const user of usersToUpdate) {
        operations.push(
          supabase
            .from('user_groups')
            .update({ notify: user.notify })
            .eq('id', user.id)
        );
      }
      
      for (const userGroupId of usersToRemove) {
        operations.push(
          supabase
            .from('user_groups')
            .delete()
            .eq('id', userGroupId)
        );
      }
      
      if (operations.length > 0) {
        const results = await Promise.all(operations);
        
        // Check for errors
        const errors = results.filter(result => result.error).map(result => result.error);
        if (errors.length > 0) {
          throw new Error(errors[0]?.message || 'Failed to update group members');
        }
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', manageUsersFor?.id] });
      queryClient.invalidateQueries({ queryKey: ['userGroups'] });
      toast({
        title: "Success",
        description: "Group members have been updated",
      });
      setManageUsersFor(null);
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

  // Save group members
  const handleSaveGroupMembers = () => {
    if (manageUsersFor) {
      updateGroupMembersMutation.mutate({
        groupId: manageUsersFor.id,
        selectedUsers,
        notifyUsers
      });
    }
  };

  // Handle user selection in the group members dialog
  const handleUserSelection = (userId: string, checked: boolean) => {
    setSelectedUsers(prev => ({ ...prev, [userId]: checked }));
    
    // If user is unselected, also disable notifications
    if (!checked) {
      setNotifyUsers(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Handle notification toggle in the group members dialog
  const handleNotifyToggle = (userId: string, checked: boolean) => {
    setNotifyUsers(prev => ({ ...prev, [userId]: checked }));
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
                <TableHead className="w-[180px] text-right">Actions</TableHead>
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
                      onClick={() => setManageUsersFor(group)}
                      title="Manage Users"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setEditingGroup(group)}
                      title="Edit Group"
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
                      title="Delete Group"
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

        {/* Manage Group Members Dialog */}
        <Dialog 
          open={!!manageUsersFor} 
          onOpenChange={(open) => {
            if (!open) setManageUsersFor(null);
          }}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                Manage Users for {manageUsersFor?.name}
              </DialogTitle>
            </DialogHeader>
            
            {isLoadingUsers ? (
              <div className="py-8 flex justify-center">
                <p>Loading users...</p>
              </div>
            ) : users && users.length > 0 ? (
              <div className="space-y-4">
                <div className="max-h-[300px] overflow-y-auto pr-2">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={selectedUsers[user.id] || false}
                          onCheckedChange={(checked) => handleUserSelection(user.id, checked === true)}
                        />
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      
                      {selectedUsers[user.id] && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`notify-${user.id}`}
                            checked={notifyUsers[user.id] || false}
                            onCheckedChange={(checked) => handleNotifyToggle(user.id, checked === true)}
                            disabled={!selectedUsers[user.id]}
                          />
                          <Label 
                            htmlFor={`notify-${user.id}`}
                            className="text-xs cursor-pointer flex items-center"
                          >
                            <Bell className="h-3 w-3 mr-1" /> 
                            Notify
                          </Label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end space-x-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setManageUsersFor(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveGroupMembers}
                    disabled={updateGroupMembersMutation.isPending}
                  >
                    {updateGroupMembersMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p>No users found</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default GroupsManager;
