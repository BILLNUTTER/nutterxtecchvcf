import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { 
  useGetAdminSession, 
  useAdminLogout, 
  useGetStats, 
  getGetStatsQueryKey,
  useListRegistrations,
  useDeleteRegistration,
  useGetVcfSettings,
  getGetVcfSettingsQueryKey,
  useUpdateVcfSettings,
  getListRegistrationsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { downloadFile, fileToBase64 } from '@/lib/utils';
import { 
  Building2, LogOut, Users, Calendar, BarChart3, 
  Search, Download, Trash2, Settings, Loader2, ImagePlus
} from 'lucide-react';

const vcfSettingsSchema = z.object({
  companyName: z.string().min(1, "Company Name is required"),
  contactName: z.string().min(1, "Contact Name is required"),
  phone: z.string(),
  email: z.string().email().or(z.literal("")),
  website: z.string(),
  address: z.string(),
  whatsapp: z.string(),
  logoDataUrl: z.string().nullable().optional(),
  registrationTarget: z.coerce.number().int().min(1, "Target must be at least 1"),
});

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Session check
  const { data: session, isLoading: isSessionLoading } = useGetAdminSession();
  
  // Stats
  const { data: stats } = useGetStats({ query: { enabled: !!session?.authenticated, queryKey: getGetStatsQueryKey() } });
  
  // Registrations state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Registrations Query
  const registrationsQueryParams = { search: debouncedSearch || undefined, page, limit };
  const { data: registrationsData, isLoading: isRegistrationsLoading } = useListRegistrations(
    registrationsQueryParams,
    { query: { enabled: !!session?.authenticated, queryKey: getListRegistrationsQueryKey(registrationsQueryParams) } }
  );

  // Mutations
  const logout = useAdminLogout();
  const deleteRegistration = useDeleteRegistration();
  
  // Settings Query & Form
  const { data: vcfSettings } = useGetVcfSettings({ query: { enabled: !!session?.authenticated, queryKey: getGetVcfSettingsQueryKey() } });
  const updateSettings = useUpdateVcfSettings();

  const settingsForm = useForm<z.infer<typeof vcfSettingsSchema>>({
    resolver: zodResolver(vcfSettingsSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      phone: "",
      email: "",
      website: "",
      address: "",
      whatsapp: "",
      logoDataUrl: null,
      registrationTarget: 500,
    },
  });

  useEffect(() => {
    if (vcfSettings) {
      settingsForm.reset({
        companyName: vcfSettings.companyName || "",
        contactName: vcfSettings.contactName || "",
        phone: vcfSettings.phone || "",
        email: vcfSettings.email || "",
        website: vcfSettings.website || "",
        address: vcfSettings.address || "",
        whatsapp: vcfSettings.whatsapp || "",
        logoDataUrl: vcfSettings.logoDataUrl || null,
        registrationTarget: vcfSettings.registrationTarget ?? 500,
      });
    }
  }, [vcfSettings, settingsForm]);

  useEffect(() => {
    if (!isSessionLoading && !session?.authenticated) {
      setLocation('/admin/login');
    }
  }, [isSessionLoading, session, setLocation]);

  if (isSessionLoading || !session?.authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation('/admin/login');
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this registration?")) return;
    
    deleteRegistration.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRegistrationsQueryKey() });
        toast({ title: "Deleted", description: "Registration removed." });
      },
      onError: () => {
        toast({ title: "Error", description: "Could not delete registration.", variant: "destructive" });
      }
    });
  };

  const handleExportCsv = async () => {
    try {
      const url = `${import.meta.env.BASE_URL}api/admin/registrations/export`;
      await downloadFile(url, `registrations-${format(new Date(), 'yyyy-MM-dd')}.csv`, true);
      toast({ title: "Success", description: "Export downloaded successfully." });
    } catch (err) {
      toast({ title: "Export Failed", description: "Could not export data.", variant: "destructive" });
    }
  };

  const onSaveSettings = (values: z.infer<typeof vcfSettingsSchema>) => {
    updateSettings.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Settings Saved", description: "VCF details updated successfully." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update settings.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-lg text-slate-900 tracking-tight">Nutterx Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 hidden sm:inline-block">
              Logged in as <span className="text-slate-900">{session.username}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-600 hover:text-red-600 hover:bg-red-50">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Registrations</p>
                <h3 className="text-3xl font-display font-bold text-slate-900">{stats?.totalRegistrations || 0}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Today</p>
                <h3 className="text-3xl font-display font-bold text-slate-900">{stats?.todayRegistrations || 0}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">This Week</p>
                <h3 className="text-3xl font-display font-bold text-slate-900">{stats?.weekRegistrations || 0}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* VCF unlock target progress */}
        <Card className="bg-white border-slate-200 shadow-sm mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500">VCF unlock progress</p>
              <p className="text-sm font-semibold text-slate-900">
                {stats?.totalRegistrations || 0} / {vcfSettings?.registrationTarget ?? 500}
              </p>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(((stats?.totalRegistrations || 0) / (vcfSettings?.registrationTarget || 500)) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Change the target in VCF Settings below.
            </p>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="registrations" className="w-full">
          <TabsList className="mb-6 h-12 px-2 bg-slate-200/50">
            <TabsTrigger value="registrations" className="h-9 px-6 font-medium">Registrations</TabsTrigger>
            <TabsTrigger value="settings" className="h-9 px-6 font-medium">VCF Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="registrations" className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">Contact Database</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input 
                      placeholder="Search name or phone..." 
                      className="pl-9 h-9 bg-white"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" className="h-9 gap-2 whitespace-nowrap" onClick={handleExportCsv}>
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-slate-200">
                        <TableHead className="font-semibold text-slate-700 pl-6">Name</TableHead>
                        <TableHead className="font-semibold text-slate-700">Phone</TableHead>
                        <TableHead className="font-semibold text-slate-700">Date Registered</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isRegistrationsLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                            Loading records...
                          </TableCell>
                        </TableRow>
                      ) : registrationsData?.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                            No registrations found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        registrationsData?.items.map((reg) => (
                          <TableRow key={reg.id} className="border-slate-100 hover:bg-slate-50/50">
                            <TableCell className="pl-6 font-medium text-slate-900">{reg.name}</TableCell>
                            <TableCell className="text-slate-600">{reg.phone}</TableCell>
                            <TableCell className="text-slate-500">
                              {format(new Date(reg.createdAt), 'MMM d, yyyy h:mm a')}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDelete(reg.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination (Simple) */}
                {registrationsData && registrationsData.total > limit && (
                  <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-xl">
                    <span className="text-sm text-slate-500">
                      Showing {Math.min((page - 1) * limit + 1, registrationsData.total)} to {Math.min(page * limit, registrationsData.total)} of {registrationsData.total}
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={page * limit >= registrationsData.total}
                        onClick={() => setPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="border-slate-200 shadow-sm max-w-3xl">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="w-5 h-5 text-slate-500" />
                  VCF Card Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Form {...settingsForm}>
                  <form onSubmit={settingsForm.handleSubmit(onSaveSettings)} className="space-y-8">
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative w-20 h-20 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 group">
                          {settingsForm.watch('logoDataUrl') ? (
                            <img src={settingsForm.watch('logoDataUrl')!} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            <Building2 className="w-8 h-8 text-slate-400" />
                          )}
                          <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white">
                            <ImagePlus className="w-6 h-6" />
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/png, image/jpeg" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const base64 = await fileToBase64(file);
                                    settingsForm.setValue('logoDataUrl', base64, { shouldDirty: true });
                                  } catch (err) {
                                    toast({ title: "Error", description: "Failed to read image", variant: "destructive" });
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">Company Logo</h4>
                          <p className="text-sm text-slate-500">Recommended size: 200x200px PNG or JPG.</p>
                          {settingsForm.watch('logoDataUrl') && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2 mt-1 text-red-600 hover:bg-red-50 -ml-2"
                              onClick={() => settingsForm.setValue('logoDataUrl', null, { shouldDirty: true })}
                            >
                              Remove Logo
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={settingsForm.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Nutterx Technologies" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={settingsForm.control}
                          name="contactName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Sales Team or John Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={settingsForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="+1234567890" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={settingsForm.control}
                          name="whatsapp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>WhatsApp Number</FormLabel>
                              <FormControl>
                                <Input placeholder="+1234567890" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={settingsForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input placeholder="contact@company.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={settingsForm.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://company.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={settingsForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Physical Address</FormLabel>
                              <FormControl>
                                <Input placeholder="123 Tech Park, Silicon Valley" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={settingsForm.control}
                          name="registrationTarget"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>VCF Unlock Target</FormLabel>
                              <FormControl>
                                <Input type="number" min={1} placeholder="500" {...field} />
                              </FormControl>
                              <p className="text-xs text-slate-500">
                                Number of registrations required before the contact card becomes downloadable to everyone.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                      <Button 
                        type="submit" 
                        disabled={updateSettings.isPending || !settingsForm.formState.isDirty}
                      >
                        {updateSettings.isPending ? "Saving..." : "Save Settings"}
                      </Button>
                    </div>

                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </main>
    </div>
  );
}