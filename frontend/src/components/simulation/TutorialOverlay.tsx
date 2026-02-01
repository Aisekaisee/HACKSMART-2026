import { useEffect, useState, useCallback, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { nextTutorialStep, prevTutorialStep, endTutorial } from "@/features/uiSlice";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { tutorialSteps } from "./tutorialSteps";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function TutorialOverlay() {
  const dispatch = useAppDispatch();
  const { tutorialActive, tutorialStep } = useAppSelector((state) => state.ui);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentStep = tutorialSteps[tutorialStep];
  const isFirstStep = tutorialStep === 0;
  const isLastStep = tutorialStep === tutorialSteps.length - 1;
  const isCenterStep = currentStep?.position === "center";

  // Calculate spotlight position based on target element
  const updateSpotlight = useCallback(() => {
    if (!currentStep || isCenterStep) {
      setSpotlightRect(null);
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const targetElement = document.querySelector(
      `[data-tutorial="${currentStep.target}"]`
    );

    if (!targetElement) {
      setSpotlightRect(null);
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    const padding = 12;

    // Check if element is too large (covers more than 60% of viewport)
    const isLargeElement = 
      (rect.width > window.innerWidth * 0.6) || 
      (rect.height > window.innerHeight * 0.6);

    // For large elements, show a subtle border highlight instead of full spotlight
    if (isLargeElement) {
      setSpotlightRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
      // Center the tooltip for large elements
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    setSpotlightRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    // Calculate tooltip position based on step configuration
    const tooltipWidth = 380;
    const tooltipHeight = 280;
    const gap = 20;

    let style: React.CSSProperties = { position: "fixed" };
    let finalTop: number;
    let finalLeft: number;

    switch (currentStep.position) {
      case "right":
        finalTop = Math.max(80, Math.min(rect.top, window.innerHeight - tooltipHeight - 40));
        finalLeft = rect.right + gap + padding;
        // Check if tooltip goes off right edge
        if (finalLeft + tooltipWidth > window.innerWidth - 20) {
          // Fall back to center
          style = { ...style, top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
        } else {
          style = { ...style, top: finalTop, left: finalLeft };
        }
        break;
      case "left":
        finalTop = Math.max(80, Math.min(rect.top, window.innerHeight - tooltipHeight - 40));
        finalLeft = rect.left - tooltipWidth - gap - padding;
        // Check if tooltip goes off left edge
        if (finalLeft < 20) {
          style = { ...style, top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
        } else {
          style = { ...style, top: finalTop, left: finalLeft };
        }
        break;
      case "bottom":
        finalTop = rect.bottom + gap + padding;
        finalLeft = Math.max(20, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 20));
        // Check if tooltip goes off bottom edge
        if (finalTop + tooltipHeight > window.innerHeight - 20) {
          style = { ...style, top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
        } else {
          style = { ...style, top: finalTop, left: finalLeft };
        }
        break;
      case "top":
        finalTop = rect.top - tooltipHeight - gap - padding;
        finalLeft = Math.max(20, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 20));
        // Check if tooltip goes off top edge
        if (finalTop < 80) {
          style = { ...style, top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
        } else {
          style = { ...style, top: finalTop, left: finalLeft };
        }
        break;
      default:
        style = {
          ...style,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        };
    }

    setTooltipStyle(style);
  }, [currentStep, isCenterStep]);

  // Update spotlight when step changes
  useEffect(() => {
    if (tutorialActive) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        updateSpotlight();
        setIsAnimating(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [tutorialActive, tutorialStep, updateSpotlight]);

  // Handle window resize
  useEffect(() => {
    if (!tutorialActive) return;

    const handleResize = () => updateSpotlight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [tutorialActive, updateSpotlight]);

  // Keyboard navigation
  useEffect(() => {
    if (!tutorialActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "Enter":
          if (!isLastStep) {
            dispatch(nextTutorialStep());
          } else {
            dispatch(endTutorial());
          }
          break;
        case "ArrowLeft":
          if (!isFirstStep) {
            dispatch(prevTutorialStep());
          }
          break;
        case "Escape":
          dispatch(endTutorial());
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tutorialActive, isFirstStep, isLastStep, dispatch]);

  if (!tutorialActive || !currentStep) return null;

  const handleNext = () => {
    if (isLastStep) {
      dispatch(endTutorial());
    } else {
      dispatch(nextTutorialStep());
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      dispatch(prevTutorialStep());
    }
  };

  const handleSkip = () => {
    dispatch(endTutorial());
  };

  // Create clip path for spotlight effect
  const getClipPath = () => {
    if (!spotlightRect) return "none";

    const { top, left, width, height } = spotlightRect;
    const borderRadius = 12;

    // Create a path that covers the entire screen except the spotlight area
    return `polygon(
      0% 0%,
      0% 100%,
      ${left}px 100%,
      ${left}px ${top + borderRadius}px,
      ${left + borderRadius}px ${top}px,
      ${left + width - borderRadius}px ${top}px,
      ${left + width}px ${top + borderRadius}px,
      ${left + width}px ${top + height - borderRadius}px,
      ${left + width - borderRadius}px ${top + height}px,
      ${left + borderRadius}px ${top + height}px,
      ${left}px ${top + height - borderRadius}px,
      ${left}px 100%,
      100% 100%,
      100% 0%
    )`;
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] pointer-events-auto"
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          // Click on overlay (not tooltip) - could optionally close or do nothing
        }
      }}
    >
      {/* Dark overlay with spotlight cutout */}
      <div
        className={`absolute inset-0 bg-black/80 transition-all duration-300 ease-out ${
          isAnimating ? "opacity-50" : "opacity-100"
        }`}
        style={{
          clipPath: spotlightRect ? getClipPath() : "none",
        }}
      />

      {/* Spotlight border glow effect */}
      {spotlightRect && (
        <div
          className="absolute pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
            borderRadius: 12,
            boxShadow: `
              0 0 0 2px rgba(99, 102, 241, 0.8),
              0 0 20px rgba(99, 102, 241, 0.4),
              0 0 40px rgba(99, 102, 241, 0.2),
              inset 0 0 20px rgba(99, 102, 241, 0.1)
            `,
          }}
        />
      )}

      {/* Tooltip Card */}
      <div
        className={`bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl p-6 w-[380px] transition-all duration-300 ease-out ${
          isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
        style={tooltipStyle}
      >
        {/* Decorative gradient border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 -z-10 blur-sm" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30">
              {currentStep.icon || <Sparkles className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">
                {currentStep.title}
              </h3>
              <p className="text-xs text-indigo-300/80 mt-0.5">
                Step {tutorialStep + 1} of {tutorialSteps.length}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSkip}
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/50 -mr-2 -mt-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Description */}
        <p className="text-slate-300 text-sm leading-relaxed mb-6">
          {currentStep.description}
        </p>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-700/50 rounded-full mb-5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((tutorialStep + 1) / tutorialSteps.length) * 100}%`,
            }}
          />
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-slate-400 hover:text-white hover:bg-slate-700/50 text-sm"
          >
            Skip Tutorial
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={isFirstStep}
              className="border-slate-600 bg-slate-800/50 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 min-w-[100px]"
            >
              {isLastStep ? (
                "Finish"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400 font-mono">
              ←
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400 font-mono">
              →
            </kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400 font-mono">
              Esc
            </kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
