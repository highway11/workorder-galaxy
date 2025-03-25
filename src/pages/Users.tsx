
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, User, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type UserRole = 'admin' | 'enter-only';

type UserData = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  groups: string[];
};

const Users = () => {
  useEffect(() => {
    document.title = "Users | WorkOrder App";
  }, []);

  // Mock data
  const users: UserData[] = [
    {
      id: "U001",
      name: "John Smith",
      email: "john.smith@example.com",
      role: "admin",
      groups: ["Building Maintenance", "Aquatic Centre"]
    },
    {
      id: "U002",
      name: "Sarah Johnson",
      email: "sarah.johnson@example.com",
      role: "enter-only",
      groups: ["West Wing"]
    },
    {
      id: "U003",
      name: "Michael Brown",
      email: "michael.brown@example.com",
      role: "admin",
      groups: ["Building Maintenance"]
    },
    {
      id: "U004",
      name: "Lisa Davis",
      email: "lisa.davis@example.com",
      role: "enter-only",
      groups: ["Cafeteria"]
    }
  ];

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'enter-only':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const formatRole = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'enter-only':
        return 'Enter Only';
      default:
        return role;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">Manage system users and their permissions</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Button asChild>
              <Link to="/users/new">
                <Plus className="mr-2 h-4 w-4" />
                New User
              </Link>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <CardTitle>All Users</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search users..."
                      className="pl-8 w-full sm:w-[260px]"
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden lg:table-cell">Groups</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <Link 
                                to={`/users/${user.id}`}
                                className="font-medium hover:underline text-primary"
                              >
                                {user.name}
                              </Link>
                              <span className="text-xs text-muted-foreground md:hidden">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getRoleBadgeClass(user.role)}>
                            {formatRole(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {user.groups.map((group, index) => (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                className="bg-background"
                              >
                                {group}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Users;
