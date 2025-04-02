
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useGroup } from "@/contexts/GroupContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CreateWorkOrderDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSuccess: (id: string) => void;
}

const workOrderSchema = z.object({
  item: z.string().min(1, { message: "Item is required" }),
  description: z.string().optional(),
  requestedBy: z.string().min(1, { message: "Requestor is required" }),
  locationId: z.string().min(1, { message: "Location is required" }),
  completeBy: z.date({ required_error: "Complete by date is required" }),
  glNumber: z.string().optional(),
  groupId: z.string().min(1, { message: "Group is required" }),
});

type WorkOrderFormValues = z.infer<typeof workOrderSchema>;

type Location = {
  id: string;
  name: string;
  group_id: string;
};

type Group = {
  id: string;
  name: string;
};

const CreateWorkOrderDialog = ({ isOpen, setIsOpen, onSuccess }: CreateWorkOrderDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedGroupId } = useGroup();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize react-hook-form with the work order schema
  const form = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      item: "",
      description: "",
      requestedBy: "",
      locationId: "",
      completeBy: new Date(),
      glNumber: "",
      groupId: selectedGroupId || "",
    },
  });

  // Update form when selectedGroupId changes
  useEffect(() => {
    if (selectedGroupId) {
      form.setValue("groupId", selectedGroupId);
    }
  }, [selectedGroupId, form]);

  // Fetch locations filtered by group
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["locations", form.watch("groupId")],
    queryFn: async () => {
      const selectedGroup = form.watch("groupId");
      if (!selectedGroup) return [];
      
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, group_id")
        .eq("group_id", selectedGroup)
        .order("name");
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!form.watch("groupId"),
  });

  // Fetch groups
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name")
        .order("name");
        
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation to create a new work order
  const createWorkOrderMutation = useMutation({
    mutationFn: async (values: WorkOrderFormValues) => {
      if (!user) {
        throw new Error("You must be logged in to create a work order");
      }
      
      const { data, error } = await supabase
        .from("workorders")
        .insert([
          {
            item: values.item,
            description: values.description || null,
            requested_by: values.requestedBy,
            location_id: values.locationId,
            complete_by: values.completeBy.toISOString(),
            gl_number: values.glNumber || null,
            group_id: values.groupId,
            created_by: user.id,
          },
        ])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      form.reset();
      setIsOpen(false);
      onSuccess(data.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create work order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: WorkOrderFormValues) => {
    setIsLoading(true);
    createWorkOrderMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Work Order</DialogTitle>
          <DialogDescription>
            Fill out the form below to create a new work order.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Select the department for this work order</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          
            <FormField
              control={form.control}
              name="item"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter work order item" {...field} />
                  </FormControl>
                  <FormDescription>
                    A short title for the work order
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter detailed description (optional)"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requestedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requested By</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter requestor name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="glNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>G.L. # (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter GL number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Select the location for this work order</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="completeBy"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Complete By</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    The date by which the work order should be completed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || createWorkOrderMutation.isPending}
              >
                {(isLoading || createWorkOrderMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Work Order"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkOrderDialog;
