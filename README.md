# Prime Glory PPC System

A comprehensive **Production Planning & Control (PPC)** system for cosmetics manufacturing, built with React and Supabase.

## 🎯 Features

- **14 Manufacturing Modules**: Dashboard, Orders, Production Scheduling (Gantt), Shop Floor Tracking, Process Designer, Warehouse, and more
- **Bilingual Interface**: Thai (default) and English support throughout
- **Real-time Database**: Supabase PostgreSQL with Row-Level Security
- **Role-Based Access**: Admin, PPC Planner, Warehouse, Production, Management roles
- **Dense Information-Rich UI**: SAP-like interface optimized for manufacturing operations
- **Real-Time Charts**: Production metrics, efficiency dashboards, material tracking

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Edge, Firefox)
- Supabase account (free tier available)

### Deployment

#### Option 1: Run Locally
```bash
# Clone the repository
git clone <repo-url>
cd Claude-PPC

# Open in browser
open "Prime Glory PPC System.html"
# or use local server
python -m http.server 8000
# Visit http://localhost:8000
```

#### Option 2: Deploy to Vercel (Recommended)
1. Push this repository to GitHub
2. Sign up at [vercel.com](https://vercel.com)
3. Create new project → Import GitHub repo
4. Environment variables:
   ```
   VITE_SUPABASE_URL=https://onucjibwifwajzizlshv.supabase.co
   VITE_SUPABASE_KEY=sb_publishable_jR8yyCqOQgAgKfac3TvTmw_APJ3u3ws
   ```
5. Deploy → Done! ✅

## 🔐 Default Credentials

```
Username: admin
Password: prime888
```

## 📋 Architecture

```
React SPA (Babel Standalone)
├── Frontend: React 18.3.1 via UMD
├── Styling: Modern CSS with design tokens
├── Data Layer: Supabase PostgreSQL
├── i18n: Thai/English bilingual support
└── State Management: React hooks + localStorage
```

## 🗄️ Database Schema

20 core tables for manufacturing operations:
- `users`, `roles` — Authentication & Authorization
- `materials`, `material_stock` — Raw materials
- `finished_goods`, `fg_warehouse` — Products & inventory
- `orders`, `order_lines` — Customer orders
- `production_schedules`, `work_orders` — Production planning
- `shopfloor_status`, `warehouse_*` — Operations tracking
- `bom`, `bom_lines` — Recipes & formulations
- And more...

All tables use PostgreSQL 17 with Row-Level Security enabled.

## 📁 Project Structure

```
.
├── Prime Glory PPC System.html    # Entry point
├── app/
│   ├── app.jsx                   # Main shell
│   ├── data.jsx                  # Supabase + mock data layer
│   ├── i18n.jsx                  # Thai/English translations
│   ├── ui.jsx                    # Design system components
│   ├── charts.jsx                # Chart components
│   ├── dashboard.jsx             # Dashboard module
│   ├── orders.jsx                # Order management
│   ├── scheduling.jsx            # Gantt scheduling
│   ├── shopfloor.jsx             # WIP tracking
│   ├── warehouse.jsx             # Warehouse management
│   └── ... 10 more modules
├── .env.local                    # Supabase config (local)
└── styles.css                    # Global styles
```

## 🔧 Configuration

Edit `.env.local` to change Supabase project:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key
```

## 🎨 Design System

**Colors:**
- Primary: #2d5bd7 (Blue)
- Sidebar: #122038 (Navy)
- Status: Waiting #e08a1e, Scheduled #7b5cd9, Completed #1f8a5b

**Typography:**
- IBM Plex Sans Thai for Thai text
- IBM Plex Sans for Latin
- IBM Plex Mono for code

## 🚦 Module Overview

| Module | Role | Purpose |
|--------|------|---------|
| Dashboard | All | KPIs, production overview |
| Orders | PPC | Customer order management |
| Order Flow | PPC | 5-step production request flow |
| Scheduling | PPC | Gantt drag-drop scheduling |
| Designer | Production | Workflow template builder |
| Shop Floor | Production | WIP real-time tracking |
| Receiving | Warehouse | Material receiving QC |
| Issue | Warehouse | Material allocation |
| FG Receiving | Warehouse | Finished goods QC |
| FG Sales | Warehouse | Sales/shipping |
| Stock | All | Inventory levels |
| Items | Admin | Item master maintenance |
| BOM | Admin | Bill of Materials |
| Settings | Admin | Factory configuration |
| Users | Admin | User management |

## 🔐 Security

- **Row-Level Security**: PostgreSQL RLS policies on all sensitive tables
- **Authentication**: Role-based access control (RBAC)
- **API Keys**: Publishable key only (safe for frontend)
- **HTTPS**: Required for production deployment

## 📊 Sample Data

Database includes sample data:
- 8 raw materials (RM001–RM011)
- 4 finished goods products
- 2 production lines
- 8 production steps
- 2 customers
- 5 user roles

## 🐛 Troubleshooting

**Data not loading?**
- Check Supabase project is active
- Verify API keys in `.env.local`
- Check browser console for errors

**Styling issues?**
- Clear browser cache
- Check app/styles.css is loading

**Login fails?**
- Default credentials: admin / prime888
- Check users table in Supabase

## 📞 Support

For issues or questions:
1. Check Supabase dashboard for database errors
2. Inspect browser console (F12 → Console)
3. Review app/data.jsx for mock fallback data

## 📝 License

© 2026 Prime Glory Manufacturing. All rights reserved.

---

**Built with:**
- React 18.3.1
- Supabase PostgreSQL
- Vercel (or similar host)
