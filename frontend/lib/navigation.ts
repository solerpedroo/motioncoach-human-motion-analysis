import { en } from "@/messages/en";
export const navigation = [
  { href: "/", label: en.nav.overview, icon: "overview" },
  { href: "/dashboard", label: en.nav.dashboard, icon: "dashboard" },
  { href: "/workout/live", label: en.nav.live, icon: "live" },
  { href: "/workout/upload", label: en.nav.upload, icon: "upload" },
  { href: "/exercises", label: en.nav.exercises, icon: "exercises" },
  { href: "/settings", label: en.nav.settings, icon: "settings" },
  {
    href: "/about/methodology",
    label: en.nav.methodology,
    icon: "methodology",
  },
] as const;
