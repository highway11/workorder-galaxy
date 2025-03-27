
import { supabase } from "@/integrations/supabase/client";

export const initializeStorage = async () => {
  // Check if the bucket already exists
  const { data: buckets } = await supabase.storage.listBuckets();
  
  if (!buckets?.find(bucket => bucket.name === 'workorders')) {
    console.error('Storage bucket "workorders" not found. Please create it in the Supabase dashboard.');
    return false;
  }
  
  console.log('Storage bucket "workorders" is ready to use');
  return true;
};

// Initialize storage when imported
initializeStorage().then((initialized) => {
  if (initialized) {
    console.log('Storage bucket initialized successfully');
  }
});
