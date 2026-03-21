import { openRouterGateway, CompletionRequest, CompletionResponse } from './openRouterGateway';
import { ChatMessage } from '../domain/models';

export interface OrchestratedTask {
  id: string;
  subtask: string;
  modelId: string;
  promise: Promise<CompletionResponse>;
  startTime: number;
}

export interface OrchestrationResult {
  taskId: string;
  results: CompletionResponse[];
  totalTime: number;
  errors: string[];
}

export interface ModelRanking {
  id: string;
  name: string;
  score: number;
}

export class ParallelOrchestrator {
  private maxConcurrent = 3;
  private timeoutMs = 30000;

  async executeComplexTask(
    task: string,
    subtasks: string[],
    skill?: string
  ): Promise<OrchestrationResult> {
    const taskId = `task_${Date.now()}`;
    const startTime = Date.now();
    const results: CompletionResponse[] = [];
    const errors: string[] = [];

    console.log(`[Orchestrator] Starting parallel execution for task ${taskId}`);
    console.log(`[Orchestrator] Splitting into ${subtasks.length} subtasks`);

    const models = openRouterGateway.getModels().slice(0, this.maxConcurrent);
    const promises: Promise<any>[] = [];

    for (let i = 0; i < Math.min(subtasks.length, this.maxConcurrent); i++) {
      const subtask = subtasks[i];
      const model = models[i % models.length];

      const promise = this.executeSubtask(subtask, model.id, skill)
        .then(result => {
          results.push(result);
          console.log(`[Orchestrator] Subtask ${i + 1} completed with model ${model.id}`);
        })
        .catch(error => {
          errors.push(`Subtask ${i + 1} failed: ${error.message}`);
          console.error(`[Orchestrator] Subtask ${i + 1} error:`, error);
        });

      promises.push(promise);
    }

    try {
      await Promise.race([
        Promise.allSettled(promises),
        this.createTimeout(this.timeoutMs),
      ]);
    } catch (error: any) {
      if (error.message === 'Timeout') {
        errors.push(`Orchestration timeout after ${this.timeoutMs}ms`);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Orchestrator] Task ${taskId} completed in ${totalTime}ms`);

    return {
      taskId,
      results,
      totalTime,
      errors,
    };
  }

  private async executeSubtask(
    subtask: string,
    modelId: string,
    skill?: string
  ): Promise<CompletionResponse> {
    const request: CompletionRequest = {
      messages: [
        {
          id: 'subtask',
          role: 'user',
          content: subtask,
          timestamp: new Date(),
        },
      ],
      skill,
      maxTokens: 2048,
      temperature: 0.7,
    };

    return openRouterGateway.complete(request);
  }

  private createTimeout(ms: number): Promise<void> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), ms);
    });
  }

  rankModelsForTask(task: string): ModelRanking[] {
    const models = openRouterGateway.getModels();
    const taskKeywords = task.toLowerCase().split(/\s+/);

    return models
      .map(model => {
        let score = 0;

        const nameMatch = taskKeywords.filter(kw =>
          model.name.toLowerCase().includes(kw)
        ).length;
        score += nameMatch * 30;

        score += (model.tools / 20) * 25;
        score += (model.speed / 100) * 25;
        score += (model.context / 1000000) * 20;

        return {
          id: model.id,
          name: model.name,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  splitTaskIntoSubtasks(task: string, numSubtasks: number = 3): string[] {
    const sentences = task.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= numSubtasks) {
      return sentences.map(s => s.trim());
    }

    const words = task.split(/\s+/);
    const wordsPerSubtask = Math.ceil(words.length / numSubtasks);
    const subtasks: string[] = [];

    for (let i = 0; i < numSubtasks; i++) {
      const start = i * wordsPerSubtask;
      const end = start + wordsPerSubtask;
      subtasks.push(words.slice(start, end).join(' '));
    }

    return subtasks;
  }

  aggregateResults(results: CompletionResponse[]): string {
    if (results.length === 0) {
      return 'No results to aggregate.';
    }

    if (results.length === 1) {
      return results[0].content;
    }

    const header = `=== PARALLEL EXECUTION RESULTS (${results.length} sources) ===\n\n`;
    const content = results
      .map((r, i) => `[Source ${i + 1} - ${r.model}]\n${r.content}`)
      .join('\n\n---\n\n');

    const footer = `\n\n=== END RESULTS ===`;

    return header + content + footer;
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.min(Math.max(1, max), 5);
  }

  setTimeout(ms: number): void {
    this.timeoutMs = Math.max(5000, ms);
  }
}

export const parallelOrchestrator = new ParallelOrchestrator();
