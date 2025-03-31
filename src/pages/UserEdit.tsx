import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, ArrowLeft, UserCircle, Key, Mail, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import UserGroupsManager from '@/components/users/UserGroupsManager';
import { useAuth } from '@/contexts/AuthContext';

// Form schemas
const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  role: z.enum(["admin", "manager", "enter-only"], {
    required_error: "Please select a role",
  }),
});

const passwordFormSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const UserEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  
  const isEditing = id !== user?.id;

  useEffect(() => {
    document.title = "Edit User | WorkOrder App";
  }, []);

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "enter-only" as const,
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Fetch user data
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      if (!id) throw new Error("User ID is required");
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          role
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error("User not found");
      
      return data;
    },
    enabled: !!id
  });

  // Set form values when user data is loaded
  useEffect(() => {
    if (userData) {
      profileForm.reset({
        name: userData.name,
        email: userData.email,
        role: userData.role as "admin" | "manager" | "enter-only",
      });
    }
  }, [userData, profileForm]);

  // Update profile mutation using the edge function
  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!id) throw new Error("User ID is required");
      
      console.log("Updating profile with values:", values);
      
      // Use the edge function for admin updates
      const { data, error } = await supabase.functions.invoke('admin-update-user', {
        body: {
          userId: id,
          updateType: 'profile',
          updates: {
            name: values.name,
            role: values.role
          }
        }
      });
      
      if (error) {
        console.error("Update error:", error);
        throw error;
      }
      
      // Also update email if it changed
      if (userData?.email !== values.email) {
        const { error: emailError } = await supabase.functions.invoke('admin-update-user', {
          body: {
            userId: id,
            updateType: 'email',
            updates: {
              email: values.email
            }
          }
        });
        
        if (emailError) {
          console.error("Email update error:", emailError);
          throw emailError;
        }
      }
      
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate all queries for this user to ensure data is refreshed
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      // Also invalidate the users list query to update the listing
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      toast({
        title: "Success",
        description: "User profile updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update user profile: " + (error?.message || error),
        variant: "destructive",
      });
    }
  });

  // Update password mutation using the edge function
  const updatePasswordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      if (!id) throw new Error("User ID is required");
      
      const { data, error } = await supabase.functions.invoke('admin-update-user', {
        body: {
          userId: id,
          updateType: 'password',
          updates: {
            password: values.password
          }
        }
      });
      
      if (error) {
        console.error("Password update error:", error);
        throw error;
      }
      
      return { success: true };
    },
    onSuccess: () => {
      passwordForm.reset({
        password: "",
        confirmPassword: "",
      });
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
    },
    onError: (error) => {
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: "Failed to update password: " + (error?.message || error),
        variant: "destructive",
      });
    }
  });

  // Handle profile form submission
  const onProfileSubmit = async (values: ProfileFormValues) => {
    setIsSaving(true);
    try {
      await updateProfileMutation.mutateAsync(values);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password form submission
  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setIsSaving(true);
    try {
      await updatePasswordMutation.mutateAsync(values);
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string = "") => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Handle errors from user query
  useEffect(() => {
    if (isLoadingUser) return;
    
    if (!userData && id) {
      console.error("User not found");
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
    }
  }, [isLoadingUser, userData, id, toast]);

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/users')}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
            <p className="text-muted-foreground">
              Update user information and permissions
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {isLoadingUser ? (
            <div className="flex justify-center py-8">
              <p>Loading user data...</p>
            </div>
          ) : userData ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {getInitials(userData.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">{userData.name}</h2>
                  <p className="text-sm text-muted-foreground">{userData.email}</p>
                </div>
              </div>

              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                  <TabsTrigger value="profile">
                    <UserCircle className="h-4 w-4 mr-2" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="password">
                    <Key className="h-4 w-4 mr-2" />
                    Password
                  </TabsTrigger>
                  <TabsTrigger value="groups">
                    <Users className="h-4 w-4 mr-2" />
                    Groups
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>
                        Update the user's profile details
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                          <FormField
                            control={profileForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter email" type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Separator className="my-4" />
                          
                          <FormField
                            control={profileForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel>User Role</FormLabel>
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="role-admin"
                                      checked={field.value === 'admin'}
                                      onCheckedChange={() => field.onChange('admin')}
                                    />
                                    <label
                                      htmlFor="role-admin"
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      Admin (Full access to all features)
                                    </label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="role-manager"
                                      checked={field.value === 'manager'}
                                      onCheckedChange={() => field.onChange('manager')}
                                    />
                                    <label
                                      htmlFor="role-manager"
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      Manager (Can manage all except users and settings)
                                    </label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="role-enter-only"
                                      checked={field.value === 'enter-only'}
                                      onCheckedChange={() => field.onChange('enter-only')}
                                    />
                                    <label
                                      htmlFor="role-enter-only"
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                      Enter-Only (Limited access)
                                    </label>
                                  </div>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit" 
                            className="w-full" 
                            disabled={!profileForm.formState.isDirty || isSaving}
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="password">
                  <Card>
                    <CardHeader>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>
                        Update the user's password
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                          <FormField
                            control={passwordForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Enter new password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={passwordForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Confirm new password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit" 
                            className="w-full" 
                            disabled={
                              !passwordForm.formState.isDirty || 
                              isSaving || 
                              passwordForm.getValues('password') !== passwordForm.getValues('confirmPassword')
                            }
                          >
                            <Key className="mr-2 h-4 w-4" />
                            Update Password
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="groups">
                  <Card>
                    <CardHeader>
                      <CardTitle>Group Assignments</CardTitle>
                      <CardDescription>
                        Manage which groups this user belongs to
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {userData && <UserGroupsManager userId={userData.id} />}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <p>User not found</p>
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default UserEdit;
