/**
 * SaveQuoteModal
 *
 * Triggered by exit-intent (mouse leaving the viewport toward the top of the page).
 * Prompts the user to save their estimate by providing their name and email.
 * On submit, calls the trpc.quotes.save mutation, then shows a confirmation state.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface QuoteSummary {
  pricingTier: string;
  lineItems: {
    category: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  deliveryItems: { name: string; price: number }[];
  subtotal: number;
  accountCredit: number;
  shippingRate: number;
  serviceAdjustments: number;
  estimatedTotal: number;
  deposit: number;
  balance: number;
  rawState: string;
}

interface SaveQuoteModalProps {
  /** Whether the calculator has any items entered */
  hasItems: boolean;
  /** Current quote data to save */
  quote: QuoteSummary;
  /** External trigger — set to true to open the modal programmatically (e.g. from a button) */
  externalOpen?: boolean;
  /** Callback to reset the external trigger after the modal opens */
  onExternalOpenHandled?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function SaveQuoteModal({ hasItems, quote, externalOpen, onExternalOpenHandled }: SaveQuoteModalProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const hasTriggered = useRef(false);

  const saveMutation = trpc.quotes.save.useMutation();

  // ── External trigger (e.g. "Save My Quote" button) ─────────────────────────
  useEffect(() => {
    if (externalOpen && !saved) {
      setOpen(true);
      setDismissed(false);
      onExternalOpenHandled?.();
    }
  }, [externalOpen, saved, onExternalOpenHandled]);

  // ── Exit-intent detection ──────────────────────────────────────────────────

  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      // Only trigger when mouse exits through the top of the viewport
      if (
        e.clientY <= 10 &&
        !hasTriggered.current &&
        !dismissed &&
        !saved &&
        hasItems
      ) {
        hasTriggered.current = true;
        setOpen(true);
      }
    },
    [dismissed, saved, hasItems]
  );

  useEffect(() => {
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [handleMouseLeave]);

  // Also show modal when user presses the browser back button or navigates away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasItems && !saved && !dismissed) {
        // Show native browser dialog as a fallback
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasItems, saved, dismissed]);

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: { name?: string; email?: string } = {};
    if (!name.trim()) newErrors.name = "Please enter your name";
    if (!email.trim()) {
      newErrors.email = "Please enter your email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    try {
      await saveMutation.mutateAsync({
        clientName: name.trim(),
        clientEmail: email.trim(),
        clientPhone: phone.trim() || undefined,
        projectNotes: notes.trim() || undefined,
        pricingTier: quote.pricingTier,
        lineItems: quote.lineItems,
        deliveryItems: quote.deliveryItems,
        subtotal: quote.subtotal,
        accountCredit: quote.accountCredit,
        shippingRate: quote.shippingRate,
        serviceAdjustments: quote.serviceAdjustments,
        estimatedTotal: quote.estimatedTotal,
        deposit: quote.deposit,
        balance: quote.balance,
        rawState: quote.rawState,
      });
      setSaved(true);
    } catch (err) {
      toast.error("Something went wrong saving your quote. Please try again.");
    }
  }

  function handleDismiss() {
    setDismissed(true);
    setOpen(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden border-0 shadow-2xl"
        style={{ borderRadius: "16px" }}
      >
        <DialogTitle className="sr-only">Save Your Quote</DialogTitle>

        {saved ? (
          // ── Success state ──────────────────────────────────────────────────
          <div className="text-center px-8 py-10">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "oklch(0.35 0.09 155 / 0.12)" }}
            >
              <svg className="w-8 h-8" style={{ color: "oklch(0.35 0.09 155)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: "oklch(0.22 0.015 65)", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Quote Saved!
            </h2>
            <p className="text-sm mb-1" style={{ color: "oklch(0.55 0.04 75)" }}>
              A copy of your estimate has been sent to <strong>{email}</strong>.
            </p>
            <p className="text-sm mb-6" style={{ color: "oklch(0.55 0.04 75)" }}>
              Our team will be in touch soon. In the meantime, feel free to continue editing your estimate.
            </p>
            <Button
              onClick={() => setOpen(false)}
              className="w-full font-semibold"
              style={{ background: "oklch(0.35 0.09 155)", color: "#fff" }}
            >
              Continue
            </Button>
          </div>
        ) : (
          // ── Form state ─────────────────────────────────────────────────────
          <>
            {/* Header */}
            <div className="px-8 pt-8 pb-6" style={{ background: "oklch(0.35 0.09 155)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-px" style={{ background: "oklch(0.78 0.12 85)" }} />
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "oklch(0.78 0.12 85)" }}>
                  Don't lose your work
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                Save Your Quote
              </h2>
              <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.75)" }}>
                Enter your details below and we'll email you a copy of your estimate — no account required.
              </p>

              {/* Mini summary */}
              {quote.estimatedTotal > 0 && (
                <div className="mt-4 rounded-lg px-4 py-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>Estimated Total</p>
                    <p className="text-xl font-bold text-white tabular-nums">${quote.estimatedTotal.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>Deposit Due</p>
                    <p className="text-base font-bold tabular-nums" style={{ color: "oklch(0.78 0.12 85)" }}>${quote.deposit.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-8 pb-8 pt-6 space-y-4" style={{ background: "oklch(0.98 0.008 75)" }}>
              <div className="grid grid-cols-2 gap-3">
                {/* Name */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "oklch(0.55 0.04 75)" }}>
                    Your Name <span style={{ color: "oklch(0.55 0.09 25)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Smith"
                    value={name}
                    onChange={e => { setName(e.target.value); setErrors(er => ({ ...er, name: undefined })); }}
                    className="w-full px-3 py-2 text-sm rounded-lg border transition-colors"
                    style={{
                      border: errors.name ? "1.5px solid oklch(0.55 0.09 25)" : "1.5px solid oklch(0.88 0.015 75)",
                      background: "#fff",
                      outline: "none",
                      color: "oklch(0.22 0.015 65)",
                    }}
                  />
                  {errors.name && <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.09 25)" }}>{errors.name}</p>}
                </div>

                {/* Email */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "oklch(0.55 0.04 75)" }}>
                    Email Address <span style={{ color: "oklch(0.55 0.09 25)" }}>*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. jane@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrors(er => ({ ...er, email: undefined })); }}
                    className="w-full px-3 py-2 text-sm rounded-lg border transition-colors"
                    style={{
                      border: errors.email ? "1.5px solid oklch(0.55 0.09 25)" : "1.5px solid oklch(0.88 0.015 75)",
                      background: "#fff",
                      outline: "none",
                      color: "oklch(0.22 0.015 65)",
                    }}
                  />
                  {errors.email && <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.09 25)" }}>{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "oklch(0.55 0.04 75)" }}>
                    Phone <span style={{ color: "oklch(0.75 0.02 75)" }}>(optional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border"
                    style={{ border: "1.5px solid oklch(0.88 0.015 75)", background: "#fff", outline: "none", color: "oklch(0.22 0.015 65)" }}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "oklch(0.55 0.04 75)" }}>
                    Project Notes <span style={{ color: "oklch(0.75 0.02 75)" }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VHS tapes from 1987"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border"
                    style={{ border: "1.5px solid oklch(0.88 0.015 75)", background: "#fff", outline: "none", color: "oklch(0.22 0.015 65)" }}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex-1 font-semibold"
                  style={{ background: "oklch(0.35 0.09 155)", color: "#fff" }}
                >
                  {saveMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Saving…
                    </span>
                  ) : (
                    "Save & Email My Quote"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDismiss}
                  className="px-4"
                  style={{ color: "oklch(0.55 0.04 75)" }}
                >
                  Not now
                </Button>
              </div>

              <p className="text-center text-xs" style={{ color: "oklch(0.75 0.02 75)" }}>
                We'll never share your information. Questions?{" "}
                <a href="mailto:Joel@literalmemories.com" style={{ color: "oklch(0.35 0.09 155)" }}>
                  Joel@literalmemories.com
                </a>
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
