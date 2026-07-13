import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 w-full flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-slate-400" />
        </div>
        <h1 className="text-4xl font-display font-bold text-slate-900">404</h1>
        <p className="text-lg text-slate-600">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="pt-4">
          <Button asChild size="lg">
            <Link href="/">Return to Registration</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}