# CRAG — Cognitive Resilience and Automated Governance  
### AI-Powered Third-Party Vendor Risk Monitoring System

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://github.com/ganeshkrishnareddy/CRAG)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)

**CRAG** is a sophisticated, real-time vendor risk monitoring prototype designed to automate the governance of third-party ecosystems. It leverages AI-simulated risk scoring, dynamic dashboards, and automated alert systems to provide continuous visibility into the cybersecurity posture of vendors.

---

## 🚀 Key Features

-   **Autonomous Risk Scoring**: dynamic scores (0–100) recalculated every 10 seconds using AI-simulated time-series models.
-   **Live Governance Dashboard**: Real-time KPI cards, risk distribution charts, and auto-refreshing vendor monitor.
-   **Automated Alerting**: Immediate notification system triggered when vendor risk crosses critical thresholds.
-   **Immutable Audit Trail**: Append-only governance ledger tracking every administrative and system event for compliance.
-   **Role-Based Access Control**: Secure login views for both Administrators and individual Vendors.

---

## 🧠 Risk Scoring Methodology

The CRAG engine calculates risk using a weighted dynamic model:
-   **Baseline Weight**: Derived from the vendor's **Criticality** (Mission-Critical vs. Low Business Impact) and **Category** (Finance/Cloud vs. Marketing).
-   **Vulnerability Factor**: Industry-specific risk coefficients are applied to the baseline.
-   **Dynamic Intelligence**: Recalculates every 10 seconds using a weighted random-walk with mean-reversion, simulating real-world security fluctuations and anomaly detection.
-   **Thresholding**: A score > 70 triggers a "High Risk" alert status automatically.

---

## 🏗️ Development Phases

| Phase | Status | Focus |
| :--- | :--- | :--- |
| **Phase 1: Prototype** | ✅ Current | Core engine, automated scoring, real-time dashboards, and local audit trails. |
| **Phase 2: MVP** | 🏗️ Planned | Multi-tenancy, external security API integrations, and advanced reporting. |
| **Phase 3: Enterprise**| 🔮 Future  | Blockchain-backed immutable auditing and predictive AI for proactive risk mitigation. |

---

## 💻 Technologies Used

-   **Frontend**: HTML5 (Semantic Structure), Vanilla CSS (Glassmorphism UI), JavaScript (ES6+ Logic), [Chart.js](https://www.chartjs.org/) (Data Visualization).
-   **Backend**: [Python 3.10+](https://www.python.org/), [FastAPI](https://fastapi.tiangolo.com/) (Asynchronous API), [SQLAlchemy](https://www.sqlalchemy.org/) (ORM).
-   **Database**: SQLite (Robust local storage).

---

## ⚙️ Installation & Running Locally

### 1. Prerequisites
Ensure you have Python 3.10 or higher installed.

### 2. Clone the Repository
```bash
git clone https://github.com/ganeshkrishnareddy/CRAG
cd CRAG
```

### 3. Setup the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r ../requirements.txt
python main.py
```
*The backend will start on `http://localhost:8000`.*

### 4. Run the Frontend
You can serve the `frontend` directory using any static server or simply open `frontend/index.html` in your browser. (Alternatively, the FastAPI backend is configured to serve static files from the `/frontend` directory).

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 📩 Contact & Developer

**P Ganesh Krishna Reddy**  
*Full-Stack Developer & Cybersecurity Researcher*

-   **Email**: [crag.monitor@gmail.com](mailto:crag.monitor@gmail.com)
-   **Portfolio**: [pganeshkrishnareddy.vercel.app](https://pganeshkrishnareddy.vercel.app/)
-   **LinkedIn**: [in/pganeshkrishnareddy](https://www.linkedin.com/in/pganeshkrishnareddy/)

---
*Built with ❤️ for AI-Powered Security Governance.*
