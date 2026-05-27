// PriceChart, CategoryBars, Analytics page

function PriceChart({ product, days, alternatives = [], altHistories = {} }) {
  const containerRef = React.useRef(null);
  const [size, setSize] = React.useState({ w: 600, h: 360 });
  const [hover, setHover] = React.useState(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const points = React.useMemo(() => {
    const hist = product.price_history;
    if (days >= hist.length) return hist;
    return hist.slice(hist.length - days);
  }, [product, days]);

  const target = product.alert_price;
  const W = size.w;
  const H = size.h;
  const padL = 56;
  const padR = alternatives.length > 0 ? 152 : 16;
  const padT = 16;
  const padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const prices = points.map((p) => p.price);
  const altPrices = [
    ...alternatives.map((a) => a.current_price),
    ...Object.values(altHistories).flatMap((h) => h.map((p) => p.price)),
  ];
  let minP = Math.min(...prices, target ?? Infinity, ...(altPrices.length ? altPrices : [Infinity]));
  let maxP = Math.max(...prices, target ?? -Infinity, ...(altPrices.length ? altPrices : [-Infinity]));
  const pad = (maxP - minP) * 0.15 || maxP * 0.05;
  minP = Math.floor((minP - pad) / 50) * 50;
  maxP = Math.ceil((maxP + pad) / 50) * 50;
  const span = Math.max(1, maxP - minP);

  function x(i) { return padL + (i / Math.max(1, points.length - 1)) * innerW; }
  function y(price) { return padT + (1 - (price - minP) / span) * innerH; }

  const dLine = points.map((p, i) => (i === 0 ? "M" : "L") + x(i).toFixed(1) + " " + y(p.price).toFixed(1)).join(" ");
  const dArea = dLine + ` L ${x(points.length - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;

  // y ticks
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => minP + (i * span) / ticks);

  // x labels (start, mid, end)
  const dateAt = (i) => {
    const p = points[i];
    if (!p) return "";
    const d = new Date(p.date);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };
  const xLabels = [0, Math.floor(points.length / 3), Math.floor((2 * points.length) / 3), points.length - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );

  function onMove(e) {
    const rect = containerRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const idx = Math.max(0, Math.min(points.length - 1, Math.round(((px - padL) / innerW) * (points.length - 1))));
    setHover({ idx, x: x(idx), y: y(points[idx].price), price: points[idx].price, date: points[idx].date });
  }

  const accent = "var(--accent)";
  const accentStop = "rgba(167, 139, 250, 0.35)";

  return (
    <div ref={containerRef} className="chart-wrap" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg width={W} height={H}>
        <defs>
          <linearGradient id="line-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accentStop} />
            <stop offset="100%" stopColor="rgba(167, 139, 250, 0)" />
          </linearGradient>
        </defs>

        {/* gridlines + y labels */}
        {tickVals.map((v, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(v)}
              y2={y(v)}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
            />
            <text
              x={padL - 10}
              y={y(v) + 4}
              fill="var(--text-muted)"
              fontSize="10.5"
              textAnchor="end"
              fontFamily="DM Sans"
            >
              {window.fmtBRL(Math.round(v))}
            </text>
          </g>
        ))}

        {/* x labels */}
        {xLabels.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 10}
            fill="var(--text-muted)"
            fontSize="10.5"
            textAnchor="middle"
            fontFamily="DM Sans"
          >
            {dateAt(i)}
          </text>
        ))}

        {/* Target line */}
        {target != null && target >= minP && target <= maxP && (
          <>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(target)}
              y2={y(target)}
              stroke="var(--success)"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.6"
            />
            <text
              x={W - padR - 4}
              y={y(target) - 6}
              fill="var(--success)"
              fontSize="10.5"
              textAnchor="end"
              fontFamily="DM Sans"
              fontWeight="500"
            >
              Meta · {window.fmtBRL(target)}
            </text>
          </>
        )}

        {/* Alternatives — real history lines when available, dashed horizontal fallback */}
        {(() => {
          // date → x index map for the main product's timeline
          const dateToIdx = {};
          points.forEach((p, i) => { dateToIdx[p.date] = i; });

          const items = alternatives
            .map((alt, i) => {
              const color = window.ALT_COLORS[i % window.ALT_COLORS.length];
              const hist = (altHistories[alt.id] || [])
                .filter((p) => dateToIdx[p.date] !== undefined)
                .map((p) => ({ xi: dateToIdx[p.date], price: p.price }))
                .sort((a, b) => a.xi - b.xi);
              return { alt, color, yRaw: y(alt.current_price), hist };
            })
            .filter(({ alt }) => alt.current_price >= minP && alt.current_price <= maxP)
            .sort((a, b) => a.yRaw - b.yRaw);

          // De-collide right-side labels
          const placed = items.map((d) => ({ ...d, yLabel: d.yRaw }));
          const minGap = 20;
          for (let pass = 0; pass < 8; pass++) {
            for (let j = 1; j < placed.length; j++) {
              const gap = placed[j].yLabel - placed[j - 1].yLabel;
              if (gap < minGap) {
                const shift = (minGap - gap) / 2;
                placed[j - 1].yLabel = Math.max(padT + 8, placed[j - 1].yLabel - shift);
                placed[j].yLabel = Math.min(padT + innerH - 8, placed[j].yLabel + shift);
              }
            }
          }

          return placed.map(({ alt, color, yRaw, yLabel, hist }) => {
            const hasLine = hist.length >= 2;
            return (
              <g key={alt.id}>
                {hasLine ? (
                  <path
                    d={hist.map((p, j) => (j === 0 ? "M" : "L") + x(p.xi).toFixed(1) + " " + y(p.price).toFixed(1)).join(" ")}
                    stroke={color}
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.7"
                  />
                ) : (
                  <line x1={padL} x2={W - padR} y1={yRaw} y2={yRaw} stroke={color} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.85" />
                )}
                <circle cx={W - padR} cy={yRaw} r="3" fill={color} />
                {Math.abs(yRaw - yLabel) > 2 && (
                  <line x1={W - padR + 4} x2={W - padR + 4} y1={yRaw} y2={yLabel} stroke={color} strokeWidth="1" opacity="0.35" />
                )}
                <text x={W - padR + 11} y={yLabel + 4} fill={color} fontSize="10" fontFamily="DM Sans" fontWeight="600">{alt.store}</text>
                <text x={W - padR + 11} y={yLabel + 15} fill={color} fontSize="9.5" fontFamily="DM Sans" opacity="0.8">{window.fmtBRL(alt.current_price)}</text>
              </g>
            );
          });
        })()}

        {/* Area + Line */}
        <path d={dArea} fill="url(#line-area)" />
        <path d={dLine} stroke={accent} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Current point */}
        <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].price)} r="5" fill={accent} opacity="0.25" />
        <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].price)} r="3" fill={accent} />

        {/* Hover line + dot */}
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={padT} y2={padT + innerH} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            <circle cx={hover.x} cy={hover.y} r="4" fill={accent} stroke="var(--surface)" strokeWidth="2" />
          </>
        )}
      </svg>

      {hover && (
        <div
          className="chart-tip"
          style={{
            left: Math.min(W - 140, Math.max(0, hover.x + 12)),
            top: Math.max(0, hover.y - 50),
          }}
        >
          <div className="chart-tip-label">
            {new Date(hover.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
          <div className="chart-tip-value">{window.fmtBRL(hover.price)}</div>
        </div>
      )}
    </div>
  );
}

function CategoryBars({ products }) {
  const totals = {};
  for (const p of products) {
    totals[p.category] = (totals[p.category] || 0) + p.current_price;
  }
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const grand = entries.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="cat-row">
      {entries.map(([name, value], i) => {
        const pct = (value / grand) * 100;
        return (
          <div key={name} className="cat-line">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: ["var(--accent)", "var(--success)", "var(--warning)", "var(--danger)", "var(--text-dim)"][i % 5] }} />
              <span className="cat-name">{name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="cat-amount">{window.fmtBRL(value)}</span>
              <span className="cat-pct">{pct.toFixed(0)}%</span>
            </div>
            <div className="cat-bar-row">
              <div
                className="cat-bar-fill"
                style={{
                  width: pct + "%",
                  background: ["var(--accent)", "var(--success)", "var(--warning)", "var(--danger)", "var(--text-dim)"][i % 5],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AnalyticsPage({ products }) {
  const [selectedId, setSelectedId] = React.useState(products[0]?.id);
  const [range, setRange] = React.useState(30);
  const selected = products.find((p) => p.id === selectedId) || products[0];

  if (!selected) {
    return (
      <div className="empty">
        <div className="empty-icon"><Icon name="Activity" size={26} /></div>
        <div className="empty-title tight">Sem dados ainda</div>
        <div className="empty-desc">Adicione produtos à sua wishlist para ver análises de histórico e categorias.</div>
      </div>
    );
  }

  const insights = React.useMemo(() => {
    const out = [];
    const lowest = Math.min(...selected.price_history.map((p) => p.price));
    const current = selected.current_price;
    const original = selected.original_price;
    if (current <= lowest * 1.01) {
      out.push({ kind: "good", icon: "TrendingDown", text: <><b>{selected.name.split(" ").slice(0, 3).join(" ")}</b> está no <b>menor preço dos últimos {range} dias</b>. Bom momento para comprar.</> });
    }
    if (selected.alert_price && current <= selected.alert_price) {
      out.push({ kind: "good", icon: "Target", text: <>Sua meta de <b>{window.fmtBRL(selected.alert_price)}</b> foi atingida. Disparamos um alerta hoje de manhã.</> });
    }
    if (selected.price_trend === "up") {
      out.push({ kind: "bad", icon: "TrendingUp", text: <>Preço subiu <b>{window.fmtPct(selected.price_change_pct)}</b> nos últimos 7 dias — historicamente esse produto volta a cair em ~12 dias.</> });
    }
    const variation = Math.max(...selected.price_history.map((p) => p.price)) - lowest;
    out.push({ kind: "warn", icon: "Activity", text: <>Volatilidade nos últimos {range} dias: <b>{window.fmtBRL(variation)}</b> entre máxima e mínima — fique de olho.</> });
    if (original > current) {
      out.push({ kind: "good", icon: "Wallet", text: <>Você já economizou <b>{window.fmtBRL(original - current)}</b> em relação ao preço quando adicionou.</> });
    }
    return out;
  }, [selected, range]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title tight">Análises</h1>
          <div className="page-subtitle">Histórico de preços, distribuição da wishlist e insights automáticos.</div>
        </div>
      </div>

      <div className="product-picker">
        {products.map((p) => (
          <button
            key={p.id}
            className={"pp-item " + (selectedId === p.id ? "active" : "")}
            onClick={() => setSelectedId(p.id)}
          >
            <div className="pp-thumb"><img src={p.image_url} alt="" /></div>
            <div className="pp-meta">
              <span className="pp-name">{p.name}</span>
              <span className="pp-price">{window.fmtBRL(p.current_price)}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="analytics-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">{selected.name}</h3>
              <div className="panel-sub">
                Atual <b style={{ color: "var(--text)" }}>{window.fmtBRL(selected.current_price)}</b>
                {" · "}menor dos últimos {range}d{" "}
                <b style={{ color: "var(--success)" }}>{window.fmtBRL(Math.min(...selected.price_history.map((p) => p.price)))}</b>
              </div>
            </div>
            <div className="range-tabs">
              {[30, 90, 365].map((r) => (
                <button key={r} className={"range-tab " + (range === r ? "active" : "")} onClick={() => setRange(r)}>
                  {r === 365 ? "1 ano" : r + "d"}
                </button>
              ))}
            </div>
          </div>
          <PriceChart product={selected} days={range} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Distribuição por categoria</h3>
                <div className="panel-sub">Onde está o valor da sua wishlist</div>
              </div>
            </div>
            <CategoryBars products={products} />
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Insights</h3>
                <div className="panel-sub">Análise automática deste produto</div>
              </div>
            </div>
            <div className="insights">
              {insights.map((i, idx) => (
                <div key={idx} className={"insight " + i.kind}>
                  <div className="insight-icon"><Icon name={i.icon} size={14} /></div>
                  <div className="insight-text">{i.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PriceChart, CategoryBars, AnalyticsPage });
