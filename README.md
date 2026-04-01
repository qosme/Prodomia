# Condo Complaint System (Django + React + Postgres)

Residents can register, get **approved by a manager**, submit complaints with photos, comment, and track status. Managers can approve residents, assign complaints to maintenance staff, and update statuses. Maintenance staff can see assigned complaints and update their status.

## Local run

### Backend (Django REST API)

From repo root:

As it's using Docker:
- clone repository and check that docker is running
- docker-compose up --build -d
- check that containers are running with 'docker ps' in terminal
Apply migrations and create superuser:
- docker-compose exec web python manage.py migrate
- docker-compose exec web python manage.py createsuperuser (admin)

Without Docker:
- Copy env:
  - `backend/.env.example` → `backend/.env`
- Install deps:
  - `cd backend`
  - `python -m pip install -r requirements.txt`
- Migrate + create admin:
  - `python manage.py makemigrations`
  - `python manage.py migrate`
  - `python manage.py createsuperuser`
- Run:
  - `python manage.py runserver`

API base URL: `http://localhost:8000/api`

### Database (Postgres, optional)

If you have Docker running:

- `docker compose up -d`
- In `backend/.env`, set `DATABASE_URL=postgres://condo:condo@localhost:5432/condo`
- Then rerun migrations.

If Docker is not running, backend will default to SQLite.

### Frontend (React + Vite)

From repo root:

- Copy env:
  - `frontend/.env.example` → `frontend/.env`
- Install deps + run:
  - `cd frontend`
  - `npm install`
  - `npm run dev`

Frontend: `http://localhost:5173`

## First-use flow

- Register as resident in the UI (`/register`)
- Log into Django admin at `http://localhost:8000/admin/` as the superuser
  - Approve residents via the **Approvals** page in the React UI after logging in as a manager user (staff/superuser)
  - You can also create staff users and then call manager endpoint `POST /api/users/:id/make_staff/`
- As an approved resident: submit a complaint
- As manager: assign complaint to a staff user
- As staff: open the complaint and update status
