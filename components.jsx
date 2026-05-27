// Sidebar, Navbar, StatsBento, Toolbar, MiniSparkline, PriorityChip, AlertBadge

function fmtBRL(n) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtPct(n) {
  if (n == null) return "0%";
  const v = Math.abs(n);
  return v.toFixed(v < 10 ? 1 : 0) + "%";
}
function daysSince(iso) {
  const d = new Date(iso);
  const now = new Date();
  return Math.max(0, Math.round((now - d) / (1000 * 60 * 60 * 24)));
}
function timeAgo(date) {
  if (!date) return "";
  const mins = Math.round((new Date() - new Date(date)) / 60000);
  if (mins < 1) return "agora";
  if (mins === 1) return "há 1 min";
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.round(mins / 60);
  return hrs === 1 ? "há 1 hora" : `há ${hrs} horas`;
}

// -------- Sidebar --------
function Sidebar({ products, categoryFilter, setCategoryFilter, monitorFilter, setMonitorFilter }) {
  const data = window.PRICEWATCH_DATA;

  const counts = React.useMemo(() => {
    const map = { all: products.length };
    for (const c of data.categories) if (c.id !== "all") map[c.id] = 0;
    for (const p of products) map[p.category] = (map[p.category] || 0) + 1;
    map.alert = products.filter((p) => p.alert_active).length;
    map["down-today"] = products.filter((p) => p.price_trend === "down").length;
    map["up-today"] = products.filter((p) => p.price_trend === "up").length;
    return map;
  }, [products]);

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">
          <Icon name="Tag" size={14} strokeWidth={2} />
        </div>
        <span className="tight">Pricewatch</span>
      </div>

      <div className="side-section">
        <div className="side-label">Categorias</div>
        {data.categories.map((c) => (
          <button
            key={c.id}
            className={"side-item " + (categoryFilter === c.id ? "active" : "")}
            onClick={() => setCategoryFilter(c.id)}
          >
            <Icon name={c.icon} size={16} />
            <span>{c.label}</span>
            <span className="count">{counts[c.id] || 0}</span>
          </button>
        ))}
      </div>

      <div className="side-section">
        <div className="side-label">Monitoramento</div>
        {data.monitoring.map((m) => (
          <button
            key={m.id}
            className={"side-item " + (monitorFilter === m.id ? "active" : "")}
            onClick={() => setMonitorFilter(monitorFilter === m.id ? null : m.id)}
          >
            <Icon name={m.icon} size={16} />
            <span>{m.label}</span>
            <span className="count">{counts[m.id] || 0}</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: "auto", padding: "12px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icon name="Rocket" size={14} className="" />
          <span style={{ fontSize: 12, fontWeight: 600 }}>Pricewatch Pro</span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginBottom: 10 }}>
          Monitore lojas ilimitadas e receba alertas em segundos.
        </div>
        <button className="btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 12 }}>
          Upgrade
        </button>
      </div>
    </aside>
  );
}

// -------- Navbar --------
function Navbar({ tab, setTab, onAdd }) {
  return (
    <nav className="navbar">
      <div className="tabs">
        <button className={"tab " + (tab === "wishlist" ? "active" : "")} onClick={() => setTab("wishlist")}>
          <Icon name="Bookmark" size={15} />
          Wishlist
        </button>
        <button className={"tab " + (tab === "analytics" ? "active" : "")} onClick={() => setTab("analytics")}>
          <Icon name="Activity" size={15} />
          Análises
        </button>
        <button className={"tab " + (tab === "alerts" ? "active" : "")} onClick={() => setTab("alerts")}>
          <Icon name="Bell" size={15} />
          Alertas
        </button>
      </div>

      <div className="navbar-right">
        <button className="btn-primary" onClick={onAdd}>
          <Icon name="Plus" size={14} strokeWidth={2.2} />
          Adicionar produto
        </button>
      </div>
    </nav>
  );
}

// -------- Stats bento --------
function StatsBento({ products }) {
  const total = products.reduce((s, p) => s + p.current_price, 0);
  const originalTotal = products.reduce((s, p) => s + Math.max(p.current_price, p.original_price), 0);
  const savings = Math.max(0, originalTotal - total);
  const dropsToday = products.filter((p) => p.price_trend === "down").length;
  const alerts = products.filter((p) => p.alert_active).length;
  const triggered = products.filter((p) => p.alert_price != null && p.current_price <= p.alert_price).length;

  return (
    <section className="stats-bento">
      <div className="stat-card big">
        <div>
          <div className="stat-label">
            <Icon name="Wallet" size={14} /> Total monitorado
          </div>
          <div className="stat-value tighter" style={{ marginTop: 8 }}>
            {fmtBRL(total)}
          </div>
        </div>
        <div className="stat-mini">
          <div className="stat-savings-row">
            <span className="stat-sublabel">Economia potencial</span>
            <span style={{ color: "var(--success)", fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {fmtBRL(savings)}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            {products.length} produtos · {alerts} com alerta ativo
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">
          <Icon name="TrendingDown" size={14} /> Quedas hoje
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div className="stat-value tight" style={{ color: "var(--success)" }}>{dropsToday}</div>
          <div className="stat-trend down">
            <Icon name="ArrowDown" size={12} /> {dropsToday > 0 ? "novos preços" : "—"}
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">
          <Icon name="Bell" size={14} /> Alertas ativos
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div className="stat-value tight">{alerts}</div>
          <div className="stat-trend" style={{ color: "var(--accent-strong)" }}>
            <Icon name="Target" size={12} /> {triggered} no alvo
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">
          <Icon name="ShoppingBag" size={14} /> Lojas
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div className="stat-value tight">{new Set(products.map((p) => p.store)).size}</div>
          <div className="stat-trend" style={{ color: "var(--text-dim)" }}>monitoradas</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">
          <Icon name="History" size={14} /> Há mais tempo
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div className="stat-value tight" style={{ fontSize: 26 }}>
            {products.length ? Math.max(...products.map((p) => daysSince(p.added_at))) : 0}d
          </div>
          <div className="stat-trend" style={{ color: "var(--text-dim)" }}>na lista</div>
        </div>
      </div>
    </section>
  );
}

// -------- Toolbar --------
function Toolbar({ search, setSearch, filter, setFilter, sort, setSort, counts }) {
  const filters = [
    { id: "all", label: "Todos" },
    { id: "alta", label: "Alta prioridade" },
    { id: "down", label: "Preço caiu" },
    { id: "no-alert", label: "Sem alerta" },
  ];
  return (
    <div className="toolbar">
      <div className="search-wrap">
        <span className="icon-lead">
          <Icon name="Search" size={15} />
        </span>
        <input
          className="search-input"
          placeholder="Buscar por produto, loja ou tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="chips">
        {filters.map((f) => (
          <button
            key={f.id}
            className={"chip " + (filter === f.id ? "active" : "")}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="chip-count">{counts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="toolbar-right">
        <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Mais recentes</option>
          <option value="priority">Por prioridade</option>
          <option value="price-asc">Menor preço</option>
          <option value="price-desc">Maior preço</option>
          <option value="biggest-drop">Maior queda</option>
        </select>
      </div>
    </div>
  );
}

// -------- MiniSparkline --------
function MiniSparkline({ points, width = 110, height = 32, trend = "down", showDots = false }) {
  if (!points || !points.length) return null;
  const min = Math.min(...points.map((p) => p.price));
  const max = Math.max(...points.map((p) => p.price));
  const span = Math.max(1, max - min);
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const step = w / Math.max(1, points.length - 1);

  const coords = points.map((p, i) => [pad + i * step, pad + h - ((p.price - min) / span) * h]);
  const d = coords.map((c, i) => (i === 0 ? "M" : "L") + c[0].toFixed(1) + " " + c[1].toFixed(1)).join(" ");
  const area = d + ` L ${coords[coords.length - 1][0].toFixed(1)} ${pad + h} L ${coords[0][0].toFixed(1)} ${pad + h} Z`;
  const stroke = trend === "up" ? "var(--danger)" : trend === "down" ? "var(--success)" : "var(--text-dim)";
  const fillId = "spark-fill-" + trend;
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle
        cx={coords[coords.length - 1][0]}
        cy={coords[coords.length - 1][1]}
        r="2.4"
        fill={stroke}
      />
    </svg>
  );
}

// -------- PriorityChip --------
function PriorityChip({ priority }) {
  const labels = { alta: "Alta", media: "Média", baixa: "Baixa" };
  return (
    <span className={"priority-chip " + priority}>
      <span className="dot" />
      {labels[priority] || priority}
    </span>
  );
}

// -------- AlertBadge --------
function AlertBadge({ active }) {
  return (
    <span className={"alert-badge " + (active ? "on" : "off")}>
      {active ? <span className="pulse" /> : <Icon name="BellOff" size={11} />}
      {active ? "Alerta on" : "Sem alerta"}
    </span>
  );
}

// -------- AlertsPage --------
function AlertsPage({ products, onEdit }) {
  const active = products.filter((p) => p.alert_active && p.alert_price != null);
  const triggered = active.filter((p) => p.current_price <= p.alert_price);
  const pending = active.filter((p) => p.current_price > p.alert_price);

  if (!active.length) {
    return (
      <div className="empty">
        <div className="empty-icon"><Icon name="BellOff" size={26} /></div>
        <div className="empty-title tight">Nenhum alerta configurado</div>
        <div className="empty-desc">Clique em "Editar" em qualquer produto para definir uma meta de preço e ativar alertas.</div>
      </div>
    );
  }

  function AlertRow({ p }) {
    const hit = p.current_price <= p.alert_price;
    const diffPct = ((p.current_price - p.alert_price) / p.alert_price) * 100;
    return (
      <div className={"alert-row " + (hit ? "hit" : "")}>
        <div className="alert-row-thumb">
          <img src={p.image_url} alt="" />
        </div>
        <div className="alert-row-info">
          <div className="alert-row-name">{p.name}</div>
          <div className="alert-row-store">{p.store}</div>
        </div>
        <div className="alert-row-prices">
          <span className="alert-row-current">{window.fmtBRL(p.current_price)}</span>
          <span className="alert-row-target">
            <Icon name="Target" size={11} /> meta {window.fmtBRL(p.alert_price)}
          </span>
        </div>
        <div className="alert-row-status">
          {hit
            ? <span className="price-change down"><Icon name="CheckCircle" size={11} /> Atingido</span>
            : <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>falta {window.fmtPct(Math.abs(diffPct))}</span>}
        </div>
        <button className="btn-icon" title="Editar alerta" onClick={() => onEdit(p)}>
          <Icon name="Edit3" size={13} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title tight">Alertas</h1>
          <div className="page-subtitle">{active.length} alertas ativos · {triggered.length} metas atingidas</div>
        </div>
      </div>
      {triggered.length > 0 && (
        <div className="alerts-section">
          <div className="alerts-section-label"><Icon name="CheckCircle" size={13} /> Metas atingidas</div>
          {triggered.map((p) => <AlertRow key={p.id} p={p} />)}
        </div>
      )}
      {pending.length > 0 && (
        <div className="alerts-section">
          <div className="alerts-section-label"><Icon name="Clock" size={13} /> Aguardando queda</div>
          {pending.map((p) => <AlertRow key={p.id} p={p} />)}
        </div>
      )}
    </>
  );
}

Object.assign(window, { Sidebar, Navbar, StatsBento, Toolbar, MiniSparkline, PriorityChip, AlertBadge, AlertsPage, fmtBRL, fmtPct, daysSince, timeAgo });
