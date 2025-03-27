import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, FileIcon, Loader2, Calculator } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { DetailType } from "./WorkOrderDetailButtons";
import { WorkOrderDetail } from "./WorkOrderDetailsList";

interface WorkOrderDetailFormProps {
  workOrderId: string;
  detailType: DetailType;
  onClose: () => void;
  editMode?: boolean;
  detailToEdit?: WorkOrderDetail | null;
}

const commentSchema = z.object({
  comment: z.string().min(1, { message: "Comment is required" }),
  date: z.date({ required_error: "Date is required" }),
});

const hoursSchema = z.object({
  comment: z.string().optional(),
  date: z.date({ required_error: "Date is required" }),
  hours: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Hours must be a positive number",
  }),
});

const partsSchema = z.object({
  comment: z.string().optional(),
  date: z.date({ required_error: "Date is required" }),
  vendor: z.string().min(1, { message: "Vendor is required" }),
  subtotal: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Subtotal must be a valid number",
  }),
  gst: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "GST must be a valid number",
  }),
  pst: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "PST must be a valid number",
  }),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Amount must be a valid number",
  }),
});

const fileSchema = z.object({
  comment: z.string().optional(),
});

const getSchemaForType = (type: DetailType) => {
  switch (type) {
    case "Comment":
      return commentSchema;
    case "Hours":
      return hoursSchema;
    case "Parts":
      return partsSchema;
    case "File":
      return fileSchema;
    default:
      return commentSchema;
  }
};

const WorkOrderDetailForm = ({ 
  workOrderId, 
  detailType, 
  onClose, 
  editMode = false,
  detailToEdit = null 
}: WorkOrderDetailFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  const formSchema = getSchemaForType(detailType);

  // Initialize default values based on whether we're in edit mode
  const getDefaultValues = () => {
    if (editMode && detailToEdit) {
      const dateValue = detailToEdit.created_at ? new Date(detailToEdit.created_at) : new Date();
      
      // Extract vendor from comment if it's a Parts type
      let vendor = "";
      let comment = detailToEdit.comment || "";
      
      if (detailType === "Parts" && comment) {
        const vendorMatch = comment.match(/Vendor: (.*?)($| - )/);
        if (vendorMatch && vendorMatch[1]) {
          vendor = vendorMatch[1];
          comment = comment.replace(`Vendor: ${vendor} - `, '').replace(`Vendor: ${vendor}`, '');
        }
      }
      
      return {
        comment: detailType === "Parts" ? comment : detailToEdit.comment || "",
        date: dateValue,
        hours: detailToEdit.hours?.toString() || "",
        vendor: vendor,
        subtotal: detailToEdit.subtotal?.toString() || "",
        gst: detailToEdit.gst?.toString() || "",
        pst: detailToEdit.pst?.toString() || "",
        amount: detailToEdit.amount?.toString() || "",
      };
    }
    
    return {
      comment: "",
      date: new Date(),
      hours: "",
      vendor: "",
      subtotal: "",
      gst: "",
      pst: "",
      amount: "",
    };
  };

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  // Update form values when in edit mode and detailToEdit changes
  useEffect(() => {
    if (editMode && detailToEdit) {
      const defaultValues = getDefaultValues();
      Object.keys(defaultValues).forEach((key) => {
        form.setValue(key as any, defaultValues[key as keyof typeof defaultValues]);
      });
    }
  }, [editMode, detailToEdit, form]);

  const addOrUpdateDetailMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!user) {
        throw new Error("You must be logged in to add details");
      }

      let fileData = null;
      
      if (detailType === "File" && file) {
        try {
          const fileExt = file.name.split('.').pop();
          const filePath = `${workOrderId}/${Math.random().toString(36).substring(2)}.${fileExt || 'file'}`;
          
          console.log("Uploading file to path:", filePath);
          const { data, error: uploadError } = await supabase.storage
            .from('workorders')
            .upload(filePath, file);
            
          if (uploadError) {
            console.error("Error uploading file:", uploadError);
            throw new Error(`Error uploading file: ${uploadError.message}`);
          }
          
          console.log("File uploaded successfully:", data);
          fileData = {
            file_name: file.name,
            file_path: filePath
          };
        } catch (uploadError) {
          console.error("File upload exception:", uploadError);
          throw new Error(`Error uploading file: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      }
      
      const detailData: any = {
        workorder_id: workOrderId,
        detail_type: detailType,
        comment: values.comment || null,
      };
      
      if (editMode && detailToEdit) {
        // If editing, only update fields that can be edited
        // Don't update created_by, workorder_id, etc.
      } else {
        // If creating, set the created_by field
        detailData.created_by = user.id;
      }
      
      if (detailType === "Hours") {
        detailData.hours = parseFloat(values.hours);
      } else if (detailType === "Parts") {
        detailData.subtotal = parseFloat(values.subtotal);
        detailData.gst = parseFloat(values.gst);
        detailData.pst = parseFloat(values.pst);
        detailData.amount = parseFloat(values.amount);
        detailData.comment = `Vendor: ${values.vendor}${values.comment ? ` - ${values.comment}` : ''}`;
      } else if (detailType === "File" && fileData) {
        detailData.file_name = fileData.file_name;
        detailData.file_path = fileData.file_path;
      }
      
      console.log(editMode ? "Updating workorder detail:" : "Inserting workorder detail:", detailData);
      
      if (editMode && detailToEdit) {
        const { data, error } = await supabase
          .from('workorder_details')
          .update(detailData)
          .eq('id', detailToEdit.id)
          .select('*')
          .single();
          
        if (error) {
          console.error("Error updating work order detail:", error);
          throw new Error(`Error updating detail: ${error.message}`);
        }
        
        return data;
      } else {
        const { data, error } = await supabase
          .from('workorder_details')
          .insert(detailData)
          .select('*')
          .single();
          
        if (error) {
          console.error("Error adding work order detail:", error);
          throw new Error(`Error adding detail: ${error.message}`);
        }
        
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workorder-details', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['workorder-totals', workOrderId] });
      toast({
        title: "Success!",
        description: `${detailType} has been ${editMode ? 'updated' : 'added'} to the work order.`,
      });
      onClose();
    },
    onError: (error) => {
      console.error("Error in mutation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add detail",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: any) => {
    if (detailType === "File" && !file && !editMode) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    
    addOrUpdateDetailMutation.mutate(values);
  };

  const calculateTaxesAndTotal = () => {
    const subtotalValue = form.getValues("subtotal");
    if (!subtotalValue || isNaN(Number(subtotalValue))) {
      toast({
        title: "Invalid subtotal",
        description: "Please enter a valid subtotal amount first.",
        variant: "destructive",
      });
      return;
    }

    const subtotal = Number(subtotalValue);
    const gst = subtotal * 0.05;
    const pst = subtotal * 0.07;
    const total = subtotal + gst + pst;

    // Update form values
    form.setValue("gst", gst.toFixed(2));
    form.setValue("pst", pst.toFixed(2));
    form.setValue("amount", total.toFixed(2));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="p-4 bg-white rounded-md border">
      <h3 className="font-medium text-lg mb-4">{editMode ? 'Edit' : 'Add'} {detailType}</h3>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {detailType !== "File" && (
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
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={editMode} // Disable date change in edit mode
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
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {detailType === "Hours" && (
            <FormField
              control={form.control}
              name="hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hours</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.25" min="0" placeholder="Enter hours" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {detailType === "Parts" && (
            <>
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter vendor name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="subtotal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtotal</FormLabel>
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          onClick={calculateTaxesAndTotal}
                          title="Calculate taxes and total"
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="gst"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GST</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pst"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PST</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}

          {detailType === "File" && (
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileIcon className="w-8 h-8 mb-3 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">Any file type</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              
              {file && (
                <div className="text-sm text-gray-500">
                  Selected file: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>
          )}

          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{detailType === "Comment" ? "Comment" : "Description (Optional)"}</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder={detailType === "Comment" ? "Enter your comment" : "Enter additional details (optional)"}
                    className="resize-none" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={addOrUpdateDetailMutation.isPending}
            >
              {addOrUpdateDetailMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editMode ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                editMode ? 'Update' : 'Save'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default WorkOrderDetailForm;
