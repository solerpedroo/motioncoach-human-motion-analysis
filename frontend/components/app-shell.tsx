"use client";

import {
  Activity,
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  CircleHelp,
  Dumbbell,
  House,
  ScanLine,
  Settings2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { navigation } from "@/lib/navigation";
import { en } from "@/messages/en";

const icons = {
  overview: House,
  dashboard: ChartNoAxesCombined,
  live: ScanLine,
  upload: Upload,
  exercises: Dumbbell,
  settings: Settings2,
  methodology: BookOpen,
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const current = navigation.find((item) => item.href === pathname);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="MotionCoach home">
          <span className="brand-mark">
            <Activity size={23} />
          </span>
          Motion<span>Coach</span>
        </Link>
        <div className="workspace-label">MOVEMENT WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = icons[item.icon];
            return (
              <Link
                className="nav-item"
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.icon === "live" ? <span className="nav-dot" /> : null}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <ShieldCheck size={22} />
            <strong>Built around your privacy</strong>
            <p>Live movement stays in your browser.</p>
            <Link href="/settings">
              Explore privacy <ArrowUpRight size={14} />
            </Link>
          </div>
          <span className="version">
            FOUNDATION PREVIEW <span>v0.1.0</span>
          </span>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <span className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>{current?.label ?? "Session report"}</strong>
          </span>
          <div className="topbar-right">
            <span className="preview-badge">
              {pathname === "/workout/live"
                ? "Local camera · development seeds"
                : pathname === "/dashboard" || pathname.startsWith("/sessions/")
                  ? "Local summaries · opt-in history"
                  : en.preview}
            </span>
            <Link
              href="/about/methodology"
              aria-label="Help and methodology"
              className="help-link"
            >
              <CircleHelp size={20} />
            </Link>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="app-footer">
          <ShieldCheck size={14} />
          <span>{en.limit}</span>
        </footer>
      </div>
    </div>
  );
}
