import { open, QuickSQLiteConnection } from 'react-native-quick-sqlite';

export interface MemoryEntry {
  id?: number;
  content: string;
  embedding?: number[];
  type: 'user_correction' | 'final_output' | 'research' | 'lesson';
  timestamp: number;
  relevance_score?: number;
  source?: string;
}

export interface LessonLearned {
  id?: number;
  trigger: string;
  lesson: string;
  context: string;
  timestamp: number;
}

const DB_NAME = 'openclaw_memory.db';

class MemoryEngine {
  private db: QuickSQLiteConnection | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = open({ name: DB_NAME });
      
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS knowledge_base (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          embedding TEXT NOT NULL,
          type TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          relevance_score REAL DEFAULT 0,
          source TEXT
        )
      `);

      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS lessons_learned (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trigger TEXT NOT NULL,
          lesson TEXT NOT NULL,
          context TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        )
      `);

      await this.db.execute(`
        CREATE INDEX IF NOT EXISTS idx_kb_type ON knowledge_base(type)
      `);

      await this.db.execute(`
        CREATE INDEX IF NOT EXISTS idx_kb_timestamp ON knowledge_base(timestamp DESC)
      `);

      this.isInitialized = true;
      console.log('Memory Engine initialized');
    } catch (error) {
      console.error('Failed to initialize memory engine:', error);
    }
  }

  private generateSimpleEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(128).fill(0);
    
    words.forEach((word, idx) => {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i);
        hash = hash & hash;
      }
      
      const hash1 = Math.abs(hash % 128);
      const hash2 = Math.abs((hash >> 8) % 128);
      const hash3 = Math.abs((hash >> 16) % 128);
      
      embedding[hash1] += 1;
      embedding[hash2] += 0.5;
      embedding[hash3] += 0.25;
    });

    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return embedding.map(val => val / magnitude);
    }
    
    return embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  async storeMemory(entry: Omit<MemoryEntry, 'id'>): Promise<number> {
    if (!this.db) await this.initialize();

    const embedding = this.generateSimpleEmbedding(entry.content);
    const embeddingJson = JSON.stringify(embedding);

    const result = await this.db!.execute(
      `INSERT INTO knowledge_base (content, embedding, type, timestamp, relevance_score, source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [entry.content, embeddingJson, entry.type, entry.timestamp, entry.relevance_score || 0, entry.source || null]
    );

    return result.insertId || 0;
  }

  async retrieveRelevantContext(query: string, topK: number = 3): Promise<MemoryEntry[]> {
    if (!this.db) await this.initialize();

    const queryEmbedding = this.generateSimpleEmbedding(query);

    const allEntries = await this.db!.execute(
      `SELECT * FROM knowledge_base ORDER BY timestamp DESC LIMIT 100`
    );

    const entries: MemoryEntry[] = [];
    
    if (allEntries.rows && allEntries.rows.length > 0) {
      for (let i = 0; i < allEntries.rows.length; i++) {
        const row = allEntries.rows.item(i);
        const storedEmbedding = JSON.parse(row.embedding);
        const similarity = this.cosineSimilarity(queryEmbedding, storedEmbedding);
        
        entries.push({
          id: row.id,
          content: row.content,
          embedding: storedEmbedding,
          type: row.type,
          timestamp: row.timestamp,
          relevance_score: similarity,
          source: row.source,
        });
      }
    }

    return entries
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .slice(0, topK);
  }

  async storeLesson(lesson: Omit<LessonLearned, 'id'>): Promise<number> {
    if (!this.db) await this.initialize();

    const result = await this.db!.execute(
      `INSERT INTO lessons_learned (trigger, lesson, context, timestamp) VALUES (?, ?, ?, ?)`,
      [lesson.trigger, lesson.lesson, lesson.context, lesson.timestamp]
    );

    const embedding = this.generateSimpleEmbedding(lesson.lesson);
    await this.storeMemory({
      content: `[LESSON] ${lesson.lesson}`,
      embedding,
      type: 'lesson',
      timestamp: lesson.timestamp,
      relevance_score: 1,
      source: lesson.trigger,
    });

    return result.insertId || 0;
  }

  async getAllLessons(): Promise<LessonLearned[]> {
    if (!this.db) await this.initialize();

    const result = await this.db!.execute(
      `SELECT * FROM lessons_learned ORDER BY timestamp DESC`
    );

    const lessons: LessonLearned[] = [];
    if (result.rows && result.rows.length > 0) {
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        lessons.push({
          id: row.id,
          trigger: row.trigger,
          lesson: row.lesson,
          context: row.context,
          timestamp: row.timestamp,
        });
      }
    }

    return lessons;
  }

  async deleteLesson(id: number): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.execute(`DELETE FROM lessons_learned WHERE id = ?`, [id]);
  }

  async getMemoryCount(): Promise<{ total: number; lessons: number; corrections: number; research: number }> {
    if (!this.db) await this.initialize();

    const total = await this.db!.execute(`SELECT COUNT(*) as count FROM knowledge_base`);
    const lessons = await this.db!.execute(`SELECT COUNT(*) as count FROM knowledge_base WHERE type = 'lesson'`);
    const corrections = await this.db!.execute(`SELECT COUNT(*) as count FROM knowledge_base WHERE type = 'user_correction'`);
    const research = await this.db!.execute(`SELECT COUNT(*) as count FROM knowledge_base WHERE type = 'research'`);

    return {
      total: total.rows?.item(0)?.count || 0,
      lessons: lessons.rows?.item(0)?.count || 0,
      corrections: corrections.rows?.item(0)?.count || 0,
      research: research.rows?.item(0)?.count || 0,
    };
  }

  async generateKnowledgeInjection(): Promise<string> {
    const lessons = await this.getAllLessons();
    
    if (lessons.length === 0) {
      return '';
    }

    const injection = `\n\n=== KNOWLEDGE INJECTION (Lessons Learned) ===\n`;
    const lessonTexts = lessons.slice(0, 5).map(l => 
      `- ${l.trigger}: ${l.lesson}\n  Context: ${l.context.substring(0, 100)}...`
    ).join('\n');
    
    return `${injection}\n${lessonTexts}\n=== END KNOWLEDGE INJECTION ===\n`;
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.execute(`DELETE FROM knowledge_base`);
    await this.db!.execute(`DELETE FROM lessons_learned`);
  }
}

export const memoryEngine = new MemoryEngine();
