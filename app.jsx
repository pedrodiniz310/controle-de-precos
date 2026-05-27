// App entry — handles tab state, modal, filters
const API = window.API_BASE || "http://localhost:8080";

function App() {
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadedAt, setLoadedAt] = React.useState(null);
  const [tab, setTab] = React.useState("wishlist");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [detailProduct, setDetailProduct] = React.useState(null);
  const [editProduct, setEditProduct] = React.useState(null);

  const [refreshing, setRefreshing] = React.useState(false);

  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [monitorFilter, setMonitorFilter] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [sort, setSort] = React.useState("recent");

  React.useEffect(() => {
    fetch(`${API}/api/products`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data);
        setLoadedAt(new Date());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function removeProduct(id) {
    try {
      await fetch(`${API}/api/products/${id}`, { method: "DELETE" });
    } catch (_) {}
    setProducts((arr) => arr.filter((p) => p.id !== id));
  }

  async function refreshPrices() {
    setRefreshing(true);
    try {
      await fetch(`${API}/api/admin/check-prices`, { method: "POST" });
      const data = await fetch(`${API}/api/products`).then((r) => r.json());
      setProducts(data);
      setLoadedAt(new Date());
    } catch (_) {}
    setRefreshing(false);
  }

  function addProduct(p) {
    setProducts((arr) => [p, ...arr]);
  }

  function updateProduct(updated) {
    setProducts((arr) => arr.map((p) => (p.id === updated.id ? updated : p)));
    if (detailProduct?.id === updated.id) setDetailProduct(updated);
  }


  // Filter pipeline
  const filtered = React.useMemo(() => {
    let list = products.slice();
    if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
    if (monitorFilter === "alert") list = list.filter((p) => p.alert_active);
    if (monitorFilter === "down-today") list = list.filter((p) => p.price_trend === "down");
    if (monitorFilter === "up-today") list = list.filter((p) => p.price_trend === "up");
    if (filter === "alta") list = list.filter((p) => p.priority === "alta");
    if (filter === "down") list = list.filter((p) => p.price_trend === "down");
    if (filter === "no-alert") list = list.filter((p) => !p.alert_active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.store.toLowerCase().includes(q));
    }
    if (sort === "priority") {
      const rank = { alta: 0, media: 1, baixa: 2 };
      list.sort((a, b) => rank[a.priority] - rank[b.priority]);
    } else if (sort === "price-asc") list.sort((a, b) => a.current_price - b.current_price);
    else if (sort === "price-desc") list.sort((a, b) => b.current_price - a.current_price);
    else if (sort === "biggest-drop") list.sort((a, b) => a.price_change_pct - b.price_change_pct);
    else list.sort((a, b) => new Date(b.added_at) - new Date(a.added_at));
    return list;
  }, [products, categoryFilter, monitorFilter, filter, search, sort]);

  const counts = React.useMemo(() => {
    const base = products.filter((p) =>
      categoryFilter === "all" ? true : p.category === categoryFilter
    );
    return {
      all: base.length,
      alta: base.filter((p) => p.priority === "alta").length,
      down: base.filter((p) => p.price_trend === "down").length,
      "no-alert": base.filter((p) => !p.alert_active).length,
    };
  }, [products, categoryFilter]);

  return (
    <div className="app">
      <Sidebar
        products={products}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        monitorFilter={monitorFilter}
        setMonitorFilter={setMonitorFilter}
      />
      <div>
        <Navbar tab={tab} setTab={setTab} onAdd={() => setModalOpen(true)} />
        <main className="main">
          {tab === "wishlist" ? (
            <>
              <div className="page-header">
                <div>
                  <h1 className="page-title tight">Sua wishlist</h1>
                  <div className="page-subtitle">
                    {products.length} produtos monitorados em {new Set(products.map((p) => p.store)).size} lojas
                    {loadedAt && ` — atualizado ${window.timeAgo(loadedAt)}`}
                  </div>
                </div>
                <button
                  className="btn-icon"
                  onClick={refreshPrices}
                  disabled={refreshing}
                  title={refreshing ? "Verificando preços…" : "Verificar preços agora"}
                  style={{ opacity: refreshing ? 0.6 : 1 }}
                >
                  <Icon name="RotateCw" size={15} className={refreshing ? "spin" : ""} />
                </button>
              </div>
              <StatsBento products={products} />
              <Toolbar
                search={search}
                setSearch={setSearch}
                filter={filter}
                setFilter={setFilter}
                sort={sort}
                setSort={setSort}
                counts={counts}
              />
              {loading ? (
                <div className="empty">
                  <div className="empty-icon">
                    <Icon name="Loader" size={26} className="spin" />
                  </div>
                  <div className="empty-title tight">Carregando produtos…</div>
                </div>
              ) : (
                <ProductGrid
                  products={filtered}
                  onRemove={removeProduct}
                  onAdd={() => setModalOpen(true)}
                  onHistory={(p) => setDetailProduct(p)}
                  onEdit={(p) => setEditProduct(p)}
                />
              )}
            </>
          ) : tab === "analytics" ? (
            <AnalyticsPage products={products} />
          ) : (
            <AlertsPage products={products} onEdit={(p) => setEditProduct(p)} />
          )}
        </main>
      </div>
      {modalOpen && (
        <AddProductModal onClose={() => setModalOpen(false)} onSave={addProduct} />
      )}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
        />
      )}
      {editProduct && (
        <EditAlertModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSave={updateProduct}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
