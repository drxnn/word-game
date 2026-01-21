import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import http from "http";

import apiRouter from "./routes/index";
import { requestLogger } from "./middlewares/requestLogger";
import { errorHandler } from "./middlewares/errorHandler";
import { pool } from "./db";

const app = express();
export const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.get("/ping", (req, res) => res.send("pong"));
app.use(requestLogger);

app.use("/api", apiRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Word-Imposter server listening on http://localhost:${PORT}/api`);
});
