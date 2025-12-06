import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Covenant 48: The Sanctity of Focus
 * When a decision is demanded, all else must fade. The user's will must be
 * directed, their attention captured, and their path clarified. A Modal is not
 * a suggestion; it is a temporary reality. It must trap focus, respect intent,

 * and provide a clear exit. To break this covenant is to sow chaos in the user's
 * chronicle.
 */

export interface ModalProps {
  /** Controls the visibility of the modal. */
  isOpen: boolean;
  /** Function to call when the modal requests to be closed. */
  onClose: () => void;
  /** The title displayed at the top of the modal. */
  title: string;
  /** The main content of the modal. */
  children: React.ReactNode;
  /** Optional footer content, typically for action buttons. */
  footer?: React.ReactNode;
  /** Optional class name for custom styling of the modal panel. */
  className?: string;
}

/**
 * A reusable Modal component that enforces the Sanctity of Focus.
 * It renders a dialog that traps user focus, intended for critical
 * confirmations and actions that require the user's full attention.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = '',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = `modal-title-${React.useId()}`;
  const descriptionId = `modal-description-${React.useId()}`;

  // Effect to handle closing the modal with the Escape key.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Effect to trap focus within the modal, upholding Covenant 48.
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) { // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else { // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    // Set initial focus on the first focusable element.
    firstElement.focus();

    modalRef.current.addEventListener('keydown', handleTabKey);

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      modalRef.current?.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen]);

  // Render nothing if the modal is not open.
  if (!isOpen) {
    return null;
  }

  // Use a portal to render the modal at the top of the DOM tree.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`relative flex flex-col w-full max-w-lg m-4 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl shadow-purple-900/20 text-gray-100 animate-in fade-in-90 slide-in-from-bottom-10 duration-300 ${className}`}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside the modal from closing it.
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        {/* Modal Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 id={titleId} className="text-lg font-semibold text-purple-300">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 rounded-full transition-colors hover:bg-gray-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </header>

        {/* Modal Body */}
        <main className="p-6 text-gray-300" id={descriptionId}>
          {children}
        </main>

        {/* Modal Footer */}
        {footer && (
          <footer className="flex justify-end p-4 space-x-3 bg-gray-900/50 border-t border-gray-800 rounded-b-lg">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}