from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.db import init_db
from app.routes import briefings, chat, datasets
from app.routes import auth as auth_routes

app = FastAPI(title="OpsAI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(auth_routes.router)
app.include_router(datasets.router)
app.include_router(briefings.router)
app.include_router(chat.router)


@app.get("/health")
def health():
    return {"ok": True}
