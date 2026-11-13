"use client";

import React, { useEffect } from "react";
import {
  X,
  Gift,
  User,
  Zap,
  ChevronRight,
} from "lucide-react";

interface NavigationMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenClaim: () => void;
  onOpenAboutDev: () => void;
}

export function NavigationMenu({
  isOpen,
  onClose,
  onOpenClaim,
  onOpenAboutDev,
}: NavigationMenuProps) {
  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Menu"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Slide-over Drawer (Seamless on both PC and Mobile) */}
      <div
        className="w-full max-w-[340px] sm:max-w-sm h-full bg-[#FFFFFF] border-l border-[#E5E7EB] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drawer Header */}
        <div>
          <div className="h-16 px-5 border-b border-[#F4F4F4] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0D0D0D] flex items-center justify-center text-white shadow-xs">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base tracking-tight text-[#0D0D0D]">
                  SolTrace
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#5D5D5D] hover:text-[#0D0D0D] hover:bg-[#F4F4F4] transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Menu Items Container */}
          <div className="p-4 sm:p-5 space-y-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#8F8F8F] px-1 font-semibold">
              Features & Profile
            </div>

            <div className="space-y-2.5">
              {/* 1. "Claim" Button */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenClaim();
                }}
                className="w-full text-left p-3.5 rounded-2xl bg-[#FFFFFF] hover:bg-[#F8F9FA] active:bg-[#F0F0F0] border border-[#E5E7EB] hover:border-[#0D0D0D]/20 shadow-xs transition-all group cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Gift className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-[#0D0D0D]">
                        Claim
                      </span>
                    </div>
                    <p className="text-xs text-[#5D5D5D] mt-0.5">
                      Check a wallet against the saved list
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8F8F8F] group-hover:text-[#0D0D0D] group-hover:translate-x-0.5 transition-all" />
              </button>

              <div className="px-3.5 py-3 rounded-2xl bg-[#F8F9FA] border border-[#E5E7EB] text-xs text-[#5D5D5D] leading-relaxed">
                <p className="font-semibold text-[#0D0D0D]">Who can get a rebate</p>
                <p className="mt-1">You sold this token at a loss of at least $5.</p>
                <p className="mt-1">The loss is from a buy of this token. A plain transfer does not count, and a gain does not cancel a loss.</p>
                <p className="mt-1">The SOL in the vault is shared by loss. A bigger loss gets a bigger share. There is no minimum hold, and you do not sign anything.</p>
                <p className="mt-1">If your address is not on the saved list, you are not eligible.</p>
              </div>

              {/* 2. "About Dev" Button */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAboutDev();
                }}
                className="w-full text-left p-3.5 rounded-2xl bg-[#FFFFFF] hover:bg-[#F8F9FA] active:bg-[#F0F0F0] border border-[#E5E7EB] hover:border-[#0D0D0D]/20 shadow-xs transition-all group cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0D0D0D] text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                    <User className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-[#0D0D0D]">
                        About Dev
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold bg-[#F4F4F4] text-[#0D0D0D] border border-[#E5E7EB]">
                        nerfed_killua
                      </span>
                    </div>
                    <p className="text-xs text-[#5D5D5D] mt-0.5">
                      Bio, how it works & links
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8F8F8F] group-hover:text-[#0D0D0D] group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
