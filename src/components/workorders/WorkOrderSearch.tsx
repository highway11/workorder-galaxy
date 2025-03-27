
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface WorkOrderSearchProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

const WorkOrderSearch = ({ searchTerm, setSearchTerm }: WorkOrderSearchProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search work orders..."
          className="pl-8 w-full sm:w-[260px]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <Button variant="outline" size="icon">
        <Filter className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default WorkOrderSearch;
