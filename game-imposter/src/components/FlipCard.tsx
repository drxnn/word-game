import React, { useState } from "react";
import { Card } from "@/components/ui/card";

export default function FlipCard() {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-8">
      <div className="w-80 h-56" style={{ perspective: "1000px" }}>
        <div
          className="relative w-full h-full transition-transform duration-700 cursor-pointer"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front of card */}
          <Card
            className="absolute w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 border-none shadow-2xl"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="text-center space-y-4 p-6">
              <div className="text-6xl">🎴</div>
              <h2 className="text-2xl font-bold text-white">
                Click to reveal word
              </h2>
              <p className="text-blue-100 text-sm">Tap the card to flip</p>
            </div>
          </Card>

          {/* Back of card */}
          <Card
            className="absolute w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500 to-orange-500 border-none shadow-2xl"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="text-center space-y-4 p-6">
              <div className="text-6xl">✨</div>
              <h2 className="text-4xl font-bold text-white">Serendipity</h2>
              <p className="text-pink-100 text-sm italic">
                The occurrence of events by chance in a happy way
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
