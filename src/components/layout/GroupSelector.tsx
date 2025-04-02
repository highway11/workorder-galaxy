
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGroup } from "@/contexts/GroupContext";
import { useAuth } from "@/contexts/AuthContext";

const GroupSelector = () => {
  const { profile } = useAuth();
  const { selectedGroupId, setSelectedGroupId, groups, isLoading } = useGroup();

  // Only admins can see the group selector
  if (profile?.role !== "admin" || isLoading || groups.length === 0) {
    return null;
  }

  return (
    <div className="px-3 py-2">
      <p className="text-xs text-muted-foreground mb-1">Active Group</p>
      <Select
        value={selectedGroupId || undefined}
        onValueChange={(value) => setSelectedGroupId(value)}
      >
        <SelectTrigger className="w-full text-sm">
          <SelectValue placeholder="Select group" />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default GroupSelector;
