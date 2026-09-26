"use client";

import React, { useEffect, useRef } from "react";

interface ModalProps {
  /** Close on backdrop click, on Escape, and from any close control inside. */
  onClose: () => void;
  /** Wrapper classes for the dialog panel — width, padding, surface, spacing. */
  panelClassName?: string;
  /** Padding of the area the panel is centered in. */
  containerClassName?: string;
  label?: string;
  children: React.ReactNode;
}

/**
 * Shared modal chrome: animated backdrop + spring-in panel, dismissable by
 * clicking the backdrop or pressing Escape, with background scroll locked
 * while it is open.
 */
export default function Modal({
  onClose,
  panelClassName = "",
  containerClassName = "p-4",
  label,
  children,
}: ModalProps) {
  // Callers commonly pass an inline arrow, so read the handler through a ref:
  // the key listener and the scroll lock below then mount once per modal
  // instead of being torn down and re-added on every parent render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${containerClassName}`}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-backdrop"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`relative animate-modal-content ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
