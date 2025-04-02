
import { useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

type LocationData = {
  name: string;
  count: number;
}

const COLORS = [
  "#4f46e5", // indigo-600
  "#0ea5e9", // sky-500
  "#8b5cf6", // violet-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
];

export function LocationWorkOrdersChart({ data }: { data: LocationData[] }) {
  // Sort data by count in descending order
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.count - a.count);
  }, [data]);

  // Config for the chart to map location names to colors
  const chartConfig = useMemo(() => {
    const config: Record<string, { color: string }> = {};
    
    sortedData.forEach((item, index) => {
      config[item.name] = {
        color: COLORS[index % COLORS.length]
      };
    });
    
    return config;
  }, [sortedData]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Work Orders by Location</CardTitle>
          <CardDescription>
            Distribution of work orders across different locations this year
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-56">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Work Orders by Location</CardTitle>
        <CardDescription>
          Distribution of work orders across different locations this year
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ChartContainer config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 10,
                  bottom: 30,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end"
                  height={50}
                  tick={{ fontSize: 11 }}
                />
                <YAxis allowDecimals={false} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {sortedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
