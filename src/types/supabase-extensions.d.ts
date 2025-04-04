
import { Database as OriginalDatabase } from '@/integrations/supabase/types';

// Extend the Database type to include workorder_schedules table
declare module '@/integrations/supabase/types' {
  export interface Database extends OriginalDatabase {
    public: {
      Tables: {
        workorder_schedules: {
          Row: {
            id: string;
            workorder_id: string;
            schedule_type: string;
            next_run: string;
            active: boolean;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: string;
            workorder_id: string;
            schedule_type: string;
            next_run: string;
            active?: boolean;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            workorder_id?: string;
            schedule_type?: string;
            next_run?: string;
            active?: boolean;
            created_at?: string;
            updated_at?: string;
          };
          Relationships: [
            {
              foreignKeyName: "workorder_schedules_workorder_id_fkey";
              columns: ["workorder_id"];
              isOneToOne: false;
              referencedRelation: "workorders";
              referencedColumns: ["id"];
            }
          ];
        } & OriginalDatabase['public']['Tables'];
      };
      Views: OriginalDatabase['public']['Views'];
      Functions: {
        create_workorder_schedule: {
          Args: {
            p_workorder_id: string;
            p_schedule_type: string;
          };
          Returns: string;
        } & OriginalDatabase['public']['Functions'];
      };
      Enums: OriginalDatabase['public']['Enums'];
      CompositeTypes: OriginalDatabase['public']['CompositeTypes'];
    };
  }
}
