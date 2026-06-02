import { Message } from "@/types/database";
import { cn } from "@/lib/utils";

export function ChatBubble({ message }: { message: Message }) {
  const isA = message.sender_role === "player_a";
  const isB = message.sender_role === "player_b";
  const label = isA ? "Player A" : isB ? "Player B" : message.sender_role === "audience" ? "Audience" : "System";

  return (
    <div className={cn("flex max-w-[94%] flex-col gap-1 sm:max-w-[86%]", isB && "ml-auto items-end", message.sender_role === "audience" && "max-w-full")}>
      <span className="text-sm font-black uppercase text-mist sm:text-xs">{label}</span>
      <div
        className={cn(
          "rounded-lg border border-line bg-panel px-5 py-4 text-lg font-semibold leading-8 text-white sm:px-3 sm:py-2 sm:text-sm sm:leading-6",
          isA && "border-neon/70",
          isB && "border-shock/70",
          message.sender_role === "system" && "border-violet/70 bg-violet/10 text-mist"
        )}
      >
        {message.message}
      </div>
    </div>
  );
}
