# Discipl - Enterprise Task & Team Management System

A production-ready, full-stack Task Management & Team Collaboration application built specifically for **Discipl**.

---

## 🌟 Key Features

1. **Authentication & Self-Registration (രജിസ്ട്രേഷൻ)**:
   - Initial workspace setup: The first registration automatically creates the **Founder & Admin** account for Discipl.
   - Team members and employees register with their name, work email, and department.
   - Employees log in immediately upon registration without delays.

2. **Founder Access Control & Team Assignment**:
   - The Founder has a dedicated **Access** tab with live notification badges when new employees register.
   - Founders can confirm/assign employee departments, approve access, or invite members directly.

3. **Role-Based Task Assignment**:
   - **Founders & Team Leads**: Assign deliverables, set priorities (`Urgent`, `High`, `Medium`, `Low`), target deadlines, and allocate to specialists.
   - **Employees**: Update progress percentage (0-100%) and move tasks through stages (`To Do`, `In Progress`, `Under Review`, `Completed`).

4. **Wrong Task Rejection & Reassignment Workflow**:
   - If a task is wrongly allocated to an employee, they can submit a **Reassignment Request** with their rationale.
   - Founders and Team Leads receive immediate alerts and can 1-click reassign to another team member or decline.

5. **Integrated Real-Time Communication**:
   - Department channels (`#Engineering & Tech`, `#Product & Design`, `#Marketing & Growth`, `#Operations & Management`).
   - 1-on-1 private direct messaging between team members, leads, and founders powered by Socket.IO.

6. **Pure Dynamic Data**:
   - Zero static mock data. Everything is 100% driven by real users and real tasks in a high-performance SQLite database.

---

## 🚀 Running the App Locally

### Quick Launch (Windows):
Double-click `start.bat` or run:
```powershell
npm run dev
```
- Frontend UI: `http://localhost:5173`
- Backend API: `http://localhost:5000`

### Single-Command Production Mode:
```powershell
npm run build
npm start
```
*Serves both the React application and API on `http://localhost:5000`!*

---

## 🌐 Deploying to Production (ഹോസ്റ്റിംഗ് നിർദ്ദേശങ്ങൾ)

### 1. Render.com (Recommended)
1. Push your code to a GitHub repository:
   ```bash
   git add .
   git commit -m "Discipl production release"
   git push origin main
   ```
2. In [Render.com](https://render.com), click **New Web Service** and select your GitHub repository.
3. Configure the service:
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `NODE_ENV`: `production`
     - `JWT_SECRET`: `your-long-random-secret-key`
4. Add a **Persistent Disk** on Render mounted at `/data` and set `DB_PATH=/data/taskmanager.db` to keep the database permanent across redeploys.

### 2. Railway.app
1. Create a project in [Railway.app](https://railway.app) from GitHub repo.
2. Add a Volume Mount for the SQLite database.
3. Railway automatically builds and launches `npm start`.

### 3. VPS / Cloud (DigitalOcean, Hetzner, AWS)
Run using **PM2** on an Ubuntu server:
```bash
npm install && npm run build
npm install -g pm2
pm2 start server/index.js --name "discipl-taskflow"
pm2 save
```
Configure Nginx with SSL (Certbot) pointing to port 5000 with WebSocket upgrade support.
