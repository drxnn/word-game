CREATE TABLE IF NOT EXISTS word_pairs (
id UUID PRIMARY KEY,
category TEXT,
real_word TEXT,
imposter_word TEXT
);



DO $$ BEGIN
  CREATE TYPE game_status_enum AS ENUM ('IDLE','STARTED','VOTED', 'VOTING', 'GAME_OVER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;



CREATE TABLE IF NOT EXISTS lobbies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostName TEXT,
    code CHAR(6) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT now(),
    imposter_knows BOOLEAN DEFAULT false,
    voting_round INTEGER DEFAULT 0,
    word_pair_id UUID REFERENCES word_pairs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS games (
  game_status game_status_enum NOT NULL DEFAULT 'IDLE',
  lobby_id UUID PRIMARY KEY REFERENCES lobbies(id) ON DELETE CASCADE
);

-- add a websocket_token field,
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lobby_id UUID REFERENCES lobbies(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  is_imposter BOOLEAN DEFAULT false,
  is_host BOOLEAN,
  assigned_word TEXT,
  voted_out BOOLEAN DEFAULT false,
  UNIQUE (name, lobby_id)
  );





-- keep records if needed
CREATE TABLE IF NOT EXISTS votes (
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    lobby_id UUID REFERENCES lobbies(id) ON DELETE CASCADE,
    voted_for_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now(),
    voting_round INTEGER NOT NULL,
    PRIMARY KEY (player_id, lobby_id, voting_round)
);




CREATE TABLE IF NOT EXISTS used_words_per_lobby (
    lobby_id UUID REFERENCES lobbies(id) ON DELETE CASCADE,
    word_pair_id UUID REFERENCES word_pairs(id) ON DELETE CASCADE,
    PRIMARY KEY (lobby_id, word_pair_id)
);
