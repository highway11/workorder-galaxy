
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileIcon, Download, FileX, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DetailType } from "./WorkOrderDetailButtons";
import { useToast } from "@/hooks/use-toast";

interface WorkOrderDetail {
  id: string;
  created_at: string;
  created_by: string;
  workorder_id: string;
  detail_type: DetailType;
  comment: string | null;
  hours: number | null;
  amount: number | null;
  gst: number | null;
  pst: number | null;
  subtotal: number | null;
  file_name: string | null;
  file_path: string | null;
  creator: {
    name: string;
  } | null;
}

interface WorkOrderDetailsListProps {
  workOrderId: string;
}

const WorkOrderDetailsList = ({ workOrderId }: WorkOrderDetailsListProps) => {
  const { toast } = useToast();
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  
  const {
    data: details,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["workorder-details", workOrderId],
    queryFn: async () => {
      console.log("Fetching workorder details for ID:", workOrderId);
      
      const { data, error } = await supabase
        .from("workorder_details")
        .select(`
          *,
          creator:created_by(name)
        `)
        .eq("workorder_id", workOrderId)
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching workorder details:", error);
        throw new Error(error.message);
      }
      
      console.log("Fetched workorder details:", data);
      return data as WorkOrderDetail[];
    },
  });

  const handleDownloadFile = async (fileDetail: WorkOrderDetail) => {
    if (!fileDetail.file_path) return;
    
    try {
      setLoadingFile(fileDetail.id);
      console.log("Downloading file:", fileDetail.file_path, "from bucket: workorders");
      
      const { data, error } = await supabase.storage
        .from("workorders")
        .download(fileDetail.file_path);
        
      if (error) {
        console.error("Download error:", error);
        throw error;
      }
      
      console.log("File downloaded successfully");
      
      // Create a download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileDetail.file_name || "download";
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "File Downloaded",
        description: `${fileDetail.file_name} has been downloaded.`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download file",
        variant: "destructive",
      });
    } finally {
      setLoadingFile(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md my-4">
        <p>Error loading work order details: {error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    );
  }

  if (!details || details.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center text-muted-foreground my-4">
        <p>No details have been added to this work order yet.</p>
      </div>
    );
  }

  // Group details by type
  const detailsByType = details.reduce((groups, detail) => {
    const type = detail.detail_type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(detail);
    return groups;
  }, {} as Record<DetailType, WorkOrderDetail[]>);

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  return (
    <div className="space-y-8">
      {(["Comment", "Hours", "Parts", "File"] as DetailType[]).map((type) => {
        if (!detailsByType[type] || detailsByType[type].length === 0) return null;
        
        return (
          <Card key={type} className="overflow-hidden">
            <CardHeader className="bg-gray-50 pb-3">
              <CardTitle className="text-lg flex items-center">
                <Badge variant="outline" className="mr-2">
                  {detailsByType[type].length}
                </Badge>
                {type === "Comment" ? "Comments" : type}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {detailsByType[type].map((detail) => (
                  <div key={detail.id} className="p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {detail.creator?.name || "Unknown"} • {format(new Date(detail.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>

                    {/* Content based on detail type */}
                    {type === "Comment" && (
                      <p className="whitespace-pre-wrap">{detail.comment}</p>
                    )}

                    {type === "Hours" && (
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          <Badge variant="secondary" className="text-blue-700 bg-blue-50">
                            {detail.hours} hours
                          </Badge>
                        </div>
                        {detail.comment && <p className="text-gray-700">{detail.comment}</p>}
                      </div>
                    )}

                    {type === "Parts" && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Subtotal</p>
                            <p>{formatCurrency(detail.subtotal)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">GST</p>
                            <p>{formatCurrency(detail.gst)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">PST</p>
                            <p>{formatCurrency(detail.pst)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="font-medium">{formatCurrency(detail.amount)}</p>
                          </div>
                        </div>
                        {detail.comment && <p className="text-gray-700 pt-2">{detail.comment}</p>}
                      </div>
                    )}

                    {type === "File" && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <FileIcon className="h-5 w-5 text-blue-500" />
                          <span>{detail.file_name || "Unnamed file"}</span>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            onClick={() => handleDownloadFile(detail)}
                            disabled={loadingFile === detail.id || !detail.file_path}
                          >
                            {loadingFile === detail.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : detail.file_path ? (
                              <Download className="h-4 w-4" />
                            ) : (
                              <FileX className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {detail.comment && <p className="text-gray-700">{detail.comment}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default WorkOrderDetailsList;
