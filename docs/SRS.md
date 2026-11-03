# Software Requirements Specification (SRS): CareSlot

## 1. Introduction / Purpose
This document outlines the software requirements for the CareSlot application. Its purpose is to define the functional and non-functional requirements necessary to deliver a working clinical queue and prescription management system for both the MVP and Beta phases.

## 2. Scope
CareSlot is a web application that facilitates interactions between three distinct clinic roles. The system will handle authentication, appointment creation, queue state transitions, and medical record (prescription) storage.

## 3. Users and Roles
* **Patient:** Restricted access. Can only read and write their own data.
* **Receptionist:** Elevated access. Can read all appointments and manage queue states.
* **Doctor:** Highest access. Can read all patient histories and write official medical prescriptions.

## 4. Use Cases
* **UC-01 (Book Appointment):** A patient selects a doctor, date, and time slot, generating an appointment record.
* **UC-02 (Manage Queue):** A receptionist views the daily dashboard and transitions a patient from "Pending" to "Checked-In".
* **UC-03 (Issue Prescription):** A doctor selects a "Checked-In" patient, writes diagnosis notes and medications, and transitions the status to "Completed".

## 5. Functional Requirements

### MVP Release
* **REQ-MVP-01:** The system shall allow users to retrieve a list of available doctors via a REST API.
* **REQ-MVP-02:** The system shall allow the creation of an appointment record containing patient details and doctor ID.
* **REQ-MVP-03:** The system shall allow receptionists to update the status of an appointment.

### Beta Release
* **REQ-BETA-01:** The system shall require Email/Password authentication.
* **REQ-BETA-02:** The system shall enforce Role-Based Access Control (RBAC).
* **REQ-BETA-03:** The system shall allow doctors to create a prescription record linked to a specific appointment ID.

## 6. Acceptance Criteria
* The API must return a 401 Unauthorized error if a user accesses a protected route without a valid JWT token.
* The system must prevent double-booking of a doctor's specific time slot.
* The frontend must successfully route users to different dashboards based on their role upon login.

## 7. Non-Functional Requirements
* **Tech Stack:** React + TypeScript (Frontend), FastAPI + Python (Backend).
* **Performance:** API endpoints should respond in under 300ms locally.
* **Security:** Passwords must be hashed using bcrypt.