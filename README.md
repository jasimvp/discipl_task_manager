# TaskFlow Pro - Company Task & Team Management System

A full-stack, enterprise-grade Task Management application built for companies to seamlessly coordinate work between **Founders**, **Team Leaders**, and **Employees**.

---

## 🌟 Key Features Built for Your Requirements

1. **Role-Based Task Assignment (റോൾ ബേസ്ഡ് ടാസ്ക് അസൈൻമെന്റ്)**:
   - **Founders (ഫൗണ്ടർമാർ)**: Can assign tasks to anyone across the company (Leads & Employees).
   - **Team Leaders (ടീം ലീഡർമാർ)**: Can create and assign tasks to members in their team or department.
   - **Employees (എംപ്ലോയീസ്)**: View assigned deliverables, update real-time progress, and change completion status.

2. **Real-time Status & Progress Tracking (സ്റ്റാറ്റസ് ട്രാക്കിംഗ്)**:
   - Tracks whether tasks are **Completed**, **In Progress**, **Under Review**, or **To Do**.
   - Displays exact **% completion** and remaining tasks count across the entire company and on a **per-employee basis**.
   - Interactive Employee Workload Table showing completed vs remaining deliverables for each team member.

3. **Wrongly Assigned Task Rejection Request (റിജക്ഷൻ റിക്വസ്റ്റ്)**:
   - If a task is assigned to the wrong employee or outside their domain, the employee can click **"Wrong Task? Request Reassignment"**.
   - The employee enters their explanation/reason (e.g. lack of access, wrong specialization).
   - An instant notification and alert banner is sent to the Founder and Team Lead.

4. **Leadership Reassignment (റീ അസൈൻ ചെയ്യാനുള്ള ഓപ്ഷൻ)**:
   - Founders & Team Leaders can review the employee's rejection request.
   - 1-click **"Accept & Reassign"** dialog allows selecting a new employee with optional handoff notes.
   - Option to decline or reassign any task at any time.

5. **Integrated Messaging Hub (ടീം & ഇൻഡിവിജ്വൽ മെസ്സേജിങ്)**:
   - **Team Channels**: Group channels (e.g. `#Engineering-Team`, `#Design-and-Product`) for department-wide announcements.
   - **1-on-1 Direct Messaging**: Private real-time messaging between any employee, team leader, or founder.
   - Real-time updates powered by Socket.IO.

6. **Instant Role Switcher for Testing (ഫാസ്റ്റ് റോൾ സ്വിച്ചർ)**:
   - A convenient role-switcher in the top navbar lets you switch instantly between **Sarah (Founder)**, **Alex (Tech Lead)**, **Maya (Design Lead)**, and **Employees (Rahul, Ananya, David, Fatima)** to test all permissions and workflows immediately without logging in and out repeatedly!

---

## 🚀 How to Run the Application

### Option 1: Fast Start Script (Windows)
Double-click `start.bat` in this folder, or run:
```powershell
npm run dev
```

### Option 2: Running Manually
1. **Start the Backend API Server**:
   ```powershell
   node server/index.js
   ```
   *Runs on http://localhost:5000*

2. **Start the Frontend Client**:
   ```powershell
   cd client
   npm run dev
   ```
   *Runs on http://localhost:5173*

---

## 👥 Demo Pre-Seeded Accounts

| Name | Role | Department / Title | Email | Password |
|---|---|---|---|---|
| **Sarah Jenkins** | 👑 Founder | Founder & CEO | `founder@company.com` | `password123` |
| **Alex Rivera** | 🛡️ Team Lead | Engineering Lead | `alex@company.com` | `password123` |
| **Maya Patel** | 🛡️ Team Lead | Product & Design Lead | `maya@company.com` | `password123` |
| **Rahul Nair** | 💼 Employee | Fullstack Developer | `rahul@company.com` | `password123` |
| **Ananya Sharma** | 💼 Employee | UI/UX Specialist | `ananya@company.com` | `password123` |
| **David Kim** | 💼 Employee | Frontend Developer | `david@company.com` | `password123` |
| **Fatima Al-Sayed** | 💼 Employee | QA Automation Engineer | `fatima@company.com` | `password123` |

*Note: You can switch between any of these users instantly using the profile switcher in the top right corner!*

---

## 🛠️ Technology Stack
- **Frontend**: React 19, Tailwind CSS, Lucide Icons, Vite, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO, SQLite (`better-sqlite3`), JSON Web Tokens (JWT), Bcrypt
- **Database**: Local SQLite database stored at `server/taskmanager.db`
