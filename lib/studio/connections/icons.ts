// Connection pictures shared by server (validation, auto pick) and client (rendering).
// The React icon for each key lives in components/studio/connections/ConnectionAvatar.tsx.

export interface IconPreset {
  key: string;
  label: string;
  /** Lower-case words matched against the connection and database names (English and Thai) */
  keywords: string[];
}

export const ICON_PRESETS: IconPreset[] = [
  { key: 'database', label: 'ฐานข้อมูล', keywords: [] },
  { key: 'ship', label: 'การค้า/ขนส่งทางเรือ', keywords: ['trade', 'export', 'import', 'customs', 'shipping', 'port', 'ส่งออก', 'นำเข้า', 'ศุลกากร', 'การค้า'] },
  { key: 'truck', label: 'โลจิสติกส์', keywords: ['logistic', 'delivery', 'transport', 'fleet', 'shipment', 'ขนส่ง'] },
  { key: 'package', label: 'สินค้า/คลัง', keywords: ['product', 'inventory', 'stock', 'warehouse', 'sku', 'item', 'catalog', 'สินค้า', 'คลัง'] },
  { key: 'cart', label: 'การขาย', keywords: ['sale', 'sales', 'order', 'shop', 'ecommerce', 'retail', 'pos', 'ขาย', 'คำสั่งซื้อ'] },
  { key: 'users', label: 'บุคคล/ลูกค้า', keywords: ['hr', 'employee', 'staff', 'people', 'member', 'customer', 'crm', 'user', 'พนักงาน', 'ลูกค้า', 'สมาชิก'] },
  { key: 'banknote', label: 'การเงิน', keywords: ['finance', 'account', 'payment', 'invoice', 'billing', 'bank', 'ledger', 'erp', 'การเงิน', 'บัญชี'] },
  { key: 'chart', label: 'รายงาน/สถิติ', keywords: ['analytics', 'report', 'bi', 'stat', 'stats', 'kpi', 'dwh', 'metric', 'สถิติ', 'รายงาน'] },
  { key: 'factory', label: 'การผลิต', keywords: ['manufactur', 'production', 'plant', 'mes', 'factory', 'ผลิต', 'โรงงาน'] },
  { key: 'health', label: 'สุขภาพ', keywords: ['health', 'hospital', 'patient', 'medical', 'clinic', 'สุขภาพ', 'โรงพยาบาล'] },
  { key: 'education', label: 'การศึกษา', keywords: ['education', 'school', 'student', 'course', 'lms', 'learning', 'การศึกษา', 'นักเรียน'] },
  { key: 'government', label: 'ภาครัฐ', keywords: ['gov', 'government', 'public', 'tax', 'ministry', 'ภาครัฐ', 'ภาษี', 'กระทรวง'] },
  { key: 'building', label: 'องค์กร/อสังหา', keywords: ['company', 'office', 'property', 'realestate', 'branch', 'บริษัท', 'สาขา'] },
  { key: 'globe', label: 'ต่างประเทศ', keywords: ['world', 'global', 'country', 'geo', 'international', 'ต่างประเทศ'] },
  { key: 'agriculture', label: 'เกษตร', keywords: ['agri', 'farm', 'crop', 'rice', 'durian', 'rubber', 'เกษตร', 'ข้าว', 'ทุเรียน'] },
  { key: 'energy', label: 'พลังงาน', keywords: ['energy', 'power', 'electric', 'utility', 'fuel', 'พลังงาน', 'ไฟฟ้า'] },
  { key: 'support', label: 'บริการลูกค้า', keywords: ['support', 'ticket', 'helpdesk', 'callcenter', 'service', 'บริการ'] },
  { key: 'document', label: 'เอกสาร', keywords: ['document', 'docs', 'content', 'cms', 'knowledge', 'faq', 'เอกสาร'] },
  { key: 'calendar', label: 'นัดหมาย/กิจกรรม', keywords: ['event', 'booking', 'schedule', 'reservation', 'calendar', 'นัดหมาย', 'จอง'] },
  { key: 'server', label: 'ระบบ/IoT', keywords: ['log', 'system', 'infra', 'monitor', 'iot', 'sensor', 'device', 'ระบบ'] },
];

export const ICON_PRESET_KEYS = new Set(ICON_PRESETS.map((p) => p.key));

export const ICON_COLORS = [
  '#0055fa',
  '#7c3aed',
  '#db2777',
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#16a34a',
  '#0d9488',
  '#0891b2',
  '#475569',
];

function hashColor(text: string): string {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return ICON_COLORS[h % ICON_COLORS.length];
}

/** Picks a preset from words in the names; null means "show initials". */
export function autoIcon(name: string, database: string): { preset: string | null; color: string } {
  const text = `${name} ${database}`.toLowerCase();
  const match = ICON_PRESETS.find((p) => p.keywords.some((k) => text.includes(k)));
  return { preset: match?.key ?? null, color: hashColor(name.toLowerCase()) };
}

export function initials(name: string): string {
  const words = name.trim().split(/[\s_\-.]+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => Array.from(w)[0] ?? '');
  return letters.join('').toUpperCase() || '?';
}
