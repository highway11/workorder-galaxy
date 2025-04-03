
// Schedule types for workorder recurrence
export interface WorkOrderSchedule {
  id: string;
  workorder_id: string;
  schedule_type: string;
  next_run: string;
  created_at: string;
  created_by: string;
  active: boolean;
}

// Schedule type mapping for display names
export const scheduleTypeNames: Record<string, string> = {
  'weekly': 'Weekly Maintenance',
  '3-weeks': '3 Weeks',
  'monthly': 'Monthly Maintenance',
  'bi-monthly': 'Bi-Monthly Maintenance',
  'quarterly': 'Quarterly Maintenance',
  'semi-annual': 'Semi Annual Maintenance',
  'annual': 'Annual Maintenance',
  'bi-annual': 'Bi-Annual Maintenance',
  '5-year': '5 Year Maintenance',
  '6-year': '6 Year Maintenance',
};

// Schedule interval descriptions
export const scheduleIntervals: Record<string, string> = {
  'weekly': 'Every 7 Days',
  '3-weeks': 'Every 21 Days',
  'monthly': 'Every Month',
  'bi-monthly': 'Every 2 Months',
  'quarterly': 'Every 3 Months',
  'semi-annual': 'Every 6 Months',
  'annual': 'Every Year',
  'bi-annual': 'Every 2 Years',
  '5-year': 'Every 5 Years',
  '6-year': 'Every 6 Years',
};
