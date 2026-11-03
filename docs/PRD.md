# Product Requirements Document (PRD): CareSlot

## 1. Project Overview
CareSlot is a web-based clinic workflow application designed to streamline patient appointments, front-desk queue management, and digital prescriptions. 

## 2. Goals
* Provide a seamless, self-service booking experience for patients.
* Reduce front-desk administrative bottlenecks for clinic receptionists.
* Digitize prescription records for easier retrieval and historical tracking by doctors.

## 3. Scope
* **In-Scope:** Patient appointment booking, queue status tracking, secure role-based access, and digital prescription generation.
* **Out-of-Scope:** Online payment gateways, video/telehealth consultations, and pharmacy inventory management.

## 4. Target Audience
* **Patients:** Individuals needing to book consultation slots without calling the clinic.
* **Receptionists:** Administrative staff managing walk-ins and the daily live queue.
* **Doctors:** Medical professionals reviewing patient history and issuing prescriptions.

## 5. User Stories
* **As a Patient,** I want to view available time slots so that I can book an appointment that fits my schedule.
* **As a Receptionist,** I want to update an appointment status to "Checked-In" so that the doctor knows the patient has arrived.
* **As a Doctor,** I want to attach a digital prescription to a completed appointment so that the patient can access it online.

## 6. Release Plan (Features)

### MVP Release (Mid-Term Demo)
* **Appointment Booking:** Patients view available slots and create an appointment.
* **Queue Management:** Receptionists view daily appointments and update statuses.
* **Basic Profiles:** Hardcoded doctor profiles to facilitate booking.

### Beta Release (Final Demo)
* **Authentication & RBAC:** Secure JWT login with distinct roles (Patient, Receptionist, Doctor).
* **Security Scopes:** FastAPI dependency injection to restrict endpoint access.
* **Digital Prescriptions:** Doctors attach medications and diagnosis notes to visits.

## 7. Success Metrics
* 100% of appointments successfully generate a unique queue token.
* Role-based access successfully blocks unauthorized views (e.g., patients cannot view other patients' records).