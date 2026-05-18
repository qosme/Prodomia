# Prodomia

Sistema de gestión para condominios. Permite a residentes registrarse, enviar reclamos con fotos y hacer seguimiento de su estado. Los administradores aprueban residentes, asignan reclamos al personal de mantenimiento y gestionan cuotas, pagos y anuncios. El personal ve sus reclamos asignados y actualiza su estado. Los conserjes registran y gestionan los pedidos recibidos en portería.

## Ejecución local

### Backend (API REST con Django)

- Copiar el entorno:
  - `backend/.env.example` -> `backend/.env`
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

Documentación API REST (Swagger): `http://localhost:8000/api/schema/swagger/`

### Base de datos (Postgres)

En `backend/.env`, configurar `DATABASE_URL` según la opción elegida:

**Supabase:**
- Crear un proyecto en [supabase.com](https://supabase.com)
- Ir a **Settings -> Database -> Connection string** y copiar la URI
- Pegarla en `DATABASE_URL` del `.env`

- Si esto no funciona, ir a Connect -> Direct -> Session Pooler y copiar la URI (agregando la contraseña de la Base de Datos)
- Pegarla en `DATABASE_URL` del `.env`

**Postgres local:**
- Instalar Postgres y crear una base de datos
- Configurar `DATABASE_URL=postgres://usuario:contraseña@localhost:5432/nombre_db`

### Frontend (React + Vite)

Desde la raíz del repositorio:

- Copiar el entorno:
  - `frontend/.env.example` -> `frontend/.env`
- Instalar dependencias y ejecutar:
  - `cd frontend`
  - `npm install`
  - `npm run dev`

Frontend: `http://localhost:5173`

## Flujo de primer uso

- Registrarse como residente en la UI (`/register`)
- Iniciar sesión en el admin de Django en `http://localhost:8000/admin/` como superusuario
  - Aprobar residentes desde la página de **Aprobaciones** en la UI de React luego de iniciar sesión como administrador (staff/superusuario)
  - Crear usuarios staff con el endpoint `POST /api/users/create_staff/`
  - Crear usuarios conserje con el endpoint `POST /api/users/create_concierge/`
- Como residente aprobado: enviar un reclamo
- Como administrador: asignar el reclamo a un usuario del staff
- Como staff: abrir el reclamo y actualizar el estado
- Como conserje: registrar y gestionar pedidos recibidos en portería
