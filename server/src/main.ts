import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import http from "http";
import session from "express-session";
import pgSimple from "connect-pg-simple";

import apiRouter from "./routes/index";
import { requestLogger } from "./middlewares/requestLogger";
import { errorHandler } from "./middlewares/errorHandler";
import { pool } from "./db/index";

export const app = express();
export const server = http.createServer(app);
import "./ws/ws.server";

const pgStore = pgSimple(session);

export const sessionStore = new pgStore({
  pool: pool,
  tableName: "sessions",
  ttl: 10800,
});
app.use(
  session({
    store: sessionStore,

    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 3,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
);
app.use(
  cors({
    credentials: true,
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  }),
);
app.use(express.json());

app.get("/ping", (req, res) => res.send("pong"));
app.use(requestLogger);

app.use("/api", apiRouter);

app.use((request, response) => {
  response.status(404).send({ error: "unknown endpoint" });
});
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {});
