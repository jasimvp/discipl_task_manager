# 🚀 Discipl Workspace - Complete Production Hosting Guide

This guide explains how to host your **Discipl Task & Deliverables Management Workspace** on the cloud or on a private server.

Because the Express backend serves the built React frontend (`client/dist`) as a single unified service with Socket.IO, **you only need to host one single application**!

---

## 📋 Architecture Overview

* **Unified Port**: One single port (`PORT`, default `5000`) serves both:
  * Frontend React Single Page App (`/` and all client routes)
  * REST API (`/api/*`)
  * Real-Time WebSockets (`/socket.io/*`)
* **Database**: Embedded SQLite (`server/taskmanager.db` or via `DB_PATH`).
* **Environment Variables**:
  * `PORT`: Server port (injected automatically by most cloud hosts like Render/Railway).
  * `NODE_ENV`: Set to `production`.
  * `JWT_SECRET`: Random secret string used to sign login tokens.
  * `DB_PATH`: *(Optional)* Path to SQLite file (e.g. `/app/data/taskmanager.db` for persistent volume mounts).

---

## 🌟 Option 1: Render.com (Recommended - Easiest & Free Tier Available)

[Render](https://render.com) can build and host your repository directly from GitHub/GitLab.

### Step-by-Step Instructions:
1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare production hosting"
   git branch -M main
   git remote add origin https://github.com/<your-username>/discipl-task-manager.git
   git push -u origin main
   ```
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** ➔ **Web Service**.
4. Connect your GitHub repository.
5. Configure the deployment settings:
   * **Name**: `discipl-workspace` (or your company name)
   * **Region**: Choose the closest location (e.g., Singapore, Frankfurt, Oregon)
   * **Branch**: `main`
   * **Root Directory**: *(Leave empty)*
   * **Runtime**: `Node`
   * **Build Command**:
     ```bash
     npm run postinstall && npm run build
     ```
   * **Start Command**:
     ```bash
     npm start
     ```
   * **Instance Type**: Free or Starter
6. Add **Environment Variables**:
   * `NODE_ENV` = `production`
   * `JWT_SECRET` = *(Click "Generate" or enter a secure random string)*
7. Click **Deploy Web Service**.

> **Persistent Disk Note**: Free tier on Render spins down when inactive and uses an ephemeral disk. To keep your SQLite database permanently across instance restarts, upgrade to Starter ($7/mo) and attach a Persistent Disk mounted at `/app/data` with `DB_PATH=/app/data/taskmanager.db`, or host via VPS/Docker (Option 3).

---

## 🚆 Option 2: Railway.app (Instant Setup with WebSockets)

[Railway](https://railway.com) offers great WebSocket and persistent volume support.

### Step-by-Step Instructions:
1. Go to [Railway.app](https://railway.com) and log in with GitHub.
2. Click **New Project** ➔ **Deploy from GitHub repo**.
3. Select your repository.
4. Go to **Settings**:
   * **Build Command**: `npm run postinstall && npm run build`
   * **Start Command**: `npm start`
5. Go to **Variables** and add:
   * `NODE_ENV` = `production`
   * `JWT_SECRET` = `your-custom-secret-key-discipl-2026`
6. *(Optional for Persistence)* Under **Volumes**, click **Add Volume** mounted to `/app/data`, and add environment variable:
   * `DB_PATH` = `/app/data/taskmanager.db`
7. Under **Networking**, click **Generate Domain** to get your public HTTPS URL (e.g. `discipl-production.up.railway.app`).

---

## 🐳 Option 3: VPS / Cloud Server with Docker (DigitalOcean / AWS / Linode / Hetzner)

If you have a Linux VPS (Ubuntu/Debian), Docker gives you the cleanest isolated setup with automatic database volume persistence.

### Prerequisites:
Install Docker and Docker Compose on your server:
```bash
curl -fsSL https://get.docker.com | sh
```

### Deployment:
1. Clone your project onto the server:
   ```bash
   git clone https://github.com/<your-username>/discipl-task-manager.git
   cd discipl-task-manager
   ```
2. Start the container in detached background mode:
   ```bash
   docker compose up -d --build
   ```
3. Your app is now running on port `5000` with the SQLite database safely stored in Docker volume `discipl_data`!
4. To view logs:
   ```bash
   docker compose logs -f
   ```

### Connecting Your Domain with Nginx & SSL (Certbot):
Create `/etc/nginx/sites-available/discipl.conf`:
```nginx
server {
    server_name tasks.yourcompany.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable the site and generate free HTTPS certificates:
```bash
sudo ln -s /etc/nginx/sites-available/discipl.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tasks.yourcompany.com
```

---

## ⚡ Option 4: Free Cloudflare Tunnel (Host from your existing PC / Office Server)

If you want to host this directly from your existing office computer or home server **without opening router ports or static IP**:

1. Install [Cloudflare Cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/):
   ```bash
   # Windows (via winget)
   winget install --id Cloudflare.cloudflared
   ```
2. Run your server locally in production mode:
   ```bash
   npm run build
   npm start
   ```
3. In a separate terminal, launch a free HTTPS tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:5000
   ```
4. Cloudflare will output a public HTTPS link (e.g., `https://random-words.trycloudflare.com`) that anyone in your team can immediately access securely from anywhere in the world!

---

## 🔒 Security Checklist for Production

- [ ] Changed `JWT_SECRET` in production `.env` to a long, secure random key.
- [ ] Confirmed frontend connects to dynamic host origin (no `http://localhost:5000` hardcoded).
- [ ] Enabled HTTPS (Render, Railway, and Cloudflare do this automatically).
- [ ] Backed up the SQLite database file (`taskmanager.db`) periodically.
