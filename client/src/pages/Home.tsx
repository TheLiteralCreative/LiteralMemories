/**
 * DESIGN: "Memory Lane" — Warm Modern / Nostalgic Premium
 * Colors: Forest green primary, warm gold accent, cream background
 * Fonts: Cormorant Garamond (display) + Nunito Sans (UI)
 * Layout: Asymmetric two-column (calculator 65% / sticky summary 35%)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  SERVICE_CATEGORIES,
  DELIVERY_OPTIONS,
  TIERS,
  getActiveTier,
  getTierIndex,
  getServicePrice,
  getDeliveryPrice,
  type PricingTier,
  type ServiceItem,
} from '@/lib/pricingData';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceEntry {
  quantity: number;
  estimatedHours: number;
  adjustedHours: number;
}

interface FormState {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectNotes: string;
  services: Record<string, ServiceEntry>;
  delivery: Record<string, boolean>;
  accountCredit: number;
  shippingRate: number;
  serviceAdjustments: number;
}

const defaultEntry = (): ServiceEntry => ({ quantity: 0, estimatedHours: 0, adjustedHours: 0 });

const initialState: FormState = {
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  projectNotes: '',
  services: {},
  delivery: {},
  accountCredit: 0,
  shippingRate: 0,
  serviceAdjustments: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n === 0 ? '—' : `$${n.toFixed(2)}`;
}

function fmtPrice(n: number): string {
  return `$${n.toFixed(2)}`;
}

function getEntry(state: FormState, id: string): ServiceEntry {
  return state.services[id] ?? defaultEntry();
}

function computeServiceCost(item: ServiceItem, entry: ServiceEntry, tier: PricingTier): number {
  const price = getServicePrice(item, tier);
  if (item.inputMode === 'quantity') {
    return entry.quantity > 0 ? entry.quantity * price : 0;
  }
  // hours mode: use adjustedHours if set, else estimatedHours
  const hrs = entry.adjustedHours > 0 ? entry.adjustedHours : entry.estimatedHours;
  return hrs > 0 ? hrs * price : 0;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: PricingTier }) {
  const info = TIERS.find(t => t.key === tier)!;
  const colors: Record<PricingTier, string> = {
    standard: 'bg-amber-100 text-amber-800 border-amber-300',
    bronze:   'bg-orange-100 text-orange-800 border-orange-300',
    silver:   'bg-slate-100 text-slate-700 border-slate-300',
    gold:     'bg-yellow-100 text-yellow-800 border-yellow-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold tracking-wide ${colors[tier]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {info.label} Rate
    </span>
  );
}

function TierProgress({ totalQty }: { totalQty: number }) {
  const milestones = [0, 10, 25, 50];
  const labels = ['Standard', '10+', '25+', '50+'];
  const pct = Math.min((totalQty / 50) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-[oklch(0.55_0.04_75)]">Volume Discount Progress</span>
        <span className="text-xs font-semibold text-[oklch(0.35_0.09_155)]">{totalQty} items</span>
      </div>
      <div className="relative h-2 bg-[oklch(0.94_0.012_75)] rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[oklch(0.35_0.09_155)] to-[oklch(0.78_0.12_85)] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
        {milestones.slice(1).map((m, i) => (
          <div
            key={m}
            className="absolute top-0 bottom-0 w-px bg-white/60"
            style={{ left: `${(m / 50) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {labels.map((l, i) => (
          <span key={l} className="text-[10px] text-[oklch(0.55_0.04_75)]">{l}</span>
        ))}
      </div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min = 0,
  step = 1,
  placeholder = '0',
  className = '',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center border border-[oklch(0.88_0.015_75)] rounded-md overflow-hidden bg-white ${className}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="px-2.5 py-1.5 text-[oklch(0.55_0.04_75)] hover:bg-[oklch(0.94_0.012_75)] hover:text-[oklch(0.35_0.09_155)] transition-colors text-sm font-bold select-none"
        aria-label="Decrease"
      >−</button>
      <input
        type="number"
        min={min}
        step={step}
        value={value === 0 ? '' : value}
        placeholder={placeholder}
        onChange={e => {
          const v = parseFloat(e.target.value);
          onChange(isNaN(v) ? 0 : Math.max(min, v));
        }}
        className="w-16 text-center text-sm font-medium py-1.5 border-none outline-none bg-transparent tabular-nums text-[oklch(0.22_0.015_65)]"
      />
      <button
        type="button"
        onClick={() => onChange(value + step)}
        className="px-2.5 py-1.5 text-[oklch(0.55_0.04_75)] hover:bg-[oklch(0.94_0.012_75)] hover:text-[oklch(0.35_0.09_155)] transition-colors text-sm font-bold select-none"
        aria-label="Increase"
      >+</button>
    </div>
  );
}

function ServiceRow({
  item,
  entry,
  tier,
  onUpdate,
}: {
  item: ServiceItem;
  entry: ServiceEntry;
  tier: PricingTier;
  onUpdate: (id: string, field: keyof ServiceEntry, value: number) => void;
}) {
  const price = getServicePrice(item, tier);
  const cost = computeServiceCost(item, entry, tier);
  const isActive = item.inputMode === 'quantity' ? entry.quantity > 0
    : entry.estimatedHours > 0 || entry.adjustedHours > 0;

  return (
    <div className={`grid grid-cols-[1fr_auto] gap-4 py-4 border-b border-[oklch(0.94_0.012_75)] last:border-0 transition-colors ${isActive ? 'bg-[oklch(0.97_0.010_155/0.15)] -mx-4 px-4 rounded-lg' : ''}`}>
      <div className="space-y-1">
        <div className="flex items-start gap-2">
          <p className="text-sm font-semibold text-[oklch(0.22_0.015_65)] leading-snug">{item.name}</p>
          {isActive && (
            <span className="shrink-0 mt-0.5 text-[10px] font-semibold text-[oklch(0.35_0.09_155)] bg-[oklch(0.35_0.09_155/0.1)] px-1.5 py-0.5 rounded">
              Added
            </span>
          )}
        </div>
        <p className="text-xs text-[oklch(0.55_0.04_75)]">{item.unit} · {fmtPrice(price)}</p>
        {item.note && <p className="text-[11px] text-[oklch(0.55_0.04_75)] italic">{item.note}</p>}
      </div>

      <div className="flex flex-col items-end gap-2">
        {item.inputMode === 'quantity' ? (
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-[oklch(0.55_0.04_75)] font-medium">Quantity</span>
            <NumberInput
              value={entry.quantity}
              onChange={v => onUpdate(item.id, 'quantity', v)}
            />
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-[oklch(0.55_0.04_75)] font-medium">Est. Hours</span>
              <NumberInput
                value={entry.estimatedHours}
                onChange={v => onUpdate(item.id, 'estimatedHours', v)}
                step={0.5}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-[oklch(0.55_0.04_75)] font-medium">Adj. Hours</span>
              <NumberInput
                value={entry.adjustedHours}
                onChange={v => onUpdate(item.id, 'adjustedHours', v)}
                step={0.5}
                placeholder="—"
              />
            </div>
          </div>
        )}
        <div className="text-right">
          <span className={`text-base font-bold tabular-nums ${isActive ? 'text-[oklch(0.35_0.09_155)]' : 'text-[oklch(0.75_0.02_75)]'}`}>
            {fmt(cost)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CategorySection({
  category,
  state,
  tier,
  onUpdate,
}: {
  category: typeof SERVICE_CATEGORIES[0];
  state: FormState;
  tier: PricingTier;
  onUpdate: (id: string, field: keyof ServiceEntry, value: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const subtotal = category.services.reduce((sum, item) => {
    return sum + computeServiceCost(item, getEntry(state, item.id), tier);
  }, 0);

  return (
    <div className="bg-white rounded-xl border border-[oklch(0.88_0.015_75)] shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 hover:bg-[oklch(0.98_0.008_75)] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{category.icon}</span>
          <div className="text-left">
            <h3 className="text-xl font-semibold text-[oklch(0.22_0.015_65)] group-hover:text-[oklch(0.35_0.09_155)] transition-colors">
              {category.name}
            </h3>
            <p className="text-xs text-[oklch(0.55_0.04_75)] mt-0.5">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {subtotal > 0 && (
            <span className="text-sm font-bold text-[oklch(0.35_0.09_155)] tabular-nums">
              {fmtPrice(subtotal)}
            </span>
          )}
          <svg
            className={`w-5 h-5 text-[oklch(0.55_0.04_75)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[oklch(0.94_0.012_75)]">
          <div className="pt-2">
            {category.services.map(item => (
              <ServiceRow
                key={item.id}
                item={item}
                entry={getEntry(state, item.id)}
                tier={tier}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [form, setForm] = useState<FormState>(initialState);
  const [priceKey, setPriceKey] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);

  const updateService = useCallback((id: string, field: keyof ServiceEntry, value: number) => {
    setForm(prev => ({
      ...prev,
      services: {
        ...prev.services,
        [id]: { ...defaultEntry(), ...prev.services[id], [field]: value },
      },
    }));
    setPriceKey(k => k + 1);
  }, []);

  const toggleDelivery = useCallback((id: string, exclusive: boolean) => {
    setForm(prev => {
      const current = prev.delivery[id] ?? false;
      if (exclusive) {
        // Deselect all exclusive options, then toggle this one
        const exclusiveIds = DELIVERY_OPTIONS.filter(o => o.exclusive).map(o => o.id);
        const newDelivery = { ...prev.delivery };
        exclusiveIds.forEach(eid => { newDelivery[eid] = false; });
        newDelivery[id] = !current;
        return { ...prev, delivery: newDelivery };
      }
      return { ...prev, delivery: { ...prev.delivery, [id]: !current } };
    });
    setPriceKey(k => k + 1);
  }, []);

  // Compute totals
  const totalQuantity = SERVICE_CATEGORIES.flatMap(c => c.services)
    .filter(s => s.inputMode === 'quantity')
    .reduce((sum, s) => sum + (form.services[s.id]?.quantity ?? 0), 0);

  const tier = getActiveTier(totalQuantity);
  const tierIdx = getTierIndex(tier);

  const serviceSubtotal = SERVICE_CATEGORIES.flatMap(c => c.services).reduce((sum, item) => {
    return sum + computeServiceCost(item, getEntry(form, item.id), tier);
  }, 0);

  const deliverySubtotal = DELIVERY_OPTIONS.reduce((sum, opt) => {
    if (!form.delivery[opt.id]) return sum;
    return sum + getDeliveryPrice(opt, tier);
  }, 0);

  const subtotal = serviceSubtotal + deliverySubtotal;
  const adjustments = (form.accountCredit > 0 ? -form.accountCredit : 0)
    + (form.shippingRate > 0 ? form.shippingRate : 0)
    + (form.serviceAdjustments !== 0 ? form.serviceAdjustments : 0);
  const total = Math.max(0, subtotal + adjustments);
  const deposit = total * 0.5;
  const balance = total - deposit;

  const hasItems = subtotal > 0;

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.98 0.008 75)' }}>
      {/* ── Header ── */}
      <header className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310419663031167733/FagVfm6MpAzGB2JrtxgCi7/hero-banner-JQRgjS54SEaaFNvXTEsDkx.webp)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.15_0.05_155/0.88)] via-[oklch(0.15_0.05_155/0.70)] to-[oklch(0.15_0.05_155/0.30)]" />
        <div className="relative container py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-px bg-[oklch(0.78_0.12_85)]" />
              <span className="text-xs font-semibold tracking-widest uppercase text-[oklch(0.78_0.12_85)]">
                Legacy Media Digitization
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-4">
              Literal Memories
            </h1>
            <p className="text-xl text-white/80 font-light leading-relaxed mb-2">
              Service Pricing Calculator
            </p>
            <p className="text-sm text-white/60 leading-relaxed max-w-lg">
              Select the services you need, enter your quantities or estimated hours,
              and receive an instant cost estimate. Volume discounts apply automatically
              as you add more items.
            </p>
          </div>
        </div>
      </header>

      {/* ── Tier Banner ── */}
      <div className="bg-[oklch(0.35_0.09_155)] text-white py-3">
        <div className="container flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TierBadge tier={tier} />
            <span className="text-sm text-white/80">
              {tier === 'standard'
                ? 'Add 10+ digitization items to unlock volume discounts'
                : `Volume discount active — ${TIERS.find(t => t.key === tier)?.description}`}
            </span>
          </div>
          <div className="w-full md:w-64">
            <TierProgress totalQty={totalQuantity} />
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="container py-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Left: Calculator ── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Client Info */}
            <div className="bg-white rounded-xl border border-[oklch(0.88_0.015_75)] shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">👤</span>
                <h2 className="text-xl font-semibold text-[oklch(0.22_0.015_65)]">Your Information</h2>
                <span className="text-xs text-[oklch(0.55_0.04_75)] ml-1">(optional — for your reference)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[oklch(0.55_0.04_75)] mb-1.5 uppercase tracking-wide">
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Smith"
                    value={form.clientName}
                    onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[oklch(0.88_0.015_75)] rounded-lg bg-[oklch(0.98_0.008_75)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.35_0.09_155/0.3)] focus:border-[oklch(0.35_0.09_155)] transition-colors placeholder:text-[oklch(0.75_0.02_75)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[oklch(0.55_0.04_75)] mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. jane@example.com"
                    value={form.clientEmail}
                    onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[oklch(0.88_0.015_75)] rounded-lg bg-[oklch(0.98_0.008_75)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.35_0.09_155/0.3)] focus:border-[oklch(0.35_0.09_155)] transition-colors placeholder:text-[oklch(0.75_0.02_75)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[oklch(0.55_0.04_75)] mb-1.5 uppercase tracking-wide">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. (555) 123-4567"
                    value={form.clientPhone}
                    onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[oklch(0.88_0.015_75)] rounded-lg bg-[oklch(0.98_0.008_75)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.35_0.09_155/0.3)] focus:border-[oklch(0.35_0.09_155)] transition-colors placeholder:text-[oklch(0.75_0.02_75)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[oklch(0.55_0.04_75)] mb-1.5 uppercase tracking-wide">
                    Project Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wedding VHS tapes from 1987"
                    value={form.projectNotes}
                    onChange={e => setForm(f => ({ ...f, projectNotes: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-[oklch(0.88_0.015_75)] rounded-lg bg-[oklch(0.98_0.008_75)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.35_0.09_155/0.3)] focus:border-[oklch(0.35_0.09_155)] transition-colors placeholder:text-[oklch(0.75_0.02_75)]"
                  />
                </div>
              </div>
            </div>

            {/* Service Categories */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold text-[oklch(0.22_0.015_65)]">Services</h2>
                <div className="flex-1 h-px bg-[oklch(0.88_0.015_75)]" />
                <span className="text-xs text-[oklch(0.55_0.04_75)]">Select what you need</span>
              </div>
              <div className="space-y-4">
                {SERVICE_CATEGORIES.map(cat => (
                  <CategorySection
                    key={cat.id}
                    category={cat}
                    state={form}
                    tier={tier}
                    onUpdate={updateService}
                  />
                ))}
              </div>
            </div>

            {/* Media Delivery */}
            <div className="bg-white rounded-xl border border-[oklch(0.88_0.015_75)] shadow-sm overflow-hidden">
              <div className="p-5 border-b border-[oklch(0.94_0.012_75)]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📦</span>
                  <div>
                    <h3 className="text-xl font-semibold text-[oklch(0.22_0.015_65)]">Media Delivery</h3>
                    <p className="text-xs text-[oklch(0.55_0.04_75)] mt-0.5">
                      Choose how you'd like to receive your digitized files. Only one cloud option can be selected.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {DELIVERY_OPTIONS.map(opt => {
                  const selected = form.delivery[opt.id] ?? false;
                  const price = getDeliveryPrice(opt, tier);
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selected
                          ? 'border-[oklch(0.35_0.09_155)] bg-[oklch(0.35_0.09_155/0.06)]'
                          : 'border-[oklch(0.88_0.015_75)] hover:border-[oklch(0.35_0.09_155/0.4)] hover:bg-[oklch(0.98_0.008_75)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selected ? 'border-[oklch(0.35_0.09_155)] bg-[oklch(0.35_0.09_155)]' : 'border-[oklch(0.88_0.015_75)]'
                        }`}>
                          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[oklch(0.22_0.015_65)]">{opt.name}</p>
                          <p className="text-xs text-[oklch(0.55_0.04_75)]">{opt.description}</p>
                          {opt.exclusive && (
                            <span className="text-[10px] text-[oklch(0.55_0.04_75)] italic">Cloud option</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-bold text-[oklch(0.35_0.09_155)] tabular-nums">{fmtPrice(price)}</p>
                        {opt.id.includes('archive') && tier !== 'standard' && tier !== 'bronze' && (
                          <p className="text-[10px] text-[oklch(0.55_0.04_75)]">25+ tier rate</p>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleDelivery(opt.id, opt.exclusive)}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Adjustments */}
            <div className="bg-white rounded-xl border border-[oklch(0.88_0.015_75)] shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">⚙️</span>
                <h3 className="text-xl font-semibold text-[oklch(0.22_0.015_65)]">Adjustments</h3>
                <span className="text-xs text-[oklch(0.55_0.04_75)] ml-1">(optional)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[oklch(0.55_0.04_75)] mb-1.5 uppercase tracking-wide">
                    Account Credit ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.accountCredit === 0 ? '' : form.accountCredit}
                    onChange={e => setForm(f => ({ ...f, accountCredit: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm border border-[oklch(0.88_0.015_75)] rounded-lg bg-[oklch(0.98_0.008_75)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.35_0.09_155/0.3)] focus:border-[oklch(0.35_0.09_155)] transition-colors placeholder:text-[oklch(0.75_0.02_75)] tabular-nums"
                  />
                  <p className="text-[10px] text-[oklch(0.55_0.04_75)] mt-1">Applied as a deduction</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[oklch(0.55_0.04_75)] mb-1.5 uppercase tracking-wide">
                    Shipping Rate ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.shippingRate === 0 ? '' : form.shippingRate}
                    onChange={e => setForm(f => ({ ...f, shippingRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm border border-[oklch(0.88_0.015_75)] rounded-lg bg-[oklch(0.98_0.008_75)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.35_0.09_155/0.3)] focus:border-[oklch(0.35_0.09_155)] transition-colors placeholder:text-[oklch(0.75_0.02_75)] tabular-nums"
                  />
                  <p className="text-[10px] text-[oklch(0.55_0.04_75)] mt-1">Return shipping cost</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[oklch(0.55_0.04_75)] mb-1.5 uppercase tracking-wide">
                    Service Adjustments ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.serviceAdjustments === 0 ? '' : form.serviceAdjustments}
                    onChange={e => setForm(f => ({ ...f, serviceAdjustments: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm border border-[oklch(0.88_0.015_75)] rounded-lg bg-[oklch(0.98_0.008_75)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.35_0.09_155/0.3)] focus:border-[oklch(0.35_0.09_155)] transition-colors placeholder:text-[oklch(0.75_0.02_75)] tabular-nums"
                  />
                  <p className="text-[10px] text-[oklch(0.55_0.04_75)] mt-1">Positive or negative</p>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="rounded-xl border border-[oklch(0.78_0.12_85/0.4)] bg-[oklch(0.78_0.12_85/0.08)] p-5">
              <h3 className="text-base font-bold text-[oklch(0.22_0.015_65)] mb-3 flex items-center gap-2">
                <span>💡</span> How Pricing Works
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[oklch(0.35_0.04_75)]">
                <div className="flex gap-2">
                  <span className="text-[oklch(0.78_0.12_85)] font-bold shrink-0">→</span>
                  <span><strong>Quantity-based services</strong> (VHS, film, cassette, photo) are priced per item.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[oklch(0.78_0.12_85)] font-bold shrink-0">→</span>
                  <span><strong>Hour-based services</strong> use estimated hours; enter adjusted hours if known.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[oklch(0.78_0.12_85)] font-bold shrink-0">→</span>
                  <span><strong>Volume discounts</strong> activate at 10, 25, and 50 digitization items.</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[oklch(0.78_0.12_85)] font-bold shrink-0">→</span>
                  <span><strong>Deposit of 50%</strong> is due upon project approval; balance due at delivery.</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Sticky Summary ── */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0">
            <div ref={summaryRef} className="lg:sticky lg:top-6 space-y-4">
              <div className="bg-white rounded-xl border border-[oklch(0.88_0.015_75)] shadow-md overflow-hidden">
                {/* Summary Header */}
                <div className="bg-[oklch(0.35_0.09_155)] px-5 py-4">
                  <h2 className="text-lg font-bold text-white">Estimate Summary</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <TierBadge tier={tier} />
                  </div>
                </div>

                {/* Line Items */}
                <div className="p-5 space-y-1">
                  {!hasItems && (
                    <p className="text-sm text-[oklch(0.55_0.04_75)] text-center py-4 italic">
                      Add services above to see your estimate
                    </p>
                  )}

                  {/* Services breakdown */}
                  {SERVICE_CATEGORIES.map(cat => {
                    const catTotal = cat.services.reduce((sum, item) => {
                      return sum + computeServiceCost(item, getEntry(form, item.id), tier);
                    }, 0);
                    if (catTotal === 0) return null;
                    return (
                      <div key={cat.id}>
                        <div className="flex justify-between items-center py-1.5">
                          <span className="text-xs font-semibold text-[oklch(0.55_0.04_75)] uppercase tracking-wide">
                            {cat.icon} {cat.name}
                          </span>
                          <span className="text-sm font-semibold text-[oklch(0.22_0.015_65)] tabular-nums">
                            {fmtPrice(catTotal)}
                          </span>
                        </div>
                        {cat.services.map(item => {
                          const cost = computeServiceCost(item, getEntry(form, item.id), tier);
                          if (cost === 0) return null;
                          const entry = getEntry(form, item.id);
                          const qty = item.inputMode === 'quantity' ? entry.quantity
                            : (entry.adjustedHours > 0 ? entry.adjustedHours : entry.estimatedHours);
                          return (
                            <div key={item.id} className="flex justify-between items-center py-1 pl-4">
                              <span className="text-xs text-[oklch(0.55_0.04_75)] leading-snug max-w-[180px]">
                                {item.name}
                                <span className="text-[oklch(0.75_0.02_75)]"> ×{qty}</span>
                              </span>
                              <span className="text-xs text-[oklch(0.35_0.09_155)] tabular-nums font-medium">
                                {fmtPrice(cost)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Delivery */}
                  {deliverySubtotal > 0 && (
                    <div>
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-xs font-semibold text-[oklch(0.55_0.04_75)] uppercase tracking-wide">
                          📦 Delivery
                        </span>
                        <span className="text-sm font-semibold text-[oklch(0.22_0.015_65)] tabular-nums">
                          {fmtPrice(deliverySubtotal)}
                        </span>
                      </div>
                      {DELIVERY_OPTIONS.map(opt => {
                        if (!form.delivery[opt.id]) return null;
                        return (
                          <div key={opt.id} className="flex justify-between items-center py-1 pl-4">
                            <span className="text-xs text-[oklch(0.55_0.04_75)]">{opt.name}</span>
                            <span className="text-xs text-[oklch(0.35_0.09_155)] tabular-nums font-medium">
                              {fmtPrice(getDeliveryPrice(opt, tier))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {hasItems && <div className="h-px bg-[oklch(0.88_0.015_75)] my-2" />}

                  {/* Subtotal */}
                  {hasItems && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm font-semibold text-[oklch(0.22_0.015_65)]">Subtotal</span>
                      <span className="text-sm font-bold text-[oklch(0.22_0.015_65)] tabular-nums">
                        {fmtPrice(subtotal)}
                      </span>
                    </div>
                  )}

                  {/* Adjustments */}
                  {form.accountCredit > 0 && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs text-[oklch(0.55_0.04_75)]">Account Credit</span>
                      <span className="text-xs text-green-600 tabular-nums font-medium">
                        −{fmtPrice(form.accountCredit)}
                      </span>
                    </div>
                  )}
                  {form.shippingRate > 0 && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs text-[oklch(0.55_0.04_75)]">Shipping</span>
                      <span className="text-xs text-[oklch(0.22_0.015_65)] tabular-nums font-medium">
                        +{fmtPrice(form.shippingRate)}
                      </span>
                    </div>
                  )}
                  {form.serviceAdjustments !== 0 && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs text-[oklch(0.55_0.04_75)]">Service Adjustments</span>
                      <span className={`text-xs tabular-nums font-medium ${form.serviceAdjustments < 0 ? 'text-green-600' : 'text-[oklch(0.22_0.015_65)]'}`}>
                        {form.serviceAdjustments < 0 ? '−' : '+'}{fmtPrice(Math.abs(form.serviceAdjustments))}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="border-t border-[oklch(0.88_0.015_75)] bg-[oklch(0.98_0.008_75)] p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-[oklch(0.22_0.015_65)]">Estimated Total</span>
                    <span
                      key={priceKey}
                      className="text-2xl font-bold text-[oklch(0.35_0.09_155)] tabular-nums price-updated"
                    >
                      {hasItems ? fmtPrice(total) : '—'}
                    </span>
                  </div>

                  {hasItems && (
                    <div className="space-y-2 pt-2 border-t border-[oklch(0.88_0.015_75)]">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-sm font-semibold text-[oklch(0.22_0.015_65)]">Deposit Due</span>
                          <p className="text-[10px] text-[oklch(0.55_0.04_75)]">50% — due upon approval</p>
                        </div>
                        <span className="text-lg font-bold text-[oklch(0.78_0.12_85)] tabular-nums">
                          {fmtPrice(deposit)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-sm font-semibold text-[oklch(0.22_0.015_65)]">Balance</span>
                          <p className="text-[10px] text-[oklch(0.55_0.04_75)]">Due at delivery</p>
                        </div>
                        <span className="text-base font-semibold text-[oklch(0.55_0.04_75)] tabular-nums">
                          {fmtPrice(balance)}
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-[oklch(0.55_0.04_75)] leading-relaxed pt-1">
                    This is an <em>estimate only</em>. Final pricing is confirmed upon project review.
                    Adjusted hours or quantities may affect the final invoice.
                  </p>
                </div>
              </div>

              {/* Pricing Table Reference */}
              <div className="bg-white rounded-xl border border-[oklch(0.88_0.015_75)] shadow-sm p-5">
                <h3 className="text-sm font-bold text-[oklch(0.22_0.015_65)] mb-3">Pricing Tier Reference</h3>
                <div className="space-y-2">
                  {TIERS.map(t => (
                    <div
                      key={t.key}
                      className={`flex justify-between items-center px-3 py-2 rounded-lg text-xs transition-colors ${
                        tier === t.key
                          ? 'bg-[oklch(0.35_0.09_155)] text-white font-semibold'
                          : 'bg-[oklch(0.94_0.012_75)] text-[oklch(0.55_0.04_75)]'
                      }`}
                    >
                      <span>{t.label}</span>
                      <span>{t.threshold === 0 ? 'Base rate' : `${t.threshold}+ items`}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              {hasItems && (
                <button
                  type="button"
                  onClick={() => { setForm(initialState); setPriceKey(k => k + 1); }}
                  className="w-full py-2.5 text-sm font-semibold text-[oklch(0.55_0.04_75)] border border-[oklch(0.88_0.015_75)] rounded-lg hover:bg-[oklch(0.94_0.012_75)] hover:text-[oklch(0.35_0.09_155)] transition-colors"
                >
                  Reset Calculator
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-[oklch(0.88_0.015_75)] bg-white mt-12">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[oklch(0.22_0.015_65)]">Literal Memories</p>
            <p className="text-xs text-[oklch(0.55_0.04_75)]">Legacy Media Digitization Services</p>
          </div>
          <p className="text-xs text-[oklch(0.55_0.04_75)] text-center sm:text-right">
            Prices are estimates and subject to change upon project review.<br />
            Contact us to discuss your specific project needs.
          </p>
        </div>
      </footer>
    </div>
  );
}
