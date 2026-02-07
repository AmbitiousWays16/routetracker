import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  hasSeenTour: boolean;
}

const TourContext = createContext<TourContextType | null>(null);

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="month-selector"]',
    title: 'Select Month',
    content: 'Use this to navigate between months and view your trip history for different time periods.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="mileage-summary"]',
    title: 'Mileage Summary',
    content: 'See your total miles and estimated reimbursement at a glance. The IRS rate is automatically applied.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="trip-entry"]',
    title: 'Add New Trip',
    content: 'Enter your trip details here. Select start and end addresses, choose a program, and add the purpose of your trip.',
    placement: 'top',
  },
  {
    target: '[data-tour="trip-list"]',
    title: 'Your Trips',
    content: 'View all your recorded trips here. Each trip shows the route, distance, and can be deleted if needed.',
    placement: 'top',
  },
  {
    target: '[data-tour="submit-voucher"]',
    title: 'Submit for Approval',
    content: 'When ready, submit your monthly mileage voucher for supervisor approval. You\'ll need to sign it before submitting.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="export-button"]',
    title: 'Export Your Data',
    content: 'Download your trips as a PDF voucher for your records or to share with your organization.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="profile-settings"]',
    title: 'Profile Settings',
    content: 'Update your name, job title, and manage your saved programs and addresses here.',
    placement: 'bottom',
  },
];

const TOUR_STORAGE_KEY = 'mileage-tracker-tour-completed';

export function TourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(true); // Default true to prevent flash

  // Check if user has seen the tour
  useEffect(() => {
    if (user) {
      const tourKey = `${TOUR_STORAGE_KEY}-${user.id}`;
      const seenValue = localStorage.getItem(tourKey);
      const hasSeen = seenValue === 'true';

      setHasSeenTour(hasSeen);

      // Auto-start tour only for truly first-time users.
      // Important: mark as "seen" immediately when we auto-start so it won't
      // keep popping up for returning users if they refresh/log out mid-tour.
      if (!hasSeen) {
        try {
          localStorage.setItem(tourKey, 'true');
        } catch {
          // Ignore storage errors (e.g., privacy mode). In that case the tour may
          // still re-appear on next login because we can't persist the flag.
        }
        setHasSeenTour(true);

        const timer = setTimeout(() => {
          setIsActive(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const markTourComplete = useCallback(() => {
    if (user) {
      const tourKey = `${TOUR_STORAGE_KEY}-${user.id}`;
      localStorage.setItem(tourKey, 'true');
      setHasSeenTour(true);
    }
  }, [user]);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    markTourComplete();
  }, [markTourComplete]);

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      endTour();
    }
  }, [currentStep, endTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skipTour = useCallback(() => {
    endTour();
  }, [endTour]);

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        steps: TOUR_STEPS,
        startTour,
        endTour,
        nextStep,
        prevStep,
        skipTour,
        hasSeenTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
