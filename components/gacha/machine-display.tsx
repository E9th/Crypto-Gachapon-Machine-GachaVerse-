"use client"

import Image from "next/image"
import { Coins } from "lucide-react"
import { SPIN } from "@/lib/economy"

interface MachineDisplayProps {
  isSpinning: boolean
  showCapsule: boolean
}

export function MachineDisplay({ isSpinning, showCapsule }: MachineDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full">
      {/* Machine Container */}
      <div
        className={`relative w-full max-w-[280px] sm:max-w-sm border-2 border-foreground rounded-2xl bg-card shadow-hard sm:shadow-hard-lg overflow-hidden will-change-transform ${
          isSpinning ? "animate-machine-shake" : ""
        }`}
      >
        {/* Machine Image */}
        <div className="relative aspect-[3/4] w-full">
          <Image
            src="/images/gacha-machine.png"
            alt="Gachapon vending machine"
            fill
            sizes="(max-width: 640px) 280px, 384px"
            className="object-contain"
            priority
          />

          {/* Spinning Overlay */}
          {isSpinning && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/60">
              <div className="flex flex-col items-center gap-2 sm:gap-3">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-primary border-t-transparent rounded-full animate-spin will-change-transform" />
                <span className="font-sans text-xs sm:text-sm text-foreground">Spinning...</span>
              </div>
            </div>
          )}

          {/* Capsule Drop Animation */}
          {showCapsule && !isSpinning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-capsule-drop will-change-transform">
                <div className="relative w-16 h-16 sm:w-24 sm:h-24">
                  <Image
                    src="/images/capsule.png"
                    alt="Gachapon capsule"
                    fill
                    sizes="(max-width: 640px) 64px, 96px"
                    className="object-contain rounded-full border-2 border-foreground"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Price Label */}
      <p className="font-sans text-[10px] sm:text-xs text-muted-foreground tracking-wide">
        <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline-block mr-1 -mt-0.5" />
        1 Spin = {SPIN.COST} GACHA
      </p>
    </div>
  )
}
