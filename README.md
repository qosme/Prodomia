# Sistema de Reclamos de Condominio (Django + React + Postgres)

Los residentes pueden registrarse, ser **aprobados por un administrador**, enviar reclamos con fotos, comentar y hacer seguimiento del estado. Los administradores pueden aprobar residentes, asignar reclamos al personal de mantenimiento y actualizar estados. El personal de mantenimiento puede ver los reclamos asignados y actualizar su estado.

## Ejecución local

### Backend (API REST con Django)

Desde la raíz del repositorio:

Con Docker:
- Clonar el repositorio y verificar que Docker esté corriendo
- `docker-compose up --build -d`
- Verificar que los contenedores estén corriendo con `docker ps` en la terminal
Aplicar migraciones y crear superusuario:
- `docker-compose exec web python manage.py migrate`
- `docker-compose exec web python manage.py createsuperuser` (admin)

Sin Docker:
- Copiar el entorno:
  - `backend/.env.example` → `backend/.env`
- Instalar dependencias:
  - `cd backend`
  - `python -m pip install -r requirements.txt`
- Migrar + crear admin:
  - `python manage.py makemigrations`
  - `python manage.py migrate`
  - `python manage.py createsuperuser`
- Ejecutar:
  - `python manage.py runserver`

URL base de la API: `http://localhost:8000/api`

### Base de datos (Postgres, opcional)

Si tienes Docker corriendo:

- `docker compose up -d`
- En `backend/.env`, configurar `DATABASE_URL=postgres://condo:condo@localhost:5432/condo`
- Luego volver a ejecutar las migraciones.

Si Docker no está corriendo, el backend usará SQLite por defecto.

### Frontend (React + Vite)

Desde la raíz del repositorio:

- Copiar el entorno:
  - `frontend/.env.example` → `frontend/.env`
- Instalar dependencias y ejecutar:
  - `cd frontend`
  - `npm install`
  - `npm run dev`

Frontend: `http://localhost:5173`

## Flujo de primer uso

- Registrarse como residente en la UI (`/register`)
- Iniciar sesión en el admin de Django en `http://localhost:8000/admin/` como superusuario
  - Aprobar residentes desde la página de **Aprobaciones** en la UI de React luego de iniciar sesión como administrador (staff/superusuario)
  - También puedes crear usuarios staff y luego llamar al endpoint de administrador `POST /api/users/:id/make_staff/`
- Como residente aprobado: enviar un reclamo
- Como administrador: asignar el reclamo a un usuario del staff
- Como staff: abrir el reclamo y actualizar el estado
