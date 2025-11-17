# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **social governance event analysis system (海曙区社会治理中心事件分析系统)** for the Haishu District Social Governance Center. It's a full-stack application that manages, analyzes, and reports on conflict events with features for event clustering, person analysis, topic management, and dynamic reporting.

**Tech Stack:**
- **Backend:** FastAPI (Python 3.8+) + Pandas + DuckDB for data processing
- **Frontend:** React 18 + Ant Design 5 + React Router 6
- **Data Storage:** CSV files + JSON for lightweight persistence
- **Authentication:** Simple token-based auth (admin/admin)

## Build and Run Commands

### Quick Start (Recommended)
```bash
# One-command startup (installs deps, starts both services)
./start.sh

# Development mode with detailed logs
./start.sh --dev

# Backend only (port 8000)
./start.sh --backend-only

# Frontend only (port 3000)
./start.sh --frontend-only

# Skip dependency installation
./start.sh --skip-install

# Don't auto-open browser
./start.sh --no-browser
```

### Manual Start
```bash
# Backend
cd backend
pip3 install -r requirements.txt
python3 main.py

# Frontend (supports pnpm/yarn/npm)
cd frontend
pnpm install  # or npm install
pnpm start    # or npm start
```

### Other Commands
```bash
./stop.sh              # Stop all services
./start.sh --status    # Check service status
./system-status.sh     # System health check
```

### Testing
```bash
# Frontend tests (Jest + React Testing Library)
cd frontend
pnpm test

# Backend - no formal test runner yet, but executable test scripts exist:
cd backend
python3 test_labor_dispute_query.py
```

## Architecture Overview

### Backend Structure (`backend/`)

**Key Files:**
- `main.py` - FastAPI app entry point with all route definitions
- `services.py` - Core business logic (EventService class with ~3000+ lines)
- `models.py` - Pydantic models for API request/response validation
- `operation_log_service.py` - Operation logging functionality

**Data Flow:**
1. CSV files loaded into pandas DataFrames on startup (`EventService.__init__()`)
2. All data operations happen in-memory for performance
3. Changes written back to CSV/JSON files for persistence
4. No traditional database - uses CSV as the data layer

**Important Service Methods in `EventService`:**
- `get_events()` - Main event listing with complex multi-field filtering
- `get_event_detail()` - Single event details with related events
- `get_cluster_events()` - Cluster timeline and analysis
- `search_person()` - Person lookup across multiple CSV sources
- `get_person_analysis()` - Person behavior analysis
- Topic management methods (`get_topics()`, `create_topic()`, etc.)
- Report management methods (`get_reports()`, `create_report()`, etc.)

### Frontend Structure (`frontend/src/`)

**Organization:**
- `pages/` - Route-level components (EventList, ClusterDetail, PersonAnalysisList, TopicList, ReportList, etc.)
- `components/` - Reusable components (Layout, ProtectedRoute, ReportMarkdownEditor, ReportChartPreview, etc.)
- `contexts/` - React Context providers (AuthContext for authentication)
- `services/` - API client (`api.js` with axios)
- `extensions/` - TipTap editor extensions for markdown editing
- `plugins/` - Chart rendering plugins

**Key Components:**
- `Layout.js` - Main layout with fixed navbar, navigation menu
- `ProtectedRoute.js` - Auth guard for protected routes
- `AuthContext.js` - Authentication state management
- `EventList.js` - Event listing with subscription system and complex filtering
- `ReportEdit.js` - Dynamic report editor with markdown and chart support
- `TopicList.js`, `TopicDetail.js`, `TopicStats.js` - Event topic management

**State Management:**
- Uses React Context + Hooks (no Redux/Zustand)
- AuthContext manages login state
- Local component state for most UI

### Data Files (`data/`)

**Core CSV Files:**
- `conflict_event_detail.csv` - Individual event records (~8000+ rows)
- `conflict_event.csv` - Clustered events (EventUID groups)
- `raw_conflict.csv` - Original raw event data
- `info_merge.csv` - Caller/participant information
- `people_info.csv` - Population/person master data
- `phone_master_index.csv` - Phone-based person index

**JSON Files:**
- `cluster_operations.json` - Cluster edit operation audit log
- `subscriptions.json` - User query subscriptions
- `topics.json` - Event topic definitions
- `indicator_values.json` - Indicator catalog for reports
- `reports.json` - Report configurations
- `operation_logs.json` - System operation logs

**Important Data Concepts:**
- **EventUID** - Unique identifier linking related events into clusters
- **事件编号** - Individual event number (unique per event)
- Events can be standalone or part of a cluster (group of related events)
- Person analysis tracks behavior across multiple events using phone/ID matching

## Key Features and Code Patterns

### 1. Event Filtering and Search
- **Multi-keyword inclusion/exclusion:** Uses `include`/`exclude` query params (arrays)
- **Field-specific filtering:** `include_desc`, `exclude_desc`, `include_result`, `exclude_result`
- **Multi-select facets:** `town`, `level`, `category` (all accept arrays)
- **Date range filtering:** `start_date`, `end_date` parameters
- Implementation: `services.py:EventService.get_events()` (~200 lines of pandas filtering logic)

### 2. Subscription System
- Users can save frequently-used filter combinations as "subscriptions"
- Stored in `data/subscriptions.json` with user_id, filters, name, description
- Frontend: Colored filter tags in `EventList.js` show active filters
- API endpoints: `GET/POST/PUT/DELETE /api/subscriptions`

### 3. Event Clustering
- Groups related events by EventUID
- Timeline view shows chronological sequence of clustered events
- Duration calculation (first to last event)
- Participant count aggregation
- Cluster editing: merge/split/undo operations with full audit trail
- See `ClusterDetail.js` and `services.py:get_cluster_events()`

### 4. Person Analysis
- Phone-based identity resolution across events
- Role detection (报警人/caller, 当事人/participant)
- Event participation history and statistics
- Desensitized data (phone/ID masked)
- See `PersonAnalysisList.js`, `PersonAnalysisDetail.js`

### 5. Topic Management
- Define event topics with configurable filters and keywords
- Auto-match events to topics based on criteria
- Track topic statistics (event count, trends)
- Used for thematic analysis and reporting
- See `TopicList.js`, `TopicCreate.js`, `TopicDetail.js`, `TopicStats.js`

### 6. Dynamic Reports
- Markdown-based report creation with TipTap editor
- Embed dynamic indicators and charts using placeholder syntax
- Chart types: line, bar, pie, area, scatter
- Indicator values auto-populated from JSON catalog
- See `ReportList.js`, `ReportEdit.js`, `ReportMarkdownEditor.jsx`, `ReportChartPreview.jsx`

### 7. Operation Logging
- Tracks all significant user operations (cluster edits, topic changes, etc.)
- Stored in `operation_logs.json` with user, action, details, timestamp
- Filterable log viewer UI
- See `OperationLogList.js`, `operation_log_service.py`

## Authentication

- **Simple token-based auth** (no JWT, no external auth service)
- Default credentials: `admin` / `admin`
- Frontend: `AuthContext` stores logged-in state, `ProtectedRoute` guards routes
- Backend: `/api/auth/login` endpoint validates credentials
- Health check: `/api/health` monitors service status

## Important Development Notes

### Working with Data
- **Always reload after CSV changes:** Data is loaded into memory on startup. Backend restart required after manual CSV edits.
- **Pandas filtering patterns:** Most query logic uses `.str.contains()`, `.isin()`, boolean indexing
- **NaN handling:** Use `.fillna('')` liberally to avoid NaN issues in string operations
- **Date parsing:** Use `pd.to_datetime()` with `errors='coerce'` for robust date handling

### Frontend Patterns
- **API calls:** Always use `eventAPI` object from `services/api.js`, never raw axios
- **Filter params:** Use `serializeParams()` helper to clean/format query strings
- **Ant Design components:** Prefer built-in Ant Design components (Table, Form, Card, Tag, etc.)
- **Routing:** Use `useNavigate()` hook for programmatic navigation
- **Loading states:** Always show Spin/Skeleton while fetching data

### Adding New Features

**Backend:**
1. Add Pydantic model in `models.py`
2. Add route in `main.py` with proper type hints
3. Implement business logic in `services.py:EventService`
4. Update data files if needed (remember to handle CSV I/O)

**Frontend:**
1. Add page component in `pages/` or reusable component in `components/`
2. Add route in `App.js` (wrap with `<ProtectedRoute>` and `<Layout>`)
3. Add API method in `services/api.js`
4. Update `Layout.js` menu if needed

### Common Gotchas

- **Chinese column names:** CSV files use Chinese headers (事件编号, 镇街名称, etc.) - handle carefully
- **EventUID nullability:** Not all events have EventUID (standalone events). Always check for `pd.notna()`
- **Port conflicts:** Backend runs on 8000, frontend on 3000. Use `./stop.sh` to clean up
- **Virtual environment:** `start.sh` auto-creates `venv/` if missing. Prefer using venv for isolation.
- **Package manager:** Frontend supports pnpm/yarn/npm. Script auto-detects and uses pnpm if available.
- **Browser cache:** After frontend changes, hard-refresh (Cmd+Shift+R / Ctrl+Shift+R)

## Configuration Files

- `config.env` - General system config (currently minimal usage)
- Data files in `data/` directory serve as configuration for topics, reports, subscriptions

## API Endpoints Reference

**Events:**
- `GET /api/events` - List events (paginated, filterable)
- `GET /api/events/{event_id}` - Event details
- `GET /api/filter-options` - Get filter dropdown options

**Clusters:**
- `GET /api/cluster-list` - List clustered events
- `GET /api/clusters/{event_uid}` - Cluster timeline
- `POST /api/cluster/edit` - Edit cluster (merge/split)
- `POST /api/cluster/undo` - Undo cluster operation
- `GET /api/cluster/operations` - Operation audit log

**Person Analysis:**
- `POST /api/people/search` - Search person info
- `GET /api/person-analysis` - List person analyses
- `GET /api/person-analysis/{phone}` - Person detail

**Subscriptions:**
- `GET /api/subscriptions` - List subscriptions
- `POST /api/subscriptions` - Create subscription
- `PUT /api/subscriptions/{id}` - Update subscription
- `DELETE /api/subscriptions/{id}` - Delete subscription

**Topics:**
- `GET /api/topics` - List topics
- `POST /api/topics` - Create topic
- `GET /api/topics/{id}` - Topic details
- `PUT /api/topics/{id}` - Update topic
- `DELETE /api/topics/{id}` - Delete topic
- `GET /api/topics/{id}/stats` - Topic statistics

**Reports:**
- `GET /api/reports` - List reports
- `POST /api/reports` - Create report
- `GET /api/reports/{id}` - Report details
- `PUT /api/reports/{id}` - Update report
- `DELETE /api/reports/{id}` - Delete report
- `POST /api/reports/preview` - Preview report with rendered values

**Operation Logs:**
- `GET /api/operation-logs` - List operation logs
- `GET /api/operation-logs/stats` - Operation statistics
- `GET /api/operation-logs/filter-options` - Log filter options

Full API docs: `http://localhost:8000/docs` (Swagger UI)

## Code Style

- **Python:** PEP 8, 4-space indent, type hints encouraged
- **JavaScript:** Follows `react-scripts` defaults (Prettier/ESLint)
- **Commits:** Use conventional commits format: `feat(scope): description`, `fix(scope): description`
- **Chinese in code:** UI strings and CSV column names are in Chinese - this is intentional

## Useful Context for AI Assistance

- This is a **government/public sector application** for social governance
- Data is **already desensitized** (phone numbers and IDs are masked)
- Users are **local government staff** analyzing conflict events
- Primary language is **Chinese** (UI, data, documentation)
- Focus is on **data analysis and insights**, not real-time operations
- **No external databases** - CSV-based architecture by design for simplicity
- System is **deployed internally** with simple authentication adequate for controlled environment
