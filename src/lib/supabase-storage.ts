
import { supabase } from "@/integrations/supabase/client";

export const createStorageBucket = async () => {
  // Check if the bucket already exists
  const { data: buckets } = await supabase.storage.listBuckets();
  
  if (!buckets?.find(bucket => bucket.name === 'workorders')) {
    // Create the bucket if it doesn't exist
    const { error } = await supabase.storage.createBucket('workorders', {
      public: false, // Set to public: true if you want files to be publicly accessible
    });
    
    if (error) {
      console.error('Error creating storage bucket:', error);
      return false;
    }
    
    return true;
  }
  
  return true;
};

// Initialize storage when imported
createStorageBucket().then((created) => {
  if (created) {
    console.log('Storage bucket created or already exists');
  }
});
