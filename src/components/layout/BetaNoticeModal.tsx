"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";

const STORAGE_KEY = "ulterior_motive_beta_notice_seen";
const feedbackHref = "/how-to-play#beta-feedback";

export function BetaNoticeModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.querySelector<HTMLButtonElement>("[data-beta-continue]")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function close() {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }

  function goToFeedback() {
    close();
    if (window.location.pathname === "/how-to-play") {
      window.setTimeout(() => {
        document.getElementById("beta-feedback")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
      return;
    }
    router.push(feedbackHref);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== "Tab" || !modalRef.current) return;

    const focusable = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hasAttribute("disabled"));

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/78 px-4 py-6 backdrop-blur-md" onKeyDown={handleKeyDown}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Ulterior Motive beta notice"
        className="w-full max-w-lg rounded-lg border border-shock/70 bg-ink p-5 shadow-glow outline-none sm:p-6"
      >
        <p className="text-sm font-black uppercase text-neon sm:text-xs">Beta notice</p>
        <h2 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">Ulterior Motive is in Beta</h2>
        <p className="mt-4 text-base font-bold leading-7 text-mist sm:text-lg sm:leading-8">
          This game is currently in beta. You may experience bugs, errors, incomplete features, match issues, voting issues, or unexpected
          behavior.
        </p>
        <p className="mt-3 text-base font-bold leading-7 text-white">
          If you face any problem or have suggestions, please share your feedback through the feedback form on the How to Play page.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button type="button" onClick={goToFeedback}>
            Go to Feedback Form
          </Button>
          <Button type="button" variant="ghost" data-beta-continue onClick={close}>
            Continue to Game
          </Button>
        </div>
      </div>
    </div>
  );
}
