import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, User, MapPin, FileText, ImageIcon } from "lucide-react";
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
});

type FormValues = z.infer<typeof formSchema>;

interface WorkOrderFormProps {
  onSuccess: () => void;
}

const WorkOrderForm = ({ onSuccess }: WorkOrderFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileSelected, setFileSelected] = useState<File | null>(null);

  // Fetch locations
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

  // Fetch groups
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      complete_by: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      requested_by: "",
      item: "",
      description: "",
      gl_number: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create a work order");
      }

      // Create work order
      const { data, error } = await supabase
        .from('workorders')
        .insert({
          date: values.date.toISOString(),
          complete_by: values.complete_by.toISOString(),
          requested_by: values.requested_by,
          item: values.item,
          description: values.description || null,
          location_id: values.location_id,
          gl_number: values.gl_number || null,
          group_id: values.group_id,
          created_by: user.id,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Handle file upload if there is a file
      if (fileSelected && data) {
        const fileExt = fileSelected.name.split('.').pop();
        const fileName = `${data.id}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `workorder-attachments/${fileName}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('workorders')
          .upload(filePath, fileSelected);

        if (uploadError) throw uploadError;

        // Create workorder_detail record for the file
        const { error: detailError } = await supabase
          .from('workorder_details')
          .insert({
            workorder_id: data.id,
            detail_type: 'attachment',
            file_path: filePath,
            file_name: fileSelected.name,
            created_by: user.id,
          });

        if (detailError) throw detailError;
      }

      // Send notification to users in the group who are set to be notified
      try {
        const { data: notifyData, error: notifyError } = await supabase.functions.invoke(
          "send-workorder-notification", 
          {
            body: {
              workOrderId: data.id
            }
          }
        );

        if (notifyError) {
          console.error("Failed to send notifications:", notifyError);
        } else {
          console.log("Notification response:", notifyData);
        }
      } catch (notifyError) {
        // Log notification error but don't fail the work order creation
        console.error("Error sending notifications:", notifyError);
      }

      onSuccess();
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to create work order: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileSelected(e.target.files[0]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
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
                  <PopoverContent className="w-auto p-0" align="start">
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

          {/* Complete By */}
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
                  <PopoverContent className="w-auto p-0" align="start">
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

        {/* Requested By */}
        <FormField
          control={form.control}
          name="requested_by"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requested By</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input {...field} className="pl-8" placeholder="Enter requestor name" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Item */}
        <FormField
          control={form.control}
          name="item"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item</FormLabel>
              <FormControl>
                <div className="relative">
                  <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input {...field} className="pl-8" placeholder="Enter item name" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location */}
        <FormField
          control={form.control}
          name="location_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <SelectTrigger className="pl-8">
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                  </div>
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

        {/* Group */}
        <FormField
          control={form.control}
          name="group_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department/Group</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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

        {/* GL Number (Optional) */}
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

        {/* Description */}
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

        {/* Picture Upload (Optional) */}
        <div className="space-y-2">
          <FormLabel>Picture (Optional)</FormLabel>
          <div className="flex items-center space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => document.getElementById('file-upload')?.click()}
              className="flex items-center space-x-2"
            >
              <ImageIcon className="h-4 w-4" />
              <span>Choose File</span>
            </Button>
            <span className="text-sm text-muted-foreground">
              {fileSelected ? fileSelected.name : "No file chosen"}
            </span>
          </div>
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Work Order"}
        </Button>
      </form>
    </Form>
  );
};

export default WorkOrderForm;
