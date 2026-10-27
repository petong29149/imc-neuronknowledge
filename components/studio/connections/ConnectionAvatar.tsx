"use client";

import React from "react";
import {
  Banknote,
  BarChart3,
  Building2,
  CalendarDays,
  Database,
  Factory,
  FileText,
  Globe,
  GraduationCap,
  Headset,
  HeartPulse,
  Landmark,
  Package,
  Server,
  Ship,
  ShoppingCart,
  Sprout,
  Truck,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ConnectionType } from "@/lib/studio/types";
import { initials } from "@/lib/studio/connections/icons";
import type { ConnectionIcon } from "@/lib/studio/connections/types";
import DbLogo from "./DbLogo";

export const PRESET_ICONS: Record<string, LucideIcon> = {
  database: Database,
  ship: Ship,
  truck: Truck,
  package: Package,
  cart: ShoppingCart,
  users: Users,
  banknote: Banknote,
  chart: BarChart3,
  factory: Factory,
  health: HeartPulse,
  education: GraduationCap,
  government: Landmark,
  building: Building2,
  globe: Globe,
  agriculture: Sprout,
  energy: Zap,
  support: Headset,
  document: FileText,
  calendar: CalendarDays,
  server: Server,
};

const SIZES = {
  sm: { box: "w-10 h-10 rounded-xl", icon: "w-5 h-5", text: "text-sm", badge: "sm" as const, badgeWrap: "-right-1.5 -bottom-1.5 scale-[0.6]" },
  md: { box: "w-12 h-12 rounded-xl", icon: "w-6 h-6", text: "text-base", badge: "sm" as const, badgeWrap: "-right-2 -bottom-2 scale-[0.7]" },
  lg: { box: "w-16 h-16 rounded-2xl", icon: "w-8 h-8", text: "text-xl", badge: "sm" as const, badgeWrap: "-right-2 -bottom-2 scale-90" },
  xl: { box: "w-20 h-20 rounded-3xl", icon: "w-10 h-10", text: "text-2xl", badge: "md" as const, badgeWrap: "-right-3 -bottom-3 scale-[0.8]" },
};

/** The connection's own picture inside a tile. */
export function IconTile({
  name,
  icon,
  size = "md",
}: {
  name: string;
  icon: Pick<ConnectionIcon, "kind" | "preset" | "color" | "url">;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  if (icon.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- served by our own API with a strict CSP
      <img src={icon.url} alt="" className={`${s.box} object-cover bg-white dark:bg-white/10 ring-1 ring-black/5 dark:ring-white/10 shadow-md`} />
    );
  }
  const Icon = icon.preset ? PRESET_ICONS[icon.preset] : null;
  return (
    <span
      className={`inline-flex items-center justify-center text-white font-bold shadow-md shadow-black/10 ring-1 ring-black/5 dark:ring-white/10 ${s.box}`}
      style={{ background: `linear-gradient(135deg, ${icon.color}, ${icon.color}cc)` }}
    >
      {Icon ? <Icon className={s.icon} aria-hidden="true" /> : <span className={s.text}>{initials(name)}</span>}
    </span>
  );
}

/** Two layers: the connection picture with the database-type logo pinned to its corner. */
export default function ConnectionAvatar({
  connection,
  size = "md",
}: {
  connection: { name: string; type: ConnectionType; icon: ConnectionIcon };
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  return (
    <span className="relative inline-flex shrink-0" title={connection.name}>
      <IconTile name={connection.name} icon={connection.icon} size={size} />
      <span className={`absolute origin-bottom-right ${s.badgeWrap} rounded-xl ring-2 ring-white dark:ring-[#0c1222]`}>
        <DbLogo type={connection.type} size={s.badge} />
      </span>
    </span>
  );
}
