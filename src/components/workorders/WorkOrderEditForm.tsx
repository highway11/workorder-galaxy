import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  date: z.date({
    required_error: "Date is required",
  }),
  complete_by: z.date({
    required_error: "Complete by date is required",
  }),
  requested_by: z.string().min(2, { message: "Requested by must be at least 2 characters" }),
  item: z.string().min(2, { message: "Item must be at least 2 characters" }),
  location_id: z.string({
    required_error: "Please select a location",
  }),
  gl_number: z.string().optional(),
  description: z.string().optional(),
  group_id: z.string({
    required_error: "Please select a group",
  }),
  status: z.enum(['open', 'in-progress', 'completed', 'closed']),
});

type FormValues = z.infer<typeof formSchema>;

interface WorkOrderEditFormProps {
  workOrder: {
    id: string;
    wo_number: string | null;
    item: string;
    description: string | null;
    requested_by: string;
    location: {
      name: string;
    };
    group: {
      name: string;
    };
    date: string;
    complete_by: string;
    status: string;
    gl_number: string | null;
    closed_on: string | null;
  };
  onSuccess: () => void;
}

const WorkOrderEditForm = ({ workOrder, onSuccess }: WorkOrderEditFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .order('name');
      
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .order('name');
      
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: locationData } = useQuery({
    queryKey: ['location', workOrder.location.name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id')
        .eq('name', workOrder.location.name)
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const { data: groupData } = useQuery({
    queryKey: ['group', workOrder.group.name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('id')
        .eq('name', workOrder.group.name)
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const getValidStatus = (status: string): 'open' | 'in-progress' | 'completed' | 'closed' => {
    if (status === 'open' || status === 'in-progress' || status === 'completed' || status === 'closed') {
      return status as 'open' | 'in-progress' | 'completed' | 'closed';
    }
    return 'open';
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(workOrder.date),
      complete_by: new Date(workOrder.complete_by),
      requested_by: workOrder.requested_by,
      item: workOrder.item,
      description: workOrder.description || "",
      gl_number: workOrder.gl_number || "",
      status: getValidStatus(workOrder.status),
      location_id: locationData?.id || "",
      group_id: groupData?.id || "",
    },
    values: {
      date: new Date(workOrder.date),
      complete_by: new Date(workOrder.complete_by),
      requested_by: workOrder.requested_by,
      item: workOrder.item,
      description: workOrder.description || "",
      gl_number: workOrder.gl_number || "",
      status: getValidStatus(workOrder.status),
      location_id: locationData?.id || "",
      group_id: groupData?.id || "",
    }
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      console.log("Submitting values:", values);
      
      const { error } = await supabase
        .from('workorders')
        .update({
          date: values.date.toISOString(),
          complete_by: values.complete_by.toISOString(),
          requested_by: values.requested_by,
          item: values.item,
          description: values.description || null,
          location_id: values.location_id,
          gl_number: values.gl_number || null,
          group_id: values.group_id,
          status: values.status,
          ...(values.status === 'closed' && workOrder.status !== 'closed'
              ? { closed_on: new Date().toISOString() }
              : {}),
          ...(values.status !== 'closed' && workOrder.status === 'closed'
              ? { closed_on: null }
              : {})
        })
        .eq('id', workOrder.id);

      if (error) {
        console.error("Update error:", error);
        throw error;
      }

      onSuccess();
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to update work order: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
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
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="complete_by"
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
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="requested_by"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requested By</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter requestor name" />
              </FormControl>
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
                <Input {...field} placeholder="Enter item name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {locations?.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="group_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department/Group</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gl_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>G.L. # (Optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter GL number if applicable" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description of Problem</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Describe the issue in detail"
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default WorkOrderEditForm;
