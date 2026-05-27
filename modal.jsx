// AddProductModal + ProductPreview

function AddProductModal({ onClose, onSave }) {
  const [url, setUrl] = React.useState("");
  const [stage, setStage] = React.useState("idle"); // idle | loading | preview | saving
  const [preview, setPreview] = React.useState(null);
  const [priority, setPriority] = React.useState("media");
  const [target, setTarget] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    inputRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function detectStore(u) {
    try {
      const host = new URL(u).hostname.replace("www.", "");
      const map = {
        "amazon.com": "Amazon",
        "amazon.com.br": "Amazon",
        "mercadolivre.com.br": "Mercado Livre",
        "magazineluiza.com.br": "Magazine Luiza",
        "magalu.com": "Magazine Luiza",
        "americanas.com.br": "Americanas",
        "casasbahia.com.br": "Casas Bahia",
        "nike.com.br": "Nike",
        "apple.com": "Apple",
        "kabum.com.br": "Kabum",
      };
      return map[host] || host.split(".")[0].replace(/^\w/, (c) => c.toUpperCase());
    } catch {
      return "Loja";
    }
  }

  async function fetchPreview() {
    if (!url.trim()) return;
    setStage("loading");
    setError(null);
    try {
      const res = await fetch(`${window.API_BASE}/api/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Erro ${res.status} ao buscar produto`);
      }
      const data = await res.json();
      setPreview(data);
      setStage("preview");
    } catch (e) {
      setError(e.message);
      setStage("idle");
    }
  }

  async function handleSave() {
    if (!preview) return;
    setStage("saving");
    setError(null);
    try {
      const res = await fetch(`${window.API_BASE}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: preview.name,
          url: url.trim(),
          image_url: preview.image_url,
          store: preview.store || detectStore(url),
          current_price: preview.price,
          priority,
          category: "Outros",
          alert_price: target ? Number(target) : null,
          notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Erro ${res.status} ao salvar produto`);
      }
      const product = await res.json();
      onSave(product);
      onClose();
    } catch (e) {
      setError(e.message);
      setStage("preview");
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Adicionar produto à wishlist</h2>
            <div className="modal-sub">Cole o link de qualquer e-commerce — extraímos automaticamente.</div>
          </div>
          <button className="btn-icon modal-close" onClick={onClose} title="Fechar">
            <Icon name="X" size={15} />
          </button>
        </div>

        <div className="field">
          <label className="field-label">
            <Icon name="Link2" size={12} /> URL do produto
          </label>
          <div className="fetch-row">
            <input
              ref={inputRef}
              className="input"
              placeholder="https://amazon.com.br/dp/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchPreview();
              }}
            />
            <button
              className="btn-primary"
              onClick={fetchPreview}
              disabled={stage === "loading" || !url.trim()}
              style={{ opacity: stage === "loading" || !url.trim() ? 0.6 : 1 }}
            >
              {stage === "loading" ? (
                <>
                  <Icon name="Loader" size={14} className="spin" />
                  Buscando…
                </>
              ) : (
                <>
                  <Icon name="Search" size={14} />
                  Buscar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview area: skeleton during loading, then real preview */}
        {stage === "loading" && (
          <div className="preview">
            <div className="preview-img"><div className="skeleton" /></div>
            <div className="preview-meta">
              <div className="skel-line med" />
              <div className="skel-line short" />
              <div style={{ height: 8 }} />
              <div className="skel-line" style={{ width: 110, height: 18 }} />
            </div>
          </div>
        )}
        {(stage === "preview" || stage === "saving") && preview && (
          <div className="preview">
            <div className="preview-img">
              <img src={preview.image_url} alt={preview.name} />
            </div>
            <div className="preview-meta">
              <div className="preview-store">{preview.store || detectStore(url)}</div>
              <div className="preview-name">{preview.name}</div>
              <div className="preview-price">{window.fmtBRL(preview.price)}</div>
            </div>
          </div>
        )}

        {(stage === "preview" || stage === "saving") && (
          <>
            <div style={{ height: 8 }} />
            <div className="field-row">
              <div className="field">
                <label className="field-label">Prioridade</label>
                <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">
                  <Icon name="Target" size={12} /> Meta de preço
                </label>
                <input
                  className="input"
                  type="number"
                  placeholder={String(Math.round(preview.price * 0.9))}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Notas</label>
              <textarea
                className="textarea"
                placeholder="Por que esse produto entra na sua wishlist?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </>
        )}

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--danger)", fontSize: 13, padding: "4px 0" }}>
            <Icon name="AlertCircle" size={13} /> {error}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            disabled={stage !== "preview"}
            onClick={handleSave}
            style={{ opacity: stage === "preview" ? 1 : 0.5 }}
          >
            {stage === "saving" ? (
              <><Icon name="Loader" size={14} className="spin" /> Salvando…</>
            ) : (
              <><Icon name="Check" size={14} strokeWidth={2.2} /> Adicionar à wishlist</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductDetailModal({ product, onClose }) {
  const [alts, setAlts] = React.useState(null);
  const [altHistories, setAltHistories] = React.useState({});
  const [loadingAlts, setLoadingAlts] = React.useState(false);
  const [altError, setAltError] = React.useState(null);
  const [range, setRange] = React.useState(30);

  React.useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Load existing alternatives on open
  React.useEffect(() => {
    fetch(`${window.API_BASE}/api/products/${product.id}/alternatives`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (data.length) setAlts(data); })
      .catch(() => {});
  }, [product.id]);

  // Load price history for each alternative
  React.useEffect(() => {
    if (!alts || alts.length === 0) return;
    const fetchHistories = async () => {
      const results = {};
      await Promise.all(
        alts.map(async (alt) => {
          try {
            const res = await fetch(`${window.API_BASE}/api/products/${alt.id}/history?days=30`);
            if (res.ok) results[alt.id] = await res.json();
          } catch (_) {}
        })
      );
      setAltHistories(results);
    };
    fetchHistories();
  }, [alts]);

  async function removeAlt(altId) {
    try {
      await fetch(`${window.API_BASE}/api/products/${altId}`, { method: "DELETE" });
    } catch (_) {}
    setAlts((arr) => arr.filter((a) => a.id !== altId));
  }

  async function handleFindAlts() {
    setLoadingAlts(true);
    setAltError(null);
    try {
      const res = await fetch(`${window.API_BASE}/api/products/${product.id}/find-alternatives`, { method: "POST" });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data = await res.json();
      setAlts(data);
    } catch (e) {
      setAltError(e.message);
    } finally {
      setLoadingAlts(false);
    }
  }

  const minHist = product.price_history.length ? Math.min(...product.price_history.map((p) => p.price)) : product.current_price;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="modal-title" style={{ fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</h2>
            <div className="modal-sub">
              {product.store} · Atual <b style={{ color: "var(--text)" }}>{window.fmtBRL(product.current_price)}</b>
              {" · "}mínimo 30d <b style={{ color: "var(--success)" }}>{window.fmtBRL(minHist)}</b>
            </div>
          </div>
          <div className="range-tabs" style={{ flexShrink: 0 }}>
            {[30, 90, 365].map((r) => (
              <button key={r} className={"range-tab " + (range === r ? "active" : "")} onClick={() => setRange(r)}>
                {r === 365 ? "1 ano" : r + "d"}
              </button>
            ))}
          </div>
          <button className="btn-icon modal-close" onClick={onClose} style={{ flexShrink: 0 }}>
            <Icon name="X" size={15} />
          </button>
        </div>

        <PriceChart product={product} days={range} alternatives={alts || []} altHistories={altHistories} />

        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button className="btn-ghost" onClick={handleFindAlts} disabled={loadingAlts} style={{ opacity: loadingAlts ? 0.6 : 1 }}>
            {loadingAlts
              ? <><Icon name="Loader" size={13} className="spin" /> Buscando…</>
              : <><Icon name="Store" size={13} /> {alts ? "Buscar novamente" : "Buscar em outros marketplaces"}</>}
          </button>
          {alts && alts.length === 0 && !loadingAlts && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Nenhuma alternativa encontrada.</span>
          )}
          {altError && (
            <span style={{ fontSize: 12, color: "var(--danger)", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="AlertCircle" size={12} /> {altError}
            </span>
          )}
        </div>

        {alts && alts.length > 0 && (
          <div className="alts-legend">
            <div className="alt-legend-item current">
              <span className="alt-legend-dot" style={{ background: "var(--accent)" }} />
              <span style={{ flex: 1 }}>{product.store} <span style={{ color: "var(--text-muted)", fontSize: 11 }}>(monitorado)</span></span>
              <span className="alt-legend-price">{window.fmtBRL(product.current_price)}</span>
            </div>
            {alts.map((alt, i) => {
              const color = ALT_COLORS[i % ALT_COLORS.length];
              const diffPct = ((alt.current_price - product.current_price) / product.current_price) * 100;
              const cheaper = diffPct < 0;
              return (
                <div key={alt.id} className="alt-legend-item">
                  <span className="alt-legend-dot" style={{ background: color }} />
                  <span style={{ flex: 1 }}>{alt.store}</span>
                  <span className={"price-change " + (cheaper ? "down" : "up")} style={{ fontSize: 11 }}>
                    {cheaper ? "" : "+"}{diffPct.toFixed(0)}%
                  </span>
                  <span className="alt-legend-price">{window.fmtBRL(alt.current_price)}</span>
                  <a href={alt.url} target="_blank" rel="noopener" style={{ color: "var(--text-muted)", display: "flex" }} title="Abrir loja">
                    <Icon name="ExternalLink" size={12} />
                  </a>
                  <button className="btn-icon" title="Remover marketplace" onClick={() => removeAlt(alt.id)} style={{ opacity: 0.45, marginLeft: 2 }}>
                    <Icon name="Trash2" size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

function EditAlertModal({ product, onClose, onSave }) {
  const [alertPrice, setAlertPrice] = React.useState(product.alert_price != null ? String(product.alert_price) : "");
  const [alertActive, setAlertActive] = React.useState(product.alert_active);
  const [priority, setPriority] = React.useState(product.priority);
  const [notes, setNotes] = React.useState(product.notes || "");
  const [category, setCategory] = React.useState(product.category || "Outros");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${window.API_BASE}/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alert_price: alertPrice ? Number(alertPrice) : null,
          alert_active: alertPrice ? alertActive : false,
          priority,
          notes,
          category,
        }),
      });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const updated = await res.json();
      onSave(updated);
      onClose();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Editar produto</h2>
            <div className="modal-sub" style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</div>
          </div>
          <button className="btn-icon modal-close" onClick={onClose}><Icon name="X" size={15} /></button>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">Prioridade</label>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">Categoria</label>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {window.PRICEWATCH_DATA.categories.filter((c) => c.id !== "all").map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field-label"><Icon name="Target" size={12} /> Meta de preço (R$)</label>
          <input
            className="input"
            type="number"
            placeholder={"Ex: " + Math.round(product.current_price * 0.9)}
            value={alertPrice}
            onChange={(e) => setAlertPrice(e.target.value)}
          />
        </div>

        {alertPrice && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>
            <input type="checkbox" checked={alertActive} onChange={(e) => setAlertActive(e.target.checked)} style={{ accentColor: "var(--accent)", width: 15, height: 15 }} />
            Alerta ativo (notificar quando atingir a meta)
          </label>
        )}

        <div className="field">
          <label className="field-label">Notas</label>
          <textarea className="textarea" placeholder="Observações sobre o produto…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--danger)", fontSize: 13, marginBottom: 8 }}>
            <Icon name="AlertCircle" size={13} /> {error}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
            {saving ? <><Icon name="Loader" size={14} className="spin" /> Salvando…</> : <><Icon name="Check" size={14} /> Salvar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AddProductModal, ProductDetailModal, EditAlertModal });
