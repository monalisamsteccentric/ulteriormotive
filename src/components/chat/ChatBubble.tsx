import { Message } from "@/types/database";
import { cn } from "@/lib/utils";

export function ChatBubble({ message }: { message: Message }) {
  const isA = message.sender_role === "player_a";
  const isB = message.sender_role === "player_b";
  const label = isA ? "Player A" : isB ? "Player B" : message.sender_role === "audience" ? "Audience" : "System";

  return (
    <div className={cn("flex max-w-[84%] flex-col gap-1", isB && "ml-auto items-end", message.sender_role === "audience" && "max-w-full")}>
      <span className="text-xs font-black uppercase text-mist">{label}</span>
      <div
        className={cn(
          "rounded-lg border border-line bg-panel px-3 py-2 text-sm leading-6 text-white",
          isA && "border-neon/70",
          isB && "border-shock/70",
          message.sender_role === "system" && "border-violet/70 text-mist"
        )}
      >
        {message.message}
      </div>
    </div>
  );
}
