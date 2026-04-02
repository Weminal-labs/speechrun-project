import { DurableObject } from 'cloudflare:workers'

export type EmotionTag =
  | 'curious'
  | 'enthusiastic'
  | 'thoughtful'
  | 'matter-of-fact'
  | 'amused'
  | 'concerned'
  | 'impressed'

export interface DialogueTurn {
  turnOrder: number
  speaker: 'Nova' | 'Aero'
  text: string
  emotion: EmotionTag
  topicIndex: number
  audioUrl: string | null
}

export interface DialogueOutlineTopic {
  topicIndex: number
  title: string
  description: string
}

export class SpeechRunSession extends DurableObject<Env> {
  private sql: SqlStorage

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.sql = ctx.storage.sql
    this.initSchema()
  }

  private initSchema() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS context (
        id INTEGER PRIMARY KEY DEFAULT 1,
        json_data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS dialogue_outline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_index INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `)
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS dialogue_turns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        turn_order INTEGER NOT NULL,
        speaker TEXT NOT NULL,
        text TEXT NOT NULL,
        emotion TEXT NOT NULL,
        topic_index INTEGER NOT NULL,
        audio_url TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `)
  }

  // --- Session metadata ---

  async init(repoUrl: string): Promise<void> {
    this.sql.exec(`INSERT OR REPLACE INTO metadata (key, value) VALUES ('repo_url', ?1)`, repoUrl)
    this.sql.exec(`INSERT OR REPLACE INTO metadata (key, value) VALUES ('status', 'pending')`)
    this.sql.exec(`INSERT OR REPLACE INTO metadata (key, value) VALUES ('created_at', datetime('now'))`)
  }

  async setContext(jsonData: string): Promise<void> {
    this.sql.exec(`INSERT OR REPLACE INTO context (id, json_data) VALUES (1, ?1)`, jsonData)
    this.sql.exec(`INSERT OR REPLACE INTO metadata (key, value) VALUES ('status', 'complete')`)
  }

  async getContext(): Promise<object | null> {
    const rows = [...this.sql.exec(`SELECT json_data FROM context WHERE id = 1`)]
    if (rows.length === 0) return null
    return JSON.parse(rows[0].json_data as string)
  }

  async getStatus(): Promise<string> {
    const rows = [...this.sql.exec(`SELECT value FROM metadata WHERE key = 'status'`)]
    return rows.length > 0 ? (rows[0].value as string) : 'unknown'
  }

  async getRepoUrl(): Promise<string | null> {
    const rows = [...this.sql.exec(`SELECT value FROM metadata WHERE key = 'repo_url'`)]
    return rows.length > 0 ? (rows[0].value as string) : null
  }

  async setStatus(status: string): Promise<void> {
    this.sql.exec(`INSERT OR REPLACE INTO metadata (key, value) VALUES ('status', ?1)`, status)
  }

  // --- Dialogue outline ---

  async storeOutline(topics: DialogueOutlineTopic[]): Promise<void> {
    // Clear any existing outline
    this.sql.exec(`DELETE FROM dialogue_outline`)
    for (const topic of topics) {
      this.sql.exec(
        `INSERT INTO dialogue_outline (topic_index, title, description) VALUES (?1, ?2, ?3)`,
        topic.topicIndex, topic.title, topic.description,
      )
    }
  }

  async getOutline(): Promise<DialogueOutlineTopic[]> {
    const rows = [...this.sql.exec(`SELECT topic_index, title, description FROM dialogue_outline ORDER BY topic_index`)]
    return rows.map((r) => ({
      topicIndex: r.topic_index as number,
      title: r.title as string,
      description: r.description as string,
    }))
  }

  // --- Dialogue turns ---

  async storeTurn(turn: DialogueTurn): Promise<void> {
    this.sql.exec(
      `INSERT INTO dialogue_turns (turn_order, speaker, text, emotion, topic_index, audio_url) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      turn.turnOrder, turn.speaker, turn.text, turn.emotion, turn.topicIndex, turn.audioUrl,
    )
  }

  async getTurns(): Promise<DialogueTurn[]> {
    const rows = [...this.sql.exec(`SELECT turn_order, speaker, text, emotion, topic_index, audio_url FROM dialogue_turns ORDER BY turn_order`)]
    return rows.map((r) => ({
      turnOrder: r.turn_order as number,
      speaker: r.speaker as 'Nova' | 'Aero',
      text: r.text as string,
      emotion: r.emotion as EmotionTag,
      topicIndex: r.topic_index as number,
      audioUrl: (r.audio_url as string) ?? null,
    }))
  }

  async getLastTurns(count: number): Promise<DialogueTurn[]> {
    const rows = [...this.sql.exec(
      `SELECT turn_order, speaker, text, emotion, topic_index, audio_url FROM dialogue_turns ORDER BY turn_order DESC LIMIT ?1`,
      count,
    )]
    return rows.reverse().map((r) => ({
      turnOrder: r.turn_order as number,
      speaker: r.speaker as 'Nova' | 'Aero',
      text: r.text as string,
      emotion: r.emotion as EmotionTag,
      topicIndex: r.topic_index as number,
      audioUrl: (r.audio_url as string) ?? null,
    }))
  }

  async getTurnCount(): Promise<number> {
    const rows = [...this.sql.exec(`SELECT COUNT(*) as cnt FROM dialogue_turns`)]
    return (rows[0].cnt as number) ?? 0
  }
}
