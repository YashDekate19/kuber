# Contributing to Kuber

Thank you for your interest in contributing to **Kuber**! We welcome bug reports, feature requests, documentation improvements, and pull requests.

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Node.js:** v18 or newer (v20+ recommended)
- **Python:** 3.10 or newer (3.12 recommended)
- **Supabase Account:** Free tier at [supabase.com](https://supabase.com)

### 2. Fork and Clone
```bash
git clone https://github.com/your-username/kuber.git
cd kuber
```

### 3. Environment Configuration
Copy the provided `.example` environment files:
```bash
# Frontend
cp frontend/.env.example frontend/.env.local

# Backend
cp backend/.env.example backend/.env
```
Fill in your Supabase project credentials.

### 4. Running the Project
#### Start Backend:
```bash
cd backend
python -m pip install -r requirements.txt
python run.py
```

#### Start Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing Guidelines
Always ensure backend unit tests pass before opening a PR:
```bash
# Windows PowerShell
$env:PYTHONPATH="backend"; python -m pytest backend/tests/test_api.py

# macOS/Linux
PYTHONPATH=backend pytest backend/tests/test_api.py
```

And ensure the frontend builds without TypeScript or bundling errors:
```bash
cd frontend
npm run build
```

---

## 📝 Pull Request Checklist
1. Create a feature branch (`git checkout -b feature/amazing-feature`).
2. Commit your changes (`git commit -m 'Add amazing feature'`).
3. Never commit `.env` or `.env.local` files containing production keys.
4. Ensure all CI tests pass.
5. Push to your branch and open a Pull Request.
