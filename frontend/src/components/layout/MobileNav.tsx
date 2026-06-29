"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Swords, Castle, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_NAV = [
  { href: "/",         label: "Tổng quan", icon: LayoutDashboard },
  { href: "/war",      label: "War",       icon: Swords },
  { href: "/capital",  label: "Capital",   icon: Castle },
  { href: "/members",  label: "Thành viên",icon: Users },
  { href: "/settings", label: "Cài đặt",   icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-900 border-t border-gray-800 flex items-stretch">
      {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors relative",
              active ? "text-yellow-400" : "text-gray-500"
            )}>
            <Icon size={20} />
            <span className="text-[9px] font-medium">{label}</span>
            {active && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-yellow-500" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
