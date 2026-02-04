import { useEffect, useState, useCallback } from 'react';
import { useTour } from '@/contexts/TourContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TooltipPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

export function TourOverlay() {
  const { isActive, currentStep, steps, nextStep, prevStep, skipTour } = useTour();
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const calculatePosition = useCallback(() => {
    const step = steps[currentStep];
    if (!step) return;

    const element = document.querySelector(step.target);
    if (!element) {
      // If element not found, try next step after a delay
      const timer = setTimeout(() => {
        if (currentStep < steps.length - 1) {
          nextStep();
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    const rect = element.getBoundingClientRect();
    setTargetRect(rect);

    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const padding = 16;
    const arrowOffset = 12;

    let top = 0;
    let left = 0;
    let placement = step.placement || 'bottom';

    // Calculate position based on placement
    switch (placement) {
      case 'top':
        top = rect.top - tooltipHeight - arrowOffset;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + arrowOffset;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - arrowOffset;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + arrowOffset;
        break;
    }

    // Ensure tooltip stays within viewport
    if (left < padding) left = padding;
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - tooltipWidth - padding;
    }
    if (top < padding) {
      // Flip to bottom if too close to top
      top = rect.bottom + arrowOffset;
      placement = 'bottom';
    }
    if (top + tooltipHeight > window.innerHeight - padding) {
      // Flip to top if too close to bottom
      top = rect.top - tooltipHeight - arrowOffset;
      placement = 'top';
    }

    setPosition({ top, left, placement });
  }, [currentStep, steps, nextStep]);

  useEffect(() => {
    if (!isActive) {
      setPosition(null);
      setTargetRect(null);
      return;
    }

    calculatePosition();

    // Recalculate on resize or scroll
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [isActive, calculatePosition]);

  if (!isActive || !position || !targetRect) return null;

  const step = steps[currentStep];

  return (
    <>
      {/* Dark overlay with spotlight cutout */}
      <div className="fixed inset-0 z-[100] pointer-events-none">
        <svg className="w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      {/* Highlighted element border */}
      <div
        className="fixed z-[101] pointer-events-none rounded-lg ring-4 ring-primary ring-offset-2 ring-offset-background"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        }}
      />

      {/* Click blocker (allows clicking the skip/nav buttons) */}
      <div className="fixed inset-0 z-[102]" onClick={skipTour} />

      {/* Tooltip */}
      <Card
        className={cn(
          'fixed z-[103] w-80 shadow-2xl border-primary/20 animate-in fade-in-0 zoom-in-95 duration-200',
          position.placement === 'top' && 'slide-in-from-bottom-2',
          position.placement === 'bottom' && 'slide-in-from-top-2',
          position.placement === 'left' && 'slide-in-from-right-2',
          position.placement === 'right' && 'slide-in-from-left-2'
        )}
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                {currentStep + 1}
              </div>
              <CardTitle className="text-lg">{step.title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={skipTour}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{step.content}</p>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-0">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button size="sm" onClick={nextStep} className="gap-1">
              {currentStep === steps.length - 1 ? (
                'Finish'
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}

// Button to restart the tour
export function TourHelpButton() {
  const { startTour, isActive } = useTour();

  if (isActive) return null;

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={startTour}
      title="Take a tour"
      className="h-9 w-9"
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  );
}
