import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import http from "http";

import apiRouter from "./routes/index";
import { requestLogger } from "./middlewares/requestLogger";
import { errorHandler } from "./middlewares/errorHandler";

import rateLimit from "express-rate-limit";

if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
  console.error(
    `Missing required environment variable: JWT_SECRET | DATABASE_URL}`,
  );
  process.exit(1);
}

export const app = express();
app.set("trust proxy", 1);
app.use(
  cors({
    credentials: true,
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  }),
);
export const server = http.createServer(app);

import "./ws/ws.server";

app.use(express.json());

app.get("/ping", (req, res) => res.send("pong"));
app.use(requestLogger);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

app.use("/api", limiter);
app.use("/api", apiRouter);

app.use((request, response) => {
  response.status(404).send({ error: "unknown endpoint" });
});
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {});
