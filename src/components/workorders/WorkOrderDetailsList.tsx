import { useState } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Edit, Trash2, FileIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getSupabasePublicUrl, isImageFile, isPdfFile, invalidateWorkOrderQueries } from "@/lib/utils";
import ImageGallery from "../gallery/ImageGallery";

interface WorkOrderDetail {
  id: string;
  workorder_id: string;
  created_by: string;
  detail_type: string;
  comment: string | null;
  hours: number | null;
  subtotal: number | null;
  gst: number | null;
  pst: number | null;
  amount: number | null;
  file_name: string | null;
  file_path: string | null;
}

interface WorkOrderDetailsListProps {
  workOrderId: string;
}

const WorkOrderDetailsList = ({ workOrderId }: WorkOrderDetailsListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);

  const { data: details, isLoading, error } = useQuery({
    queryKey: ['workorder-details', workOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workorder_details')
        .select('*')
        .eq('workorder_id', workOrderId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching work order details:", error);
        throw error;
      }

      return data as WorkOrderDetail[];
    },
  });

  const deleteDetailMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workorder_details')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Delete error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Use the helper function to invalidate all related queries
      invalidateWorkOrderQueries(queryClient, workOrderId);
      
      toast({
        title: "Detail Removed",
        description: "The work order detail has been deleted.",
      });
    },
    onError: (error) => {
      console.error("Error deleting work order detail:", error);
      toast({
        title: "Error",
        description: "Failed to delete the work order detail. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteDetail = (id: string) => {
    deleteDetailMutation.mutate(id);
  };

  const handleOpenGallery = (filePaths: string[]) => {
    setSelectedFilePaths(filePaths);
    setOpen(true);
  };

  const handleCloseGallery = () => {
    setOpen(false);
  };

  const getImageFiles = () => {
    return details
      ?.filter(detail => detail.detail_type === 'File' && detail.file_path && isImageFile(detail.file_path))
      .map(detail => getSupabasePublicUrl('workorders', detail.file_path) || '')
      .filter(Boolean) as string[];
  };

  const renderDetailValue = (detail: WorkOrderDetail) => {
    switch (detail.detail_type) {
      case 'Comment':
        return detail.comment;
      case 'Hours':
        return `${detail.hours} hours`;
      case 'Parts':
        return (
          <>
            {detail.comment && <p className="font-medium">{detail.comment}</p>}
            <p>Subtotal: {formatCurrency(detail.subtotal)}</p>
            <p>GST: {formatCurrency(detail.gst)}</p>
            <p>PST: {formatCurrency(detail.pst)}</p>
            <p>Total: {formatCurrency(detail.amount)}</p>
          </>
        );
      case 'File':
        if (detail.file_name && detail.file_path) {
          const publicUrl = getSupabasePublicUrl('workorders', detail.file_path);
          if (!publicUrl) {
            return 'File URL not available';
          }
          
          if (isImageFile(detail.file_path)) {
            return <Button variant="link" onClick={() => handleOpenGallery([publicUrl])}>{detail.file_name}</Button>;
          } else if (isPdfFile(detail.file_path)) {
            return <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{detail.file_name}</a>;
          } else {
            return (
              <>
                <FileIcon className="mr-2 h-4 w-4" />
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{detail.file_name}</a>
              </>
            );
          }
        }
        return 'No file attached';
      default:
        return 'N/A';
    }
  };

  if (isLoading) {
    return <p>Loading work order details...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  const imageFiles = getImageFiles();

  return (
    <>
      {imageFiles.length > 0 && (
        <ImageGallery
          open={open}
          onOpenChange={setOpen}
          files={selectedFilePaths}
          onClose={handleCloseGallery}
        />
      )}
      
      <Table>
        <TableCaption>Work Order Details</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Detail</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {details?.map((detail) => (
            <TableRow key={detail.id}>
              <TableCell>
                <Badge variant="secondary">{detail.detail_type}</Badge>
              </TableCell>
              <TableCell>{renderDetailValue(detail)}</TableCell>
              <TableCell>{format(new Date(detail.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteDetail(detail.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {details?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center">No details found.</TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="text-center">
              Total {details?.length} details
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </>
  );
};

export default WorkOrderDetailsList;
