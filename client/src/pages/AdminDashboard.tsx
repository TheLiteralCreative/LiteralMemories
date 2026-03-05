/**
 * AdminDashboard — password-protected quotes management page.
 * Shows all submitted quotes in a sortable, searchable table.
 * Requires a valid admin token in sessionStorage (set by AdminLogin).
 */
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { adminTrpc, createAdminTrpcClient, ADMIN_TOKEN_KEY } from "@/lib/adminTrpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  new:       { bg: "oklch(0.94 0.06 155 / 0.15)", text: "oklch(0.35 0.09 155)", label: "New" },
  contacted: { bg: "oklch(0.94 0.08 85 / 0.20)",  text: "oklch(0.55 0.10 75)",  label: "Contacted" },
  archived:  { bg: "oklch(0.92 0.01 75)",          text: "oklch(0.55 0.04 75)",  label: "Archived" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.new;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

// ── Email badge ───────────────────────────────────────────────────────────────

function EmailBadge({ status }: { status: string }) {
  if (status === "sent") {
    return <span className="text-xs font-medium" style={{ color: "oklch(0.35 0.09 155)" }}>✓ Sent</span>;
  }
  if (status === "failed") {
    return <span className="text-xs font-medium" style={{ color: "oklch(0.55 0.09 25)" }}>✗ Failed</span>;
  }
  return <span className="text-xs" style={{ color: "oklch(0.75 0.02 75)" }}>Pending</span>;
}

// ── Quote detail modal ────────────────────────────────────────────────────────

function QuoteDetailModal({
  quoteId,
  onClose,
  onStatusChange,
}: {
  quoteId: number | null;
  onClose: () => void;
  onStatusChange: () => void;
}) {
  const { data: quote, isLoading } = adminTrpc.admin.getQuote.useQuery(
    { id: quoteId! },
    { enabled: quoteId !== null }
  );

  const updateStatus = adminTrpc.admin.updateStatus.useMutation({
    onSuccess: () => { onStatusChange(); },
  });

  if (!quoteId) return null;

  const parsedData = useMemo(() => {
    if (!quote?.quoteData) return null;
    try { return JSON.parse(quote.quoteData); } catch { return null; }
  }, [quote?.quoteData]);

  return (
    <Dialog open={quoteId !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl" style={{ borderRadius: "16px" }}>
        <DialogTitle className="sr-only">Quote Detail</DialogTitle>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-8 h-8 animate-spin" style={{ color: "oklch(0.35 0.09 155)" }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : quote ? (
          <>
            {/* Header */}
            <div className="px-6 py-5" style={{ background: "oklch(0.35 0.09 155)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                    {quote.clientName}
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {quote.clientEmail}
                    {quote.clientPhone && ` · ${quote.clientPhone}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white tabular-nums">
                    ${(quote.estimatedTotalCents / 100).toFixed(2)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.78 0.12 85)" }}>
                    Deposit: ${(quote.depositAmountCents / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <StatusBadge status={quote.adminStatus} />
                <EmailBadge status={quote.emailSent} />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {new Date(quote.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-xs capitalize px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}>
                  {quote.pricingTier} tier
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto max-h-[60vh]" style={{ background: "oklch(0.98 0.008 75)" }}>
              {/* Project notes */}
              {quote.projectNotes && (
                <div className="mb-5 p-3 rounded-lg" style={{ background: "oklch(0.78 0.12 85 / 0.12)", border: "1px solid oklch(0.78 0.12 85 / 0.3)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "oklch(0.55 0.04 75)" }}>Project Notes</p>
                  <p className="text-sm" style={{ color: "oklch(0.22 0.015 65)" }}>{quote.projectNotes}</p>
                </div>
              )}

              {/* Line items from parsed quoteData */}
              {parsedData && (
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "oklch(0.55 0.04 75)" }}>Services Selected</p>
                  <div className="space-y-1">
                    {Object.entries(parsedData.services ?? {}).map(([id, entry]: [string, any]) => {
                      if (!entry || (entry.quantity === 0 && entry.estimatedHours === 0 && entry.adjustedHours === 0)) return null;
                      return (
                        <div key={id} className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: "oklch(0.94 0.012 75)" }}>
                          <span className="text-sm" style={{ color: "oklch(0.35 0.04 75)" }}>{id.replace(/-/g, " ")}</span>
                          <span className="text-xs tabular-nums" style={{ color: "oklch(0.55 0.04 75)" }}>
                            {entry.quantity > 0 ? `×${entry.quantity}` : `${entry.adjustedHours || entry.estimatedHours}h`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status actions */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "oklch(0.55 0.04 75)" }}>Update Status</p>
                <div className="flex gap-2 flex-wrap">
                  {(["new", "contacted", "archived"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus.mutate({ id: quote.id, status: s })}
                      disabled={quote.adminStatus === s || updateStatus.isPending}
                      className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all disabled:opacity-40"
                      style={
                        quote.adminStatus === s
                          ? { background: "oklch(0.35 0.09 155)", color: "#fff", border: "1.5px solid oklch(0.35 0.09 155)" }
                          : { background: "#fff", color: "oklch(0.35 0.09 155)", border: "1.5px solid oklch(0.88 0.015 75)" }
                      }
                    >
                      {STATUS_STYLES[s]?.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-between items-center" style={{ borderColor: "oklch(0.88 0.015 75)", background: "#fff" }}>
              <a
                href={`mailto:${quote.clientEmail}`}
                className="text-sm font-semibold"
                style={{ color: "oklch(0.35 0.09 155)" }}
              >
                ✉ Email {quote.clientName.split(" ")[0]}
              </a>
              <Button variant="outline" onClick={onClose} className="text-sm">
                Close
              </Button>
            </div>
          </>
        ) : (
          <div className="py-16 text-center text-sm" style={{ color: "oklch(0.55 0.04 75)" }}>Quote not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

function DashboardContent() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = adminTrpc.admin.listQuotes.useQuery({
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const quotes = data?.quotes ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    navigate("/admin/login");
  }

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.97 0.006 75)" }}>
      {/* Top nav */}
      <header className="border-b bg-white sticky top-0 z-10" style={{ borderColor: "oklch(0.88 0.015 75)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.35 0.09 155)" }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.015 65)", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                Literal Memories
              </p>
              <p className="text-xs" style={{ color: "oklch(0.55 0.04 75)" }}>Quotes Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a href="/" className="text-xs font-medium" style={{ color: "oklch(0.55 0.04 75)" }}>
              ← Pricing Calculator
            </a>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
              style={{ color: "oklch(0.55 0.04 75)", borderColor: "oklch(0.88 0.015 75)" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Quotes", value: total, icon: "📋" },
            { label: "New", value: quotes.filter(q => q.adminStatus === "new").length, icon: "🟢" },
            { label: "Contacted", value: quotes.filter(q => q.adminStatus === "contacted").length, icon: "📞" },
            { label: "Archived", value: quotes.filter(q => q.adminStatus === "archived").length, icon: "📁" },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border p-4" style={{ borderColor: "oklch(0.88 0.015 75)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{stat.icon}</span>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.04 75)" }}>{stat.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: "oklch(0.22 0.015 65)" }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Search + table */}
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "oklch(0.88 0.015 75)" }}>
          {/* Table header */}
          <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: "oklch(0.94 0.012 75)" }}>
            <h2 className="text-lg font-bold" style={{ color: "oklch(0.22 0.015 65)" }}>
              All Quotes
              {total > 0 && <span className="ml-2 text-sm font-normal" style={{ color: "oklch(0.55 0.04 75)" }}>({total})</span>}
            </h2>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.75 0.02 75)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9 pr-4 py-2 text-sm rounded-lg border w-full sm:w-72"
                style={{ border: "1.5px solid oklch(0.88 0.015 75)", background: "oklch(0.98 0.008 75)", outline: "none", color: "oklch(0.22 0.015 65)" }}
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="w-8 h-8 animate-spin" style={{ color: "oklch(0.35 0.09 155)" }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : quotes.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: "oklch(0.55 0.04 75)" }}>
                {debouncedSearch ? "No quotes match your search." : "No quotes submitted yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "oklch(0.94 0.012 75)", background: "oklch(0.98 0.008 75)" }}>
                    {["Client", "Email", "Phone", "Total", "Tier", "Email", "Status", "Date", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.04 75)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr
                      key={q.id}
                      className="border-b hover:bg-[oklch(0.97_0.008_75)] transition-colors cursor-pointer"
                      style={{ borderColor: "oklch(0.94 0.012 75)" }}
                      onClick={() => setSelectedId(q.id)}
                    >
                      <td className="px-4 py-3 font-semibold" style={{ color: "oklch(0.22 0.015 65)" }}>
                        {q.clientName}
                      </td>
                      <td className="px-4 py-3" style={{ color: "oklch(0.35 0.04 75)" }}>
                        {q.clientEmail}
                      </td>
                      <td className="px-4 py-3" style={{ color: "oklch(0.55 0.04 75)" }}>
                        {q.clientPhone ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-bold tabular-nums" style={{ color: "oklch(0.35 0.09 155)" }}>
                        ${(q.estimatedTotalCents / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 capitalize" style={{ color: "oklch(0.55 0.04 75)" }}>
                        {q.pricingTier}
                      </td>
                      <td className="px-4 py-3">
                        <EmailBadge status={q.emailSent} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={q.adminStatus} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: "oklch(0.55 0.04 75)" }}>
                        {new Date(q.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedId(q.id); }}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors"
                          style={{ color: "oklch(0.35 0.09 155)", borderColor: "oklch(0.35 0.09 155 / 0.3)", background: "oklch(0.35 0.09 155 / 0.06)" }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t flex items-center justify-between" style={{ borderColor: "oklch(0.94 0.012 75)" }}>
              <p className="text-xs" style={{ color: "oklch(0.55 0.04 75)" }}>
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Quote detail modal */}
      <QuoteDetailModal
        quoteId={selectedId}
        onClose={() => setSelectedId(null)}
        onStatusChange={() => { refetch(); }}
      />
    </div>
  );
}

// ── Auth guard + provider wrapper ─────────────────────────────────────────────

export default function AdminDashboard() {
  const [, navigate] = useLocation();

  // Read token synchronously — avoids a useEffect delay that keeps spinner showing
  const adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);

  // Stable clients — useMemo ensures they are never recreated on re-render
  const queryClient = useMemo(() => new QueryClient(), []);
  const trpcClient = useMemo(
    () => (adminToken ? createAdminTrpcClient(adminToken) : null),
    [adminToken]
  );

  // Redirect to login if no token is present
  useEffect(() => {
    if (!adminToken) {
      navigate("/admin/login");
    }
  }, [adminToken, navigate]);

  if (!adminToken || !trpcClient) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.98 0.008 75)" }}>
        <svg className="w-8 h-8 animate-spin" style={{ color: "oklch(0.35 0.09 155)" }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  return (
    <adminTrpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <DashboardContent />
      </QueryClientProvider>
    </adminTrpc.Provider>
  );
}
