# Unified Frontend - Store & Repair System

Single frontend application combining Store Management and Repair Management systems with unified login and dashboard.

## Features

- **Unified Login**: Single authentication for both Store and Repair systems
- **Unified Dashboard**: Combined dashboard showing metrics from both systems
- **Single Sidebar**: Navigation for both Store and Repair modules
- **Protected Routes**: JWT-based authentication for all protected pages
- **API Integration**: Connected to unified backend at `http://localhost:5000/api`

## Project Structure

```
frontend/MainDashbaod/
├── src/
│   ├── components/
│   │   ├── auth/          # Login/Signup forms
│   │   ├── form/          # Form components (Label, Input, Checkbox)
│   │   ├── header/        # Header components
│   │   └── ui/            # UI components (Button, etc.)
│   ├── context/
│   │   ├── AuthContext.tsx    # Authentication context
│   │   ├── SidebarContext.tsx  # Sidebar state
│   │   └── ThemeContext.tsx   # Theme management
│   ├── services/
│   │   └── api.ts        # API service layer
│   ├── pages/
│   │   ├── Dashboard/
│   │   │   └── UnifiedDashboard.tsx  # Main unified dashboard
│   │   ├── AuthPages/
│   │   └── ...            # Store and Repair pages
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── AppSidebar.tsx  # Sidebar with Store & Repair nav
│   │   └── AppHeader.tsx
│   └── App.tsx            # Main app with all routes
```

## Installation

1. **Navigate to frontend:**
   ```bash
   cd frontend/MainDashbaod
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `VITE_API_URL` to your backend URL (default: `http://localhost:5000/api`)

## Running the Application

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

The application will start on `http://localhost:5173` (or the port Vite assigns).

## Features

### Unified Authentication
- Single login page at `/signin`
- JWT token stored in localStorage
- Automatic token injection in API requests
- Protected routes redirect to login if not authenticated

### Unified Dashboard
- Shows metrics from both Repair and Store systems
- Quick action links to common tasks
- Real-time data from backend APIs

### Navigation Structure

**Repair System:**
- All Repair Tasks
- Create Repair
- Repair Check (All/Pending/History)
- Sent to Vendor (All/Pending/History)
- Store In
- Payment (Pending/History)

**Store System:**
- Store Indent (Create/Pending/History)
- Indent (All/Submit)
- Purchase Orders (Pending/History)
- Items
- Stock
- UOM
- Cost Location
- Vendor Rate Update (Pending/History)
- Three Party Approval (Pending/History)

## API Integration

All API calls go through the `api` service in `src/services/api.ts`:

```typescript
import { api } from '../services/api';

// Login
await api.login({ user_name: 'admin', password: 'password' });

// Get repair tasks
const tasks = await api.getRepairTasks();

// Get store indents
const indents = await api.getStoreIndentsPending();
```

## Authentication Flow

1. User visits `/signin`
2. Enters username/employee_id and password
3. Frontend calls `POST /api/auth/login`
4. Backend returns JWT token and user info
5. Token stored in localStorage
6. User redirected to unified dashboard
7. All subsequent API calls include token in Authorization header

## Environment Variables

- `VITE_API_URL`: Backend API base URL (default: `http://localhost:5000/api`)

## Development Notes

- All Store and Repair pages are currently placeholder components
- Replace placeholder components with actual UI from original Store and Repair frontends
- All API endpoints are already configured in `api.ts`
- Protected routes automatically check authentication
- Sidebar navigation includes all Store and Repair routes

## Next Steps

1. Copy actual Store UI components from `StoreFMS` frontend
2. Copy actual Repair UI components from `repairsystem` frontend
3. Replace placeholder pages with real components
4. Connect forms to API endpoints
5. Add error handling and loading states
6. Implement data tables and forms

## Support

Ensure the unified backend is running on port 5000 before starting the frontend.





