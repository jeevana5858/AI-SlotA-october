# EcoSort AI — Smart Waste Segregation and Recycling Optimization System

A full-stack, responsive web application for AI-powered waste detection, smart bin segregation, recycling rewards, eco impact analytics, pickup scheduling, recycling centre mapping, and administrative reporting.

## Technology Stack

- **Frontend:** React.js 18, Tailwind CSS, Chart.js 4, Leaflet (OpenStreetMap), TensorFlow.js MobileNetV2 (`@tensorflow-models/mobilenet` v2)
- **Backend:** Python Flask REST API (`backend/app.py`)
- **Database:** SQLite (`backend/data/ecosort.db` — zero-config relational storage with normalized tables; configurable via environment variables)
- **Authentication:** JWT-based role-separated authentication (User & Admin portals), PBKDF2 password hashing, password strength validation, token revocation on logout, forgot/reset password flow
- **Reports:** Real PDF (`reportlab`) and Excel `.xlsx` (`openpyxl`) exports

## Running the Application

1. Install dependencies (if not already installed):
   ```powershell
   pip install -r requirements.txt
   ```
2. Start the Flask server (serves both the REST API and React frontend):
   ```powershell
   python backend/app.py
   ```
3. Open your browser to `http://localhost:5000`.

## Demo Credentials (Clearly Labelled in Login UI)

- **User Account:** `alex@ecosort.ai` / `EcoUser@123`
- **Admin Account:** `admin@ecosort.ai` / `Admin@123`

## AI Classification & Demo Mode

- **Live AI Mode:** Uses MobileNetV2 (`version: 2, alpha: 1.0`) via TensorFlow.js in the browser (and optional server-side TensorFlow Keras MobileNetV2 if installed) to classify uploaded or webcam-captured images into **Wet Waste**, **Dry Waste**, or **Metal Waste** with confidence scores and disposal instructions.
- **Demo Mode:** If the MobileNetV2 model is unavailable (for example, offline or blocked CDN), the system never fabricates AI predictions—it clearly displays a **Demo Mode** banner and allows testing with clearly labelled demo sample items.

