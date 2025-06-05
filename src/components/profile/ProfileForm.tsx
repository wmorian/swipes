// @/components/profile/ProfileForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  // Add fields for password change if needed, typically handled separately
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfileForm() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      avatarUrl: "",
    },
  });
  
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email,
        avatarUrl: user.avatarUrl || "",
      });
    }
  }, [user, form]);


  async function onSubmit(data: ProfileFormValues) {
    if (!user) return;
    setLoading(true);
    try {
      await updateUser({ ...user, ...data }); // Simulate update
      toast({
        title: "Profile Updated",
        description: "Your profile information has been successfully updated.",
      });
    } catch (error) {
       toast({
        title: "Update Failed",
        description: "Could not update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return <div>Loading profile...</div>;
  }
  
  const userInitials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : user.email[0].toUpperCase();

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">My Profile</CardTitle>
        <CardDescription>Manage your account settings and profile information.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem className="flex flex-col items-center">
                  <Avatar className="h-32 w-32 mb-4">
                    <AvatarImage src={field.value || `https://placehold.co/200x200.png?text=${userInitials}`} alt={user.name || "User Avatar"} data-ai-hint="user avatar placeholder" />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <FormControl>
                     <div className="relative w-full max-w-xs">
                      <Input type="text" placeholder="Image URL (e.g. https://...)" {...field} className="pl-10" />
                      <Camera className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormDescription className="text-center mt-2">
                    Enter a URL for your profile picture.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Your email address" {...field} disabled />
                  </FormControl>
                  <FormDescription>
                    Your email address cannot be changed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Password change section could be added here or as a separate component */}
            <Button type="submit" className="w-full md:w-auto bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
