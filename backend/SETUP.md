# Pricewatch Backend — Setup

## Desenvolvimento local

```bash
cd backend

# Cria ambiente virtual
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac

# Instala dependências
pip install -r requirements.txt

# Instala Playwright (Chromium para scraping de fallback)
playwright install chromium

# Configura variáveis de ambiente
cp .env.example .env
# edite .env com suas credenciais

# Sobe a API
uvicorn app.main:app --reload --port 8080
```

Acesse `http://localhost:8080/docs` para ver a documentação interativa.

## Variáveis de ambiente obrigatórias

| Variável | Onde obter |
|----------|-----------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (mode: Session, URI) — troque `postgresql://` por `postgresql+asyncpg://` |
| `TELEGRAM_BOT_TOKEN` | @BotFather no Telegram |
| `TELEGRAM_CHAT_ID` | Mande `/start` pro bot, use `https://api.telegram.org/bot<TOKEN>/getUpdates` |
| `RESEND_API_KEY` | resend.com → API Keys |
| `OBSIDIAN_API_KEY` | Obsidian → Community Plugins → Local REST API → API Key |

## Conectar o frontend

Abra `Controle-de-preços/Pricewatch.html` no browser via Live Server (VSCode) ou similar na porta 5500.

O frontend já está configurado para chamar `http://localhost:8080/api/*`.

Se usar outra porta, altere `FRONTEND_ORIGIN` no `.env`.

## Deploy no Fly.io

```bash
# Instala flyctl se não tiver
# https://fly.io/docs/getting-started/installing-flyctl/

# Login
fly auth login

# Cria o app (só na primeira vez)
fly launch --no-deploy

# Configura secrets
fly secrets set DATABASE_URL="postgresql+asyncpg://..."
fly secrets set TELEGRAM_BOT_TOKEN="..."
fly secrets set TELEGRAM_CHAT_ID="..."
fly secrets set RESEND_API_KEY="..."
fly secrets set ALERT_EMAIL_TO="pedrodiniz310@gmail.com"
fly secrets set OBSIDIAN_API_KEY="..."
fly secrets set FRONTEND_ORIGIN="https://seu-frontend.vercel.app"

# Deploy
fly deploy
```

## Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/health` | Health check |
| `POST` | `/api/scrape` | Extrai dados de uma URL de produto |
| `GET` | `/api/products` | Lista todos os produtos |
| `POST` | `/api/products` | Adiciona produto à lista |
| `PATCH` | `/api/products/{id}` | Atualiza prioridade, alerta, notas |
| `DELETE` | `/api/products/{id}` | Remove produto |
| `GET` | `/api/products/{id}/history?days=30` | Histórico de preços |
| `POST` | `/api/admin/check-prices` | Dispara verificação manual |

## Verificação de preços manual

Para testar o tracker sem esperar o agendamento de 6h:

```bash
curl -X POST http://localhost:8080/api/admin/check-prices
```
