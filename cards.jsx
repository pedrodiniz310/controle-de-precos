// ProductCard + ProductCardFeat + ProductGrid

function ImageWithSkeleton({ src, alt }) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <>
      {!loaded && <div className="skeleton" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.3s ease" }}
      />
    </>
  );
}

function PriceChangeBadge({ pct, trend }) {
  if (trend === "stable" || pct === 0) {
    return (
      <span className="price-change stable">
        <Icon name="Minus" size={10} strokeWidth={2} /> 0%
      </span>
    );
  }
  return (
    <span className={"price-change " + trend}>
      <Icon name={trend === "down" ? "ArrowDown" : "ArrowUp"} size={10} strokeWidth={2} />
      {window.fmtPct(pct)}
    </span>
  );
}

function ActionButtons({ onRemove, onHistory, onEdit, url }) {
  return (
    <div className="footer-actions">
      <button className="btn-icon" title="Ver histórico e alternativas" onClick={onHistory}>
        <Icon name="History" size={14} />
      </button>
      <button className="btn-icon" title="Editar alerta e prioridade" onClick={onEdit}>
        <Icon name="Edit3" size={14} />
      </button>
      <button className="btn-icon" title="Abrir loja" onClick={() => window.open(url, "_blank", "noopener")}>
        <Icon name="ExternalLink" size={14} />
      </button>
      <button className="btn-icon danger" title="Remover" onClick={onRemove}>
        <Icon name="Trash2" size={14} />
      </button>
    </div>
  );
}

function ProductCard({ p, onRemove, onHistory, onEdit }) {
  const isAtTarget = p.alert_price != null && p.current_price <= p.alert_price;
  const isHistoricalMin = p.price_history.length >= 3 &&
    p.current_price <= Math.min(...p.price_history.map((h) => h.price));
  return (
    <article className="product-card">
      <div className="card-image">
        <ImageWithSkeleton src={p.image_url} alt={p.name} />
        <span className="store-tag">{p.store}</span>
        <AlertBadge active={p.alert_active} />
      </div>
      <div className="card-body">
        <h3 className="product-name">{p.name}</h3>

        <div className="price-row">
          <span className="price-current">{window.fmtBRL(p.current_price)}</span>
          {p.original_price !== p.current_price && (
            <span className="price-original">{window.fmtBRL(p.original_price)}</span>
          )}
          <PriceChangeBadge pct={p.price_change_pct} trend={p.price_trend} />
          {isHistoricalMin && <span className="best-price-badge"><Icon name="Zap" size={9} strokeWidth={2.5} /> mínimo 30d</span>}
        </div>

        <div className="sparkline-row">
          <MiniSparkline points={p.price_history} trend={p.price_trend} />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>30d</span>
        </div>

        <div className="meta-row">
          <PriorityChip priority={p.priority} />
          {p.alert_price ? (
            <span className="alert-info">
              <Icon name="Target" size={12} />
              Meta: <b>{window.fmtBRL(p.alert_price)}</b>
              {isAtTarget && (
                <span style={{ color: "var(--success)", fontWeight: 600, marginLeft: 4 }}>· no alvo</span>
              )}
            </span>
          ) : (
            <span className="alert-info" style={{ color: "var(--text-muted)" }}>
              <Icon name="BellOff" size={12} /> Sem meta
            </span>
          )}
        </div>
      </div>

      <div className="card-footer">
        <span className="footer-meta">
          Na lista há {window.daysSince(p.added_at)} dias
          {p.last_checked_at && <> · <span title="Última verificação de preço">verificado {window.timeAgo(p.last_checked_at)}</span></>}
        </span>
        <ActionButtons onRemove={onRemove} onHistory={onHistory} onEdit={onEdit} url={p.url} />
      </div>
    </article>
  );
}

function ProductCardFeat({ p, onRemove, onHistory, onEdit }) {
  const isAtTarget = p.alert_price != null && p.current_price <= p.alert_price;
  const isHistoricalMin = p.price_history.length >= 3 &&
    p.current_price <= Math.min(...p.price_history.map((h) => h.price));
  return (
    <article className="product-card featured">
      <div className="card-image">
        <ImageWithSkeleton src={p.image_url} alt={p.name} />
        <span className="store-tag">{p.store}</span>
        <AlertBadge active={p.alert_active} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="card-body">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--accent-strong)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              <Icon name="Sparkles" size={11} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 4 }} />
              Destaque da semana
            </span>
          </div>
          <h3 className="product-name">{p.name}</h3>

          <div className="price-row">
            <span className="price-current">{window.fmtBRL(p.current_price)}</span>
            {p.original_price !== p.current_price && (
              <span className="price-original" style={{ fontSize: 14 }}>{window.fmtBRL(p.original_price)}</span>
            )}
            <PriceChangeBadge pct={p.price_change_pct} trend={p.price_trend} />
            {isHistoricalMin && <span className="best-price-badge"><Icon name="Zap" size={9} strokeWidth={2.5} /> mínimo 30d</span>}
          </div>

          <div className="sparkline-row">
            <MiniSparkline points={p.price_history} width={220} height={42} trend={p.price_trend} />
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              menor 30d: <b style={{ color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>
                {window.fmtBRL(Math.min(...p.price_history.map((x) => x.price)))}
              </b>
            </span>
          </div>

          <div className="meta-row" style={{ marginTop: 4 }}>
            <PriorityChip priority={p.priority} />
            {p.alert_price && (
              <span className="alert-info">
                <Icon name="Target" size={12} /> Meta: <b>{window.fmtBRL(p.alert_price)}</b>
                {isAtTarget && (
                  <span style={{ color: "var(--success)", fontWeight: 600, marginLeft: 4 }}>· atingida</span>
                )}
              </span>
            )}
            <span className="alert-info" style={{ color: "var(--text-muted)" }}>
              <Icon name="Globe" size={12} /> {p.store}
            </span>
          </div>
        </div>

        <div className="card-footer">
          <span className="footer-meta">
            Na lista há {window.daysSince(p.added_at)} dias
            {p.last_checked_at && <> · verificado {window.timeAgo(p.last_checked_at)}</>}
          </span>
          <ActionButtons onRemove={onRemove} onHistory={onHistory} onEdit={onEdit} url={p.url} />
        </div>
      </div>
    </article>
  );
}

function ProductGrid({ products, onRemove, onAdd, onHistory, onEdit }) {
  if (!products.length) {
    return (
      <div className="empty">
        <div className="empty-icon">
          <Icon name="Inbox" size={26} />
        </div>
        <div className="empty-title tight">Sua wishlist está vazia</div>
        <div className="empty-desc">
          Cole a URL de qualquer produto e o Pricewatch passa a monitorá-lo automaticamente — você só recebe um aviso quando o preço cair.
        </div>
        <button className="btn-primary" style={{ marginTop: 8 }} onClick={onAdd}>
          <Icon name="Plus" size={14} strokeWidth={2.2} /> Adicionar primeiro produto
        </button>
      </div>
    );
  }

  // Show first product as featured if marked, else use normal layout
  const featured = products.find((p) => p.priority === "alta");
  const rest = featured ? products.filter((p) => p.id !== featured.id) : products;
  return (
    <div className="product-grid">
      {featured && <ProductCardFeat p={featured} onRemove={() => onRemove(featured.id)} onHistory={() => onHistory(featured)} onEdit={() => onEdit(featured)} />}
      {rest.map((p) => (
        <ProductCard key={p.id} p={p} onRemove={() => onRemove(p.id)} onHistory={() => onHistory(p)} onEdit={() => onEdit(p)} />
      ))}
    </div>
  );
}

Object.assign(window, { ProductCard, ProductCardFeat, ProductGrid });
