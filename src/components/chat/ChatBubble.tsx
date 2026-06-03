import { Message } from "@/types/database";
import { cn } from "@/lib/utils";

export function ChatBubble({ message }: { message: Message }) {
  const isA = message.sender_role === "player_a";
  const isB = message.sender_role === "player_b";
  const label = isA ? "Player A" : isB ? "Player B" : message.sender_role === "audience" ? "Audience" : "System";

  return (
    <div className={cn("chat-message flex max-w-[94%] flex-col gap-1 sm:max-w-[86%]", isB && "ml-auto items-end", message.sender_role === "audience" && "max-w-full")}>
      <span className="text-sm font-black uppercase text-mist sm:text-xs">{label}</span>
      <div
        className={cn(
          "chat-message__bubble break-words rounded-lg border border-line bg-panel px-3 py-3 text-base font-semibold leading-7 text-white sm:px-3 sm:py-2 sm:text-sm sm:leading-6 lg:px-5 lg:py-4 lg:text-lg lg:leading-8",
          isA && "chat-message__bubble--a",
          isB && "chat-message__bubble--b",
          message.sender_role === "system" && "chat-message__bubble--system text-mist"
        )}
      >
        {message.message}
      </div>
    </div>
  );
}
