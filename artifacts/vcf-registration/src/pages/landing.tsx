import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRegisterPhone, useGetCommunityProgress, getGetCommunityProgressQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { downloadFile } from '@/lib/utils';
import { Building2, CheckCircle2, Download, Users, PartyPopper, MessageCircle } from 'lucide-react';

const registrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s+]/g, ''))
    .pipe(
      z
        .string()
        .regex(/^[1-9]\d{6,14}$/, "Include country code, no spaces or + sign (e.g. 254712345678)"),
    ),
});

// WhatsApp group invite link
const WHATSAPP_GROUP_URL =
  "https://chat.whatsapp.com/JsKmQMpECJMHyxucHquF15?s=cl&p=a&mlu=0&amv=1";

export default function LandingPage() {
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  const registerPhone = useRegisterPhone();
  const { data: progress } = useGetCommunityProgress({
    query: { refetchInterval: 15000, queryKey: getGetCommunityProgressQueryKey() },
  });

  const total = progress?.total ?? 0;
  const target = progress?.target ?? 90;
  const unlocked = progress?.unlocked ?? false;
  const remaining = Math.max(target - total, 0);
  const percent = Math.min((total / target) * 100, 100);

  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  function onSubmit(values: z.infer<typeof registrationSchema>) {
    registerPhone.mutate(
      {
        data: {
          name: values.name,
          phone: `+${values.phone}`,
        },
      },
      {
        onSuccess: () => {
          setIsSuccess(true);

          // Redirect to WhatsApp group after successful registration
          setTimeout(() => {
            window.location.href = WHATSAPP_GROUP_URL;
          }, 1000);
        },
        onError: (error: any) => {
          const message =
            error?.data?.error || "Registration failed. Please try again.";
          toast({
            title: "Registration Error",
            description: message,
            variant: "destructive",
          });
        },
      }
    );
  }

  const handleDownload = async () => {
    try {
      const url = `${import.meta.env.BASE_URL}api/download-vcf`;
      await downloadFile(url, "NUTTERX.vcf");
    } catch (err) {
      toast({
        title: "Download Failed",
        description: "The contact card isn't unlocked yet. Please try again once the target is reached.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-12 sm:py-16 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[70%] h-[40%] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg mx-auto relative z-10 flex flex-col items-center">
        {/* Brand header */}
        <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shadow-lg mb-6">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight text-center">
          Nutterx Technologies
        </h1>
        <p className="text-slate-400 mt-2 mb-8 text-center">VCF Registration</p>

        {/* Community progress */}
        <Card className="w-full bg-[#0d1220] border-slate-800 mb-6">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-200 font-medium">
                <Users className="w-4 h-4 text-blue-400" />
                Community Progress
              </div>
              <div className="font-semibold">
                <span className="text-blue-400">{total}</span>
                <span className="text-slate-500"> / {target}</span>
              </div>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-center text-slate-400 text-sm mt-4">
              {unlocked ? (
                <span className="text-blue-400 font-medium">Target reached — the VCF download is unlocked!</span>
              ) : (
                <><span className="font-semibold text-slate-200">{remaining}</span> more registrations to unlock the VCF download</>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Main card: download CTA once unlocked, otherwise the registration form */}
        {unlocked ? (
          <Card className="w-full bg-[#0d1220] border-slate-800">
            <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-5">
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center">
                <PartyPopper className="w-8 h-8 text-blue-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-display font-bold text-white">We hit the target!</h3>
                <p className="text-slate-400">
                  Nutterx Technologies' official contact card is ready. Download it and save it to your phone.
                </p>
              </div>
              <Button
                onClick={handleDownload}
                size="lg"
                className="w-full h-14 text-lg font-bold gap-3 bg-blue-600 hover:bg-blue-500"
              >
                <Download className="w-5 h-5" />
                Download Contact
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full h-14 text-lg font-bold gap-3 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              >
                <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5" />
                  Join WhatsApp Group
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full bg-[#0d1220] border-slate-800">
            {!isSuccess ? (
              <>
                <CardHeader className="space-y-2 pb-2">
                  <CardTitle className="text-xl text-white">Join the Network</CardTitle>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Register your phone number to join our WhatsApp community and unlock the contact card.
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 font-medium">Full Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Nutterx Tech"
                                className="h-12 bg-slate-100 text-slate-900 border-0"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200 font-medium">Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="254758891491"
                                inputMode="numeric"
                                className="h-12 bg-slate-100 text-slate-900 border-0"
                                {...field}
                              />
                            </FormControl>
                            <p className="text-xs text-slate-500">
                              Include country code, no spaces or + sign (e.g. 254712345678)
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-500"
                        disabled={registerPhone.isPending}
                      >
                        {registerPhone.isPending ? "Registering..." : "Register & Join"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-display font-bold text-white">You're in!</h3>
                  <p className="text-slate-400">
                    Thanks for joining. Redirecting you to the WhatsApp group — if it doesn't open automatically, tap below.
                  </p>
                </div>
                <Button
                  asChild
                  className="w-full h-12 text-base font-semibold gap-2 bg-blue-600 hover:bg-blue-500"
                >
                  <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-5 h-5" />
                    Join WhatsApp Group
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    form.reset();
                    setIsSuccess(false);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  Register another number
                </Button>
              </div>
            )}
          </Card>
        )}

        <p className="text-slate-600 text-sm mt-10 text-center">
          © {new Date().getFullYear()} Nutterx Technologies. All rights reserved.
        </p>
      </div>
    </div>
  );
}
