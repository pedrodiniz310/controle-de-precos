// Static config for Pricewatch — products come from the API
window.API_BASE = "http://localhost:8080";
window.ALT_COLORS = ["#f87171", "#fb923c", "#facc15", "#22d3ee", "#818cf8", "#f472b6"];

window.PRICEWATCH_DATA = {
  categories: [
    { id: "all",        label: "Todos",      icon: "Sparkles"  },
    { id: "Tecnologia", label: "Tecnologia", icon: "Cpu"       },
    { id: "Moda",       label: "Moda",       icon: "Shirt"     },
    { id: "Casa",       label: "Casa",       icon: "Home"      },
    { id: "Livros",     label: "Livros",     icon: "BookOpen"  },
    { id: "Outros",     label: "Outros",     icon: "Package"   },
  ],
  monitoring: [
    { id: "alert",      label: "Com alerta",    icon: "Bell"        },
    { id: "down-today", label: "Caíram hoje",   icon: "TrendingDown" },
    { id: "up-today",   label: "Subiram hoje",  icon: "TrendingUp"  },
  ],
};
