
import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

type Group = {
  id: string;
  name: string;
};

type GroupContextType = {
  selectedGroupId: string | null;
  setSelectedGroupId: React.Dispatch<React.SetStateAction<string | null>>;
  groups: Group[];
  isLoading: boolean;
  error: Error | null;
};

const GROUP_STORAGE_KEY = "workorder_app_selected_group";

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const GroupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => {
    // Try to load from localStorage first
    const saved = localStorage.getItem(GROUP_STORAGE_KEY);
    return saved ? saved : null;
  });

  // Fetch all groups
  const { data: groups, isLoading, error } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data as Group[];
    },
    enabled: !!profile,
  });

  // Set default group when groups are loaded and no group is selected
  useEffect(() => {
    if (groups?.length && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // Persist selected group to localStorage
  useEffect(() => {
    if (selectedGroupId) {
      localStorage.setItem(GROUP_STORAGE_KEY, selectedGroupId);
    }
  }, [selectedGroupId]);

  return (
    <GroupContext.Provider
      value={{
        selectedGroupId,
        setSelectedGroupId,
        groups: groups || [],
        isLoading,
        error: error as Error | null,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
};

export const useGroup = (): GroupContextType => {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error("useGroup must be used within a GroupProvider");
  }
  return context;
};
