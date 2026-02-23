import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const faqs = [
  {
    q: "How do you play?",
    a: "Everyone receives the same secret word except the imposter. Take turns giving a one-word hint, then vote to kick out who you think is faking it.",
  },
  {
    q: "How do I win as the imposter?",
    a: "Blend in! Listen carefully to the hints other players give to figure out what the word might be, then give a convincing hint of your own.",
  },
  {
    q: "What happens if the wrong person gets voted out?",
    a: "If an ally gets voted out, the game continues. If the imposter gets voted out, the allies win immediately!",
  },
  {
    q: "Can I say the exact word as my hint?",
    a: "No. Saying the word directly is against the rules. Your hint should relate to the word without giving it away outright.",
  },
  {
    q: "How many players do I need?",
    a: "You need at least 3 players to start a game. The more players, the harder it is to spot the imposter!",
  },
  {
    q: "Does the imposter get a hint?",
    a: "That depends on the lobby settings. The host can enable 'Imposter hint' mode, where the imposter is assigned a word that somewhat hints at the actual word of the allies.",
  },
];

export default function FAQButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size={"lg"}
        className="border-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-semibold hover:cursor-pointer"
      >
        FAQ
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-none shadow-2xl">
          <DialogHeader className="border-b border-indigo-100 pb-4">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Frequently Asked Questions
            </DialogTitle>
            <p className="text-slate-500 text-sm">
              Everything you need to know before you play
            </p>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {faqs.map((faq, i) => (
              <div key={i} className="space-y-1.5">
                <p className="font-semibold text-slate-800 flex items-start gap-2">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center flex-shrink-0 font-bold">
                    {i + 1}
                  </span>
                  {faq.q}
                </p>
                <p className="text-slate-500 text-sm leading-relaxed pl-7">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-indigo-100 mt-2">
            <Button
              onClick={() => setOpen(false)}
              className="w-full py-5 font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transition-all"
            >
              Go back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
