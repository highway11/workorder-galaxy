
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckIcon, Loader2, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Group = {
  id: string;
  name: string;
};

type UserGroup = {
  id: string;
  user_id: string;
  group_id: string;
  notify: boolean;
};

type UserGroupsManagerProps = {
  userId: string;
};

const UserGroupsManager = ({ userId }: UserGroupsManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});
  const [notifyGroups, setNotifyGroups] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch all available groups
  const { data: groups, isLoading: isLoadingGroups } = useQuery({
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

  // Fetch user's current groups
  const { data: userGroups, isLoading: isLoadingUserGroups } = useQuery({
    queryKey: ['userGroups', userId],
    queryFn: async (): Promise<UserGroup[]> => {
      const { data, error } = await supabase
        .from('user_groups')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!userId
  });

  // Initialize selected groups when data is loaded
  useEffect(() => {
    if (groups && userGroups) {
      const initialSelectedGroups: Record<string, boolean> = {};
      const initialNotifyGroups: Record<string, boolean> = {};
      
      // Initialize all groups as unselected and not notified
      groups.forEach(group => {
        initialSelectedGroups[group.id] = false;
        initialNotifyGroups[group.id] = false;
      });
      
      // Mark user's groups as selected and set notify status
      userGroups.forEach(userGroup => {
        initialSelectedGroups[userGroup.group_id] = true;
        initialNotifyGroups[userGroup.group_id] = userGroup.notify || false;
      });
      
      setSelectedGroups(initialSelectedGroups);
      setNotifyGroups(initialNotifyGroups);
      setHasChanges(false);
    }
  }, [groups, userGroups]);

  // Handle checkbox changes for group membership
  const handleGroupChange = (groupId: string, checked: boolean) => {
    setSelectedGroups(prev => {
      const newState = { ...prev, [groupId]: checked };
      checkForChanges(newState, notifyGroups);
      return newState;
    });
  };

  // Handle checkbox changes for notification settings
  const handleNotifyChange = (groupId: string, checked: boolean) => {
    setNotifyGroups(prev => {
      const newState = { ...prev, [groupId]: checked };
      checkForChanges(selectedGroups, newState);
      return newState;
    });
  };

  // Check if there are any changes compared to the initial state
  const checkForChanges = (selectedState: Record<string, boolean>, notifyState: Record<string, boolean>) => {
    if (!userGroups || !groups) return;
    
    const currentUserGroupMap = new Map();
    userGroups.forEach(ug => {
      currentUserGroupMap.set(ug.group_id, {
        selected: true,
        notify: ug.notify || false
      });
    });
    
    const hasAnyChanges = groups.some(group => {
      const current = currentUserGroupMap.get(group.id) || { selected: false, notify: false };
      const isSelectedChanged = current.selected !== selectedState[group.id];
      const isNotifyChanged = current.selected && current.notify !== notifyState[group.id];
      
      return isSelectedChanged || isNotifyChanged;
    });
    
    setHasChanges(hasAnyChanges);
  };

  // Save changes mutation
  const saveChangesMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !groups) return;
      
      // Get current user group IDs and their properties
      const currentUserGroupMap = new Map();
      userGroups?.forEach(ug => {
        currentUserGroupMap.set(ug.group_id, {
          id: ug.id,
          notify: ug.notify || false
        });
      });
      
      // Groups to add (selected in form but not in current user groups)
      const groupsToAdd = groups
        .filter(group => selectedGroups[group.id] && !currentUserGroupMap.has(group.id))
        .map(group => ({
          user_id: userId,
          group_id: group.id,
          notify: notifyGroups[group.id] || false
        }));
      
      // Groups to update (already exist but notify status changed)
      const groupsToUpdate = groups
        .filter(group => {
          const existingGroup = currentUserGroupMap.get(group.id);
          return selectedGroups[group.id] && existingGroup && existingGroup.notify !== notifyGroups[group.id];
        })
        .map(group => ({
          id: currentUserGroupMap.get(group.id).id,
          notify: notifyGroups[group.id] || false
        }));
      
      // Groups to remove (not selected in form but in current user groups)
      const groupsToRemove = Array.from(currentUserGroupMap.keys())
        .filter(groupId => !selectedGroups[groupId])
        .map(groupId => currentUserGroupMap.get(groupId).id);
      
      // Perform the operations
      const operations = [];
      
      if (groupsToAdd.length > 0) {
        operations.push(
          supabase
            .from('user_groups')
            .insert(groupsToAdd)
        );
      }
      
      for (const groupUpdate of groupsToUpdate) {
        operations.push(
          supabase
            .from('user_groups')
            .update({ notify: groupUpdate.notify })
            .eq('id', groupUpdate.id)
        );
      }
      
      for (const userGroupId of groupsToRemove) {
        operations.push(
          supabase
            .from('user_groups')
            .delete()
            .eq('id', userGroupId)
        );
      }
      
      // Execute all operations
      const results = await Promise.all(operations);
      
      // Check for errors
      const errors = results.filter(result => result.error).map(result => result.error);
      if (errors.length > 0) {
        throw new Error(errors[0]?.message || 'Failed to update user groups');
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userGroups', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'User group assignments updated successfully',
      });
      setHasChanges(false);
    },
    onError: (error) => {
      console.error('Error updating user groups:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user group assignments',
        variant: 'destructive',
      });
    }
  });

  // Handle save button click
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveChangesMutation.mutateAsync();
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isLoadingGroups || isLoadingUserGroups;

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {groups && groups.length > 0 ? (
          groups.map(group => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`group-${group.id}`}
                    checked={selectedGroups[group.id] || false}
                    onCheckedChange={(checked) => 
                      handleGroupChange(group.id, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`group-${group.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {group.name}
                  </Label>
                </div>
                
                {selectedGroups[group.id] && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`notify-${group.id}`}
                            checked={notifyGroups[group.id] || false}
                            onCheckedChange={(checked) => 
                              handleNotifyChange(group.id, checked === true)
                            }
                            disabled={!selectedGroups[group.id]}
                          />
                          <Label
                            htmlFor={`notify-${group.id}`}
                            className="flex items-center text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {notifyGroups[group.id] ? (
                              <Bell className="h-4 w-4 ml-1 text-blue-500" />
                            ) : (
                              <BellOff className="h-4 w-4 ml-1 text-muted-foreground" />
                            )}
                          </Label>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{notifyGroups[group.id] ? "Receive email notifications" : "No email notifications"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-4">
            No groups available. Create groups in the Settings page.
          </p>
        )}
      </div>

      <Separator />

      <Button
        onClick={handleSave}
        disabled={!hasChanges || isSaving}
        className="w-full"
      >
        {isSaving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckIcon className="mr-2 h-4 w-4" />
        )}
        Save Group Assignments
      </Button>
    </div>
  );
};

export default UserGroupsManager;
