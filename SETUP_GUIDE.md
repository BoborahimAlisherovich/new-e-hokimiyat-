# E-Hokimiyat Platform - Setup & Configuration Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- pip (Python package manager)

### Installation Steps

#### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python populate_data.py
```

#### 2. Frontend Setup
```bash
npm install
```

#### 3. Environment Configuration
Create `.env.local` in the project root:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=E-Hokimiyat Platform
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Running the Application

#### Option 1: Automated Startup (Recommended)
```bash
./start.sh
```

#### Option 2: Manual Startup

**Terminal 1 - Backend:**
```bash
cd backend
python manage.py runserver 8000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## 📊 API Integration

The frontend communicates with the Django backend through REST API endpoints:

- **API Base URL:** `http://localhost:8000`
- **Tasks Endpoint:** `/api/tasks/`
- **Users Endpoint:** `/api/users/`
- **Organizations Endpoint:** `/api/organizations/`
- **Notifications Endpoint:** `/api/notifications/`

### Authentication
The API uses JWT (JSON Web Token) authentication. Tokens are stored in localStorage and automatically attached to requests.

## 🗄️ Database

### Test Data
The database is pre-populated with sample data:
- **4 Sectors** (Oila qo'llab-quvvatlash, Sohta rang, Qayta ishlash, Agro totsir)
- **5 Organizations** (Hokimlik, Boshqarmalar)
- **5 Users** with different roles:
  - HOKIM (Governor)
  - HOKIMLIK_MASUL (Hokimlik Official)
  - TASHKILOT_RAHBAR (Organization Head)
  - TASHKILOT_MASUL (Organization Official)
  - IJROCHI (Executor)
- **5 Tasks** with various statuses

### Adding More Data
To add more test data, edit and run:
```bash
cd backend
python populate_data.py
```

## 🔐 Authentication

### Login Process
1. Navigate to `http://localhost:3000`
2. Enter login and password of test user
3. System generates JWT tokens
4. Tokens are stored in localStorage
5. Automatically attached to all API requests

### Test Credentials
Available test users:
- `admin / admin123` - Admin
- `hokim / hokim123` - Hokim
- `masul / masul123` - Hokimlik Mas'uli
- `rahbar / rahbar123` - Tashkilot Rahbari
- `tashkilot-masul / tash123` - Tashkilot Mas'uli

## 📱 Available Pages

### Dashboard
- **URL:** `http://localhost:3000/dashboard`
- **Description:** Main dashboard with statistics and overview

### Tasks
- **URL:** `http://localhost:3000/dashboard/tasks`
- **Description:** Task management and tracking

### Users
- **URL:** `http://localhost:3000/dashboard/users`
- **Description:** User management interface

### Organizations
- **URL:** `http://localhost:3000/dashboard/organizations`
- **Description:** Organization hierarchy and management

### Appeals
- **URL:** `http://localhost:3000/dashboard/appeals`
- **Description:** Appeals/complaints management

### Notifications
- **URL:** `http://localhost:3000/dashboard/notifications`
- **Description:** System notifications

### Analytics
- **URL:** `http://localhost:3000/dashboard/analytics`
- **Description:** Statistical reports and analytics

### Settings
- **URL:** `http://localhost:3000/dashboard/settings`
- **Description:** System settings and preferences

## 🛠️ Development

### Building for Production
```bash
npm run build
```

### Running Tests
```bash
# Backend
cd backend
python manage.py test

# Frontend
npm test
```

### File Structure
```
├── app/                      # Next.js app directory with pages
├── components/               # React components
│   ├── ui/                   # Radix UI components
│   ├── dashboard/            # Dashboard-specific components
│   └── layout/               # Layout components
├── lib/
│   ├── api.ts               # API client with JWT handling
│   ├── utils.ts             # Utility functions
│   └── mock-data.ts         # Mock data for development
├── backend/                  # Django backend
│   ├── users/               # User management app
│   ├── organizations/       # Organization management app
│   ├── tasks/               # Task management app
│   ├── notifications/       # Notifications app
│   ├── audit/               # Audit logging app
│   └── analytics/           # Analytics app
└── types/                    # TypeScript type definitions
```

## 📋 API Response Structure

All API responses follow this structure:

### Success Response (List)
```json
{
  "results": [
    { "id": 1, "name": "Item 1", ... },
    { "id": 2, "name": "Item 2", ... }
  ],
  "count": 2,
  "next": null,
  "previous": null
}
```

### Error Response
```json
{
  "detail": "Error message"
}
```

## 🐛 Troubleshooting

### API Connection Error
**Problem:** "Failed to fetch" error
**Solution:** 
1. Ensure backend is running on port 8000
2. Check `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`
3. Clear browser cache and refresh

### Port Already in Use
**Problem:** "Port 3000/8000 is already in use"
**Solution:**
```bash
# Kill process on port
lsof -ti:3000 | xargs kill -9

# Or use different port
python manage.py runserver 8002
npm run dev -- -p 3001
```

### Module Not Found Error
**Problem:** "Cannot resolve module"
**Solution:**
```bash
# Reinstall dependencies
npm install
# or
cd backend && pip install -r requirements.txt
```

### CORS Error
**Problem:** "Cross-Origin Request Blocked"
**Solution:** Django CORS is configured in `settings.py`. Ensure frontend URL is in `ALLOWED_HOSTS`.

## 📞 Support

For additional help:
1. Check the backend logs: `backend/logs/`
2. Check browser console (F12) for frontend errors
3. Review Django error messages in terminal

## 🔄 Next Steps

After verifying the system is running:
1. Test API endpoints with Postman/Insomnia
2. Explore dashboard features
3. Create new tasks and track them
4. Add more test data as needed
5. Customize styling and branding
6. Deploy to production server

---
**Last Updated:** January 23, 2026
**Version:** 1.0.0
