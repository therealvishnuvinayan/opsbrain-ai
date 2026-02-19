# OpsBrain AI

> Operational Intelligence Layer powered by Agentic AI  
> Reconciliation Autopilot + Investigation Engine

---

## 🚀 What is OpsBrain?

OpsBrain AI is an AI-powered operational intelligence system designed to monitor, investigate, and explain complex commerce and finance workflows.

It acts as a **system-level thinking layer** above operational data — identifying risks, mismatches, failures, and anomalies before they escalate.

---

## 🎯 Purpose

Modern digital commerce platforms generate operational complexity:

- Supplier reconciliation mismatches  
- Failed order lifecycles  
- Buffer inconsistencies  
- Expired or duplicated codes  
- Partial reconciliation states  
- Manual operational bottlenecks  

OpsBrain provides:

- Deep investigation workflows  
- Risk scoring and exposure analysis  
- Guided remediation suggestions  
- Operational observability  
- Agent-driven root cause analysis  

---

## 🧠 Core Capabilities

- Reconciliation Investigation Agent  
- Failure Classification Engine  
- Risk Indicator System  
- Event Timeline Visualization  
- Supplier Health Scoring  
- Exposure Estimation  
- Operational Insights Dashboard  

---

## 🏗 Tech Stack

### Frontend
- Next.js (Latest App Router)
- Tailwind CSS
- shadcn/ui
- Enterprise Glass Intelligence UI

### Backend
- FastAPI
- SQLModel
- PostgreSQL (NeonDB)
- Async architecture

### AI Layer
- Agent-based orchestration
- RAG (Retrieval Augmented Generation)
- Embeddings
- Context-driven reasoning

---

## 📊 Phase 1 Scope

- Ops Command Dashboard
- Reconciliation Process Explorer
- Investigation Center
- Risk Metrics & Indicators
- Seeded operational dataset

---

## 📂 Project Structure

opsbrain-ai/
│
├── frontend/ # Next.js application
├── backend/ # FastAPI service
│ ├── app/
│ │ ├── models/
│ │ ├── agents/
│ │ ├── services/
│ │ ├── api/
│ │ └── core/
│ └── main.py
│
├── docs/
└── README.md


---

## ⚙️ Local Setup

### Backend

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

```
### Frontend

cd frontend
npm install
npm run dev


### 🔐 Environment Variables

Create a `.env` file in the root directory and add:

```env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST/DB
OPENAI_API_KEY=your_openai_api_key
```

---

## 📈 Roadmap

### Phase 1 — Foundation
- Database modeling  
- Operational dashboard  
- Investigation workflows  
- Risk scoring engine  

### Phase 2 — Intelligence Layer
- Multi-agent orchestration  
- Background monitoring workers  
- Anomaly detection system  
- Automated remediation flows  

### Phase 3 — Enterprise & SaaS
- SaaS-ready architecture  
- Multi-tenant support  
- Enterprise data connectors  
- Advanced observability & tracing  

---

## 🏆 Why This Project Matters

OpsBrain AI demonstrates:

- Real-world operational AI use cases  
- Agent-driven system reasoning  
- Enterprise-grade architecture design  
- Scalable SaaS engineering principles  
- Full-stack AI integration  
