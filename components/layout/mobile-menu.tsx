"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

// Modal <dialog> (ui-context §8: dialogs trap/restore focus). showModal makes the page inert, Esc closes,
// and the browser returns focus to the Menu button on close.
export function MobileMenu({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  // Close on backdrop click (target is the dialog itself) or after following a link.
  const onClick = (e: MouseEvent<HTMLDialogElement>) => {
    const target = e.target;
    if (target === e.currentTarget || (target instanceof Element && target.closest("a"))) ref.current?.close();
  };

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
        className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md border border-input px-3 text-sm font-medium hover:bg-raised md:hidden"
      >
        <Menu aria-hidden className="size-5" />
        <span>Menu</span>
      </button>
      <dialog
        ref={ref}
        aria-labelledby="vp-nav-menu-title"
        onClick={onClick}
        className="m-0 mt-auto w-full max-w-full rounded-t-xl border-t border-border bg-popover p-4 text-popover-foreground backdrop:bg-scrim"
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 id="vp-nav-menu-title" className="text-base font-semibold">More</h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-raised"
          >
            <X aria-hidden className="size-5" />
            <span className="sr-only">Close menu</span>
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}
