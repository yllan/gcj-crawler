CREATE TABLE IF NOT EXISTS scores(
  id INTEGER PRIMARY KEY,
  rank INTEGER,
  contest_id TEXT,
  competitor_id TEXT,
  score INTEGER,
  raw TEXT,
  FOREIGN KEY(contest_id) REFERENCES contests(id),
  FOREIGN KEY(competitor_id) REFERENCES competitors(id),
  UNIQUE(contest_id, competitor_id)
);

CREATE TABLE IF NOT EXISTS contests(
  id TEXT PRIMARY KEY,
  title TEXT,
  raw TEXT
);

CREATE TABLE IF NOT EXISTS tasks(
  id TEXT PRIMARY KEY,
  contest_id TEXT,
  title TEXT,
  num_attempted INTEGER,
  raw TEXT,
  FOREIGN KEY(contest_id) REFERENCES contests(id)
);

CREATE TABLE IF NOT EXISTS competitors(
  id TEXT PRIMARY KEY,
  displayname TEXT,
  country TEXT,
  raw TEXT
);

CREATE TABLE IF NOT EXISTS attempts(
  id TEXT PRIMARY KEY,
  score_id INTEGER,
  task_id TEXT,
  lang TEXT,
  timestamp_ms TEXT,
  url TEXT,
  content TEXT,
  raw TEXT,
  FOREIGN KEY(score_id) REFERENCES scores(id)
);