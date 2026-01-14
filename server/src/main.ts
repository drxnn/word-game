/*
On website entry, you have two buttons, create room or join room and also a faq button
---------------------------------------------------------------------------------------------------------------
create room: generates a room code for others to join, asks for your player name, game mode: imposter knows
they're imposter or they dont, can also choose imposter count(1,2 or 3 max depending on players count
---------------------------------------------------------------------------------------------------------------
join room: enter code to join the room, input your name, wait in lobby for everyone, leader of room chooses when to start game
---------------------------------------------------------------------------------------------------------------
function to choose imposter: when a game starts, there should be a randomized algorithm to choose an imposter
---------------------------------------------------------------------------------------------------------------
function to choose random word for everyone and a similar word for imposter(All words should be in doubles, real world that everyone gets and a similar word that the imposter gets)
---------------------------------------------------------------------------------------------------------------
once a game starts, each player that is connected to the room sees a "Hold to reveal word" card, and they all check the word they were assigned
---------------------------------------------------------------------------------------------------------------
the players then go in turn to say a word each that hints at the actual chosen word.
---------------------------------------------------------------------------------------------------------------
once everyone says a word, the players have an open discussion where they talk about who they think the imposter is, if they want to 
vote someone, anyone can click a button "Vote button" to vote someone out.
if someone gets voted out, a function checks if the imposter was voted, if yes end game, if no continue for another round etc
---------------------------------------------------------------------------------------------------------------
once a round ends, we go back to lobby where you can start another game. Make sure that the previous words are not used again. 

*/
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRouter from "./routes/index";
import { requestLogger } from "./middlewares/requestLogger";
import { errorHandler } from "./middlewares/errorHandler";
import { pool } from "./db";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// mount API
app.use("/api", apiRouter);

// global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Word-Imposter server listening on http://localhost:${PORT}/api`);
});
