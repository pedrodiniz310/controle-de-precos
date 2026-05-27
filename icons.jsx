// Minimal Lucide-style icon set, stroke-width 1.75
// Usage: <Icon name="Bell" size={16} />
const ICON_PATHS = {
  Sparkles: <><path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z"/><path d="M19 3v4M21 5h-4M5 19v2M6 20H4"/></>,
  Cpu: <><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></>,
  Shirt: <path d="M16 3l4 2-2 4-2-1v13H8V8L6 9 4 5l4-2 2 2h4l2-2z"/>,
  Home: <><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></>,
  BookOpen: <><path d="M2 5h7a3 3 0 013 3v12a3 3 0 00-3-3H2V5z"/><path d="M22 5h-7a3 3 0 00-3 3v12a3 3 0 013-3h7V5z"/></>,
  Bell: <><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/></>,
  BellOff: <><path d="M8.7 3.7A6 6 0 0118 8c0 3.2.6 5.4 1.4 7M17.5 17.5H3s3-2 3-9c0-.5 0-1 .1-1.5M10 21a2 2 0 004 0M3 3l18 18"/></>,
  TrendingDown: <><path d="M3 7l7 7 4-4 7 7"/><path d="M21 17v-4h-4"/></>,
  TrendingUp: <><path d="M3 17l7-7 4 4 7-7"/><path d="M21 7v4h-4"/></>,
  Minus: <path d="M5 12h14"/>,
  Plus: <><path d="M12 5v14M5 12h14"/></>,
  Search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
  Filter: <path d="M3 4h18l-7 9v6l-4 2v-8L3 4z"/>,
  SlidersHorizontal: <><path d="M3 6h13M19 6h2M3 12h3M9 12h12M3 18h10M16 18h5"/><circle cx="17.5" cy="6" r="1.5"/><circle cx="7.5" cy="12" r="1.5"/><circle cx="13.5" cy="18" r="1.5"/></>,
  ExternalLink: <><path d="M14 4h6v6"/><path d="M20 4L11 13"/><path d="M19 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h6"/></>,
  Edit3: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></>,
  Trash2: <><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
  History: <><path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>,
  Activity: <path d="M3 12h4l3-9 4 18 3-9h4"/>,
  BarChart3: <><path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17v-3"/></>,
  X: <path d="M18 6L6 18M6 6l12 12"/>,
  Link2: <><path d="M9 17H7a5 5 0 010-10h2M15 7h2a5 5 0 010 10h-2M8 12h8"/></>,
  Target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>,
  Wallet: <><path d="M3 7a2 2 0 012-2h12v4"/><path d="M3 7v12a2 2 0 002 2h15a1 1 0 001-1v-3"/><path d="M17 13h5v4h-5a2 2 0 010-4z"/></>,
  ShoppingBag: <><path d="M5 7h14l-1 13a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7z"/><path d="M9 7a3 3 0 016 0"/></>,
  ArrowDown: <><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></>,
  ArrowUp: <><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></>,
  AlertTriangle: <><path d="M10.3 3.7L2 19a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.7a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></>,
  ChevronRight: <path d="M9 5l7 7-7 7"/>,
  ChevronDown: <path d="M5 9l7 7 7-7"/>,
  Check: <path d="M5 12l5 5L20 7"/>,
  Heart: <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 22l7.8-8.5 1-1a5.5 5.5 0 000-7.8z"/>,
  PieChart: <><path d="M21 12a9 9 0 11-9-9v9h9z"/></>,
  Layers: <><path d="M12 2l10 6-10 6L2 8l10-6z"/><path d="M2 16l10 6 10-6M2 12l10 6 10-6"/></>,
  Tag: <><path d="M3 11V3h8l11 11-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1.5"/></>,
  Eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  Globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></>,
  Camera: <><path d="M4 7h3l2-3h6l2 3h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z"/><circle cx="12" cy="13" r="4"/></>,
  Inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5 5h14l3 7v7a1 1 0 01-1 1H3a1 1 0 01-1-1v-7l3-7z"/></>,
  Loader: <><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></>,
  Coins: <><circle cx="8" cy="8" r="6"/><path d="M19 22a6 6 0 000-12M14 18.7a6 6 0 01-3 .3"/></>,
  Rocket: <><path d="M5 16l-2 5 5-2M8 19l-3-3M12 15l-3 3M19 5s1 5-3 9-9 3-9 3l-1-1s-1-5 3-9 9-3 9-3l1 1z"/><circle cx="14.5" cy="9.5" r="1.5"/></>,
  Bookmark: <path d="M6 3h12v18l-6-4-6 4V3z"/>,
  AlertCircle: <><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></>,
  CheckCircle: <><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></>,
  Clock: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
  Store: <><path d="M3 9l2-5h14l2 5"/><path d="M3 9v10a1 1 0 001 1h16a1 1 0 001-1V9"/><path d="M10 20v-6h4v6"/></>,
  RotateCw: <><path d="M21 2v6h-6"/><path d="M21 13a9 9 0 11-3-7.7L21 8"/></>,
  Zap: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>,
};

function Icon({ name, size = 18, className = "", strokeWidth = 1.75, ...rest }) {
  const path = ICON_PATHS[name];
  if (!path) return <span className={className} style={{ width: size, height: size, display: "inline-block" }} />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {path}
    </svg>
  );
}

window.Icon = Icon;
