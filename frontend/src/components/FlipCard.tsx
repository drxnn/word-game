import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { GameOptions } from "shared-types";

type FlipCardProps = {
  word?: string;
  isImposter: boolean;
  options: GameOptions;
};

export default function FlipCard({ word, isImposter, options }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="w-auto h-56 mx-auto" style={{ perspective: "1000px" }}>
      <div
        className="relative w-full h-full transition-transform duration-700 cursor-pointer"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <Card
          className="absolute w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 border-none shadow-2xl"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="text-center space-y-4 p-6">
            <h2 className="text-2xl font-bold text-white">
              Tap to reveal word
            </h2>
          </div>
        </Card>

        <Card
          className="absolute w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500 to-orange-500 border-none shadow-2xl"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="text-center space-y-2 p-6">
            {isImposter ? (
              <>
                <div className="text-4xl">🕵️</div>
                <h2 className="text-2xl font-bold text-white">
                  You are the imposter.
                </h2>

                {options.imposterHint && (
                  <>
                    <h2 className="text-xl font-bold text-white">
                      Your hint is:
                    </h2>
                    <p className="text-pink-100 text-md italic">{word}</p>
                  </>
                )}
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-white">Your word is:</h2>
                <p className="text-pink-100 text-md italic">{word}</p>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
