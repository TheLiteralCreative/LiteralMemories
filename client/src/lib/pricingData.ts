/**
 * Literal Memories Pricing Data
 * Sourced from the official Pricing Worksheet (Google Sheets / Excel)
 *
 * Pricing tiers based on total quoted media item count:
 *   Standard: < 10 items
 *   Bronze (10+): >= 10 items
 *   Silver (25+): >= 25 items
 *   Gold (50+): >= 50 items
 */

export type PricingTier = 'standard' | 'bronze' | 'silver' | 'gold';

export interface TierInfo {
  key: PricingTier;
  label: string;
  threshold: number;
  color: string;
  description: string;
}

export const TIERS: TierInfo[] = [
  { key: 'standard', label: 'Standard', threshold: 0,  color: '#8B7355', description: 'Base rate' },
  { key: 'bronze',   label: '10+ Items', threshold: 10, color: '#A0522D', description: 'Volume discount' },
  { key: 'silver',   label: '25+ Items', threshold: 25, color: '#708090', description: 'Silver discount' },
  { key: 'gold',     label: '50+ Items', threshold: 50, color: '#B8860B', description: 'Gold discount' },
];

export type InputMode = 'quantity' | 'hours';

export interface ServiceItem {
  id: string;
  name: string;
  inputMode: InputMode;
  /** Prices indexed: [standard, bronze, silver, gold] */
  prices: [number, number, number, number];
  unit: string;
  note?: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  services: ServiceItem[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'digitization',
    name: 'Media Digitization',
    icon: '📼',
    description: 'Convert your physical media to high-quality digital files.',
    services: [
      {
        id: 'sp-vhs-beta',
        name: 'SP-VHS / Beta',
        inputMode: 'quantity',
        prices: [29.99, 26.99, 23.99, 21.99],
        unit: 'per tape (up to 120 min)',
      },
      {
        id: '8-16mm-film',
        name: '8mm / 16mm Film',
        inputMode: 'quantity',
        prices: [29.99, 26.99, 23.99, 21.99],
        unit: 'per 50 ft reel',
      },
      {
        id: 'audio-cassette',
        name: 'Audio Cassette',
        inputMode: 'quantity',
        prices: [24.99, 17.99, 14.99, 12.99],
        unit: 'per side',
      },
      {
        id: 'photo',
        name: 'Photo',
        inputMode: 'quantity',
        prices: [5.99, 3.99, 1.99, 1.50],
        unit: 'per photo',
      },
    ],
  },
  {
    id: 'transcription',
    name: 'Transcription',
    icon: '📝',
    description: 'Convert spoken audio or video content into written text, captions, or documentation.',
    services: [
      {
        id: 'transcription-text',
        name: 'Transcription — Text Document Only',
        inputMode: 'hours',
        prices: [9.99, 8.99, 7.99, 7.99],
        unit: 'per hour of content',
        note: 'Delivered as .txt, .csv, or .xls in your chosen format',
      },
      {
        id: 'transcription-captioned',
        name: 'Transcription — Captioned Video',
        inputMode: 'hours',
        prices: [19.99, 17.99, 16.99, 15.99],
        unit: 'per hour of content',
      },
      {
        id: 'transcription-full',
        name: 'Transcription — Captions & Documentation',
        inputMode: 'hours',
        prices: [24.99, 19.99, 15.99, 12.99],
        unit: 'per hour of content',
      },
    ],
  },
  {
    id: 'video-image',
    name: 'Video / Image Enhancement',
    icon: '🎬',
    description: 'Professional restoration, color grading, and AI-powered up-resolution for your media.',
    services: [
      {
        id: 'repairs-color',
        name: 'Repairs, Color Grading & Editing',
        inputMode: 'hours',
        prices: [100.00, 100.00, 75.00, 75.00],
        unit: 'per hour',
      },
      {
        id: 'ai-video-upres',
        name: 'AI Video Up-Resolution',
        inputMode: 'hours',
        prices: [49.99, 34.99, 29.99, 26.99],
        unit: 'per hour',
        note: 'Output: .mp4 / .h264 (single image, text, or solid color backgrounds)',
      },
      {
        id: 'ai-photo-upres',
        name: 'AI Photo Up-Resolution',
        inputMode: 'hours',
        prices: [29.99, 24.99, 21.99, 19.99],
        unit: 'per hour',
      },
    ],
  },
  {
    id: 'audio',
    name: 'Audio Enhancement',
    icon: '🎵',
    description: 'Professional audio restoration and mastering services.',
    services: [
      {
        id: 'noise-reduction',
        name: 'Noise Reduction & Repair',
        inputMode: 'hours',
        prices: [29.99, 19.99, 18.99, 17.99],
        unit: 'per hour',
      },
      {
        id: 'audio-mix',
        name: 'Final Audio Mix & Mastery',
        inputMode: 'hours',
        prices: [100.00, 100.00, 85.00, 80.00],
        unit: 'per hour',
      },
    ],
  },
];

export interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  /** Prices: [standard, _, silver+, _] — only standard and silver+ differ */
  prices: [number, number, number, number];
  exclusive: boolean; /** Only one cloud option can be selected */
  type: 'physical' | 'cloud';
}

export const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    id: 'thumb-drive',
    name: '8GB Thumb Drive',
    description: 'Physical USB drive shipped with your returned media',
    prices: [45.99, 45.99, 45.99, 45.99],
    exclusive: false,
    type: 'physical',
  },
  {
    id: 'dropbox-30',
    name: 'Dropbox Link',
    description: '30-day download window via secure Dropbox link',
    prices: [29.99, 29.99, 29.99, 29.99],
    exclusive: true,
    type: 'cloud',
  },
  {
    id: 'archive-monthly',
    name: '1TB Archive — Monthly',
    description: 'Permanent 1TB cloud archive with shareable link (billed monthly)',
    prices: [14.99, 14.99, 29.99, 29.99],
    exclusive: true,
    type: 'cloud',
  },
  {
    id: 'archive-yearly',
    name: '1TB Archive — Yearly',
    description: 'Permanent 1TB cloud archive with shareable link (billed annually)',
    prices: [109.99, 109.99, 199.99, 199.99],
    exclusive: true,
    type: 'cloud',
  },
];

export function getActiveTier(totalQuantity: number): PricingTier {
  if (totalQuantity >= 50) return 'gold';
  if (totalQuantity >= 25) return 'silver';
  if (totalQuantity >= 10) return 'bronze';
  return 'standard';
}

export function getTierIndex(tier: PricingTier): number {
  const map: Record<PricingTier, number> = { standard: 0, bronze: 1, silver: 2, gold: 3 };
  return map[tier];
}

export function getServicePrice(service: ServiceItem, tier: PricingTier): number {
  return service.prices[getTierIndex(tier)];
}

export function getDeliveryPrice(option: DeliveryOption, tier: PricingTier): number {
  return option.prices[getTierIndex(tier)];
}
