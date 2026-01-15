 CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lobby_id UUID REFERENCES lobbies(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  is_imposter BOOLEAN DEFAULT false,
  assigned_word TEXT
);


CREATE TABLE IF NOT EXISTS lobbies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT now(),
    imposter_knows BOOLEAN,
    voting_round INTEGER DEFAULT 0 
);

-- keep records if needed
CREATE TABLE IF NOT EXISTS votes (
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    lobby_id UUID REFERENCES lobbies(id) ON DELETE CASCADE,
    voted_for_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now(),
    voting_round INTEGER NOT NULL,
    PRIMARY KEY (player_id, voting_round)
);


CREATE TABLE word_pairs (
id UUID PRIMARY KEY,
category TEXT,
real_word TEXT,
imposter_word TEXT
);
