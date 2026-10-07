# Veya 

AI-powered mock interview assistant. Upload a resume, configure the interview by voice, answer questions, and receive a structured performance report.[Live Link](https://veya.web.app)

## Stack

- **Backend:** FastAPI, LangGraph, Groq (via LangChain), ChromaDB (RAG), faster-whisper (STT), edge-tts (TTS)
- **Frontend:** React + Vite + Tailwind

## Prerequisites

- Python 3.14+
- Node.js 18+
- [uv](https://github.com/astral-sh/uv) or pip
- `GROQ_API_KEY` from [Groq](https://console.groq.com/)

## Setup

```bash
# Backend
cp .env.example .env
# Edit .env and set GROQ_API_KEY

uv sync   # or: pip install -e .

# Frontend
cd frontend && npm install
```

## Run

```bash
# Terminal 1 — API (from repo root)
uvicorn app.main:app --reload --port 8000

# Terminal 2 — UI
cd frontend && npm run dev
```

Open http://localhost:5173. Say "I'd like an interview" to begin the voice onboarding flow.

## API

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `POST /voice/chat` | Voice onboarding entry |
| `POST /resume/upload` | Upload PDF resume (requires `session_id`) |
| `POST /interview/voice/start` | Start LangGraph interview |
| `POST /interview/voice/answer` | Submit voice answer |
| `GET /interview/report/{session_id}` | Fetch interview report |

## Architecture

```
Voice onboarding (/voice/*) → Resume RAG (/resume/*) → LangGraph interview loop
                                                              ↓
                    question → interrupt → evaluation → history → report
```

Interview state is persisted in SQLite via LangGraph's `SqliteSaver`. Resume chunks are stored in ChromaDB keyed by `session_id`.
## Screenshots
<img width="1428" height="689" alt="Screenshot 2026-06-22 at 1 57 06 PM" src="https://github.com/user-attachments/assets/d1fcd0ed-bff4-4e0c-b593-83d1f512d571" />
<img width="1361" height="637" alt="Screenshot 2026-06-22 at 1 57 20 PM" src="https://github.com/user-attachments/assets/4e75e47f-4ba8-4a7f-9a00-ea69be172015" />
<img width="1381" height="666" alt="Screenshot 2026-06-22 at 2 19 35 PM" src="https://github.com/user-attachments/assets/9eb5f926-96e3-43ff-9a98-3c5b64236108" />
<img width="1375" height="665" alt="Screenshot 2026-06-22 at 2 17 59 PM" src="https://github.com/user-attachments/assets/a66b5c93-80a6-4f76-b4d5-c9141072d8fa" />
<img width="1421" height="672" alt="Screenshot 2026-06-22 at 2 16 55 PM" src="https://github.com/user-attachments/assets/2262335a-450e-4690-b7bb-d742db644f28" />
<img width="1421" height="672" alt="Screenshot 2026-06-22 at 2 16 55 PM" src="https://github.com/user-attachments/assets/e920773b-1358-44bc-a4f0-a049284633c6" />

## Tests

```bash
pytest
```

## Configuration

All settings use the `VEYA_` prefix. See `.env.example` and `app/config.py`.
