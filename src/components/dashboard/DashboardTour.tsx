'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Layers, 
  Wallet, 
  HardHat, 
  Smartphone, 
  ClipboardCheck,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TourStep {
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  color: string;
  tag: string;
  features: string[];
}

export function DashboardTour({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TourStep[] = [
    {
      title: 'Welcome to ICONA',
      subtitle: 'Your Unified Construction Workspace',
      description: 'ICONA bridges your field operations and head office finance. Let’s take a 1-minute tour of the key modules in your portal.',
      icon: Zap,
      color: 'bg-orange-500 text-white',
      tag: 'Overview',
      features: [
        'Multi-tenant data isolation',
        'Automatic PKR general ledger matching',
        'Role-scoped access rights (Admin, Manager, Worker, Client)',
      ]
    },
    {
      title: 'Project Kanban Board',
      subtitle: 'Visual Lifecycle & BOQs',
      description: 'Track your projects through structured Kanban stages. Drill down to manage priced lines in the Bill of Quantities (BOQ).',
      icon: Layers,
      color: 'bg-indigo-500 text-white',
      tag: 'Project Control',
      features: [
        'Excel sheet template import',
        'Multi-level WBS hierarchy scoping',
        'Project revision history control',
      ]
    },
    {
      title: 'General Ledger & Cash Flow',
      subtitle: 'No More Spreadsheet Audits',
      description: 'Record every receipt and voucher. ICONA updates the cash-on-hand balances, project ledger, and P&L charts automatically.',
      icon: Wallet,
      color: 'bg-green-500 text-white',
      tag: 'Finance & Accounts',
      features: [
        'Asset bank account mapping',
        'Automated depreciation & interest scheduling',
        'Owner drawings & lender logs tracking',
      ]
    },
    {
      title: 'Daily Labor & Payroll Runs',
      subtitle: 'Site Records In Real-time',
      description: 'Register supervisors and trades, mark daily attendance sheets, and approve monthly payroll with single-click ledger updates.',
      icon: HardHat,
      color: 'bg-amber-500 text-white',
      tag: 'Labor Management',
      features: [
        'Daily wage logs & trade categorization',
        'One-click Overhead expense generation',
        'Active status monitoring',
      ]
    },
    {
      title: 'Mobile App Sync',
      subtitle: 'Built for Spotty Connectivity',
      description: 'Site engineers can mark labor sheets and upload taken photo vouchers directly from our offline-first Android application.',
      icon: Smartphone,
      color: 'bg-rose-500 text-white',
      tag: 'Mobile Operations',
      features: [
        'EXIF geolocation verification',
        'Offline queueing & background synchronization',
        'Push notifications for tasks & alerts',
      ]
    }
  ];

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const stepInfo = steps[currentStep];
  const IconComponent = stepInfo.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('icona_tour_completed', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-orange-100 text-orange-700">
              {stepInfo.tag}
            </span>
          </div>
          <button 
            onClick={handleComplete} 
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8 overflow-y-auto flex-1 flex flex-col items-center text-center space-y-6">
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg ${stepInfo.color} transform transition-transform scale-105 duration-300`}>
            <IconComponent className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 leading-tight">
              {stepInfo.title}
            </h2>
            <p className="text-sm font-semibold text-slate-500">
              {stepInfo.subtitle}
            </p>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md pt-2">
              {stepInfo.description}
            </p>
          </div>

          {/* Core features bulleted list */}
          <div className="w-full max-w-md bg-slate-50 p-4 rounded-xl border border-slate-100/60 text-left space-y-2.5">
            {stepInfo.features.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                <Check className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <span 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-5 bg-orange-600' : 'w-1.5 bg-slate-300'}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button 
                onClick={handlePrev} 
                variant="ghost" 
                className="text-xs text-slate-600 hover:text-slate-900 rounded-lg h-9 px-3"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Prev
              </Button>
            )}

            <Button 
              onClick={handleNext}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg h-9 px-4 text-xs font-semibold shadow-sm transition-all"
            >
              {currentStep === steps.length - 1 ? (
                'Finish'
              ) : (
                <span className="flex items-center gap-1">Next <ArrowRight className="h-3.5 w-3.5" /></span>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
