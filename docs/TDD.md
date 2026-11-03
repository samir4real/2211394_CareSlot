# Technical Design Document (TDD): CareSlot

## 1. System Architecture
CareSlot utilizes a decoupled, modern web architecture to ensure scalability and clear separation of concerns. 
* **Frontend:** A Single Page Application (SPA) built with React and TypeScript, leveraging Vite for rapid development and optimized builds. It communicates with the backend exclusively via RESTful HTTP requests using standard JSON payloads.
* **Backend:** A robust API built with FastAPI (Python), chosen for its asynchronous capabilities, automatic interactive documentation (Swagger UI), and strict type validation via Pydantic.
* **Database:** SQLite will be used for the MVP phase to allow for rapid prototyping. For the Beta release, this will transition to a more robust SQL database (e.g., PostgreSQL) managed through an Object-Relational Mapper (ORM) like SQLAlchemy to prevent SQL injection and manage migrations safely.

## 2. Tech Stack
* **Frontend Languages/Frameworks:** React 18, TypeScript, Vite, TailwindCSS (for styling).
* **Backend Languages/Frameworks:** Python 3.10+, FastAPI, Uvicorn (ASGI server), Pydantic (data validation).
* **Security:** JWT (JSON Web Tokens) for stateless authentication, Passlib (bcrypt) for password hashing.

## 3. Project Structure
The repository is structured as a monorepo containing two distinct bases:
* `/frontend`: Contains `package.json`, `vite.config.ts`, and all React components within the `/src` directory.
* `/backend`: Contains `requirements.txt`, `main.py`, and will house API routers, database models, and Pydantic schemas.
* `/docs`: Contains project planning documentation (PRD, SRS, TDD).

## 4. Database Schema (Entities)
* **Users:** `id` (PK), `name`, `email` (Unique), `password_hash`, `role` (Enum: Patient, Receptionist, Doctor).
* **Appointments:** `id` (PK), `patient_id` (FK), `doctor_id` (FK), `date`, `time_slot`, `status` (Enum).
* **Prescriptions (Beta):** `id` (PK), `appointment_id` (FK), `diagnosis` (Text), `medications` (JSON), `issued_at` (Timestamp).

## 5. API Endpoints Design
* `POST /api/v1/auth/login` - Authenticate and return JWT with embedded scopes.
* `GET /api/v1/doctors` - Retrieve available doctors.
* `POST /api/v1/appointments` - Create a new appointment.
* `PATCH /api/v1/appointments/{id}/status` - Update appointment status (Requires `queue:manage` scope).
* `POST /api/v1/prescriptions` - Create a prescription (Requires `prescriptions:write` scope).

## 6. Deployment / Configuration
* **Frontend Hosting:** Deployed automatically via Vercel connecting directly to the GitHub repository's `/frontend` root directory.
* **Backend Hosting:** Will be containerized or deployed to a cloud PaaS (e.g., Render or Railway).
* **Configuration:** Sensitive variables (Database URLs, JWT Secret Keys) will be injected via `.env` files locally and environment variables in the production cloud environments.