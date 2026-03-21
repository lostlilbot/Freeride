# Active Context: OpenClaw Nexus Agent App

## Current State

**Project Status**: ✅ Source code complete, APK build requires local environment

OpenClaw Nexus is a modular AI agent Android application built with Expo SDK 52. The app provides workspace-scoped file management, dynamic skill engine, and OpenRouter free-tier AI integration.

## Recently Completed

### Core Features
- [x] SPEC.md specification document
- [x] Expo SDK 52 project setup with dependencies
- [x] Domain models (Skill, Workspace, Agent, ChatMessage)
- [x] SkillEngine with dynamic .skill.json file management
- [x] OpenRouter Gateway with 429 fallback rotation (40% context, 30% tools, 20% recency, 10% speed)
- [x] StorageRepository with AsyncStorage persistence
- [x] NexusContext state management provider
- [x] Dashboard UI with Nexus Status, Workspace, Files
- [x] Chat interface with message history
- [x] Skills panel for skill management
- [x] Settings panel with File Lock toggle
- [x] Integrated README documentation

### Memory Engine (ADD-ON)
- [x] Long-term semantic memory with SQLite + vector embeddings
- [x] Knowledge Base table with cosine similarity retrieval
- [x] Self-correction system (triggers on "no", "wrong", "fix")
- [x] Lessons Learned storage and retrieval
- [x] Knowledge Injection system for system prompts
- [x] Autonomous research with confidence scoring (<0.7 triggers web search)
- [x] Memory Gauge UI showing learned facts count
- [x] Brain Dump view for editing/deleting lessons

## Project Structure

| Path | Purpose |
|------|---------|
| `nexus/App.tsx` | Main app with tab navigation |
| `nexus/src/domain/models.ts` | TypeScript interfaces |
| `nexus/src/data/skillEngine.ts` | Dynamic skill file management |
| `nexus/src/data/openRouterGateway.ts` | AI API with fallback logic |
| `nexus/src/data/storageRepository.ts` | AsyncStorage persistence |
| `nexus/src/data/memoryEngine.ts` | Vector memory with SQLite |
| `nexus/src/data/researchEngine.ts` | Autonomous web research |
| `nexus/src/presentation/NexusContext.tsx` | Global state provider |
| `nexus/src/presentation/components/` | UI components |
| `nexus/README.md` | Integrated user documentation |

## Memory Engine Details

### Vector Similarity
- 128-dimension embeddings using hash-based approach
- Cosine similarity for retrieval
- Top-3 relevant memories injected into context

### Correction Detection
Triggers: "no", "wrong", "incorrect", "not", "don't", "fix", "change", "update"

### Research Engine
- Confidence threshold: 0.7
- Below threshold triggers DuckDuckGo search
- Results stored in Knowledge Base

## Build Instructions

To build the APK locally:

```bash
cd nexus

# Install Android SDK, then:
export ANDROID_HOME=/path/to/android-sdk
export JAVA_HOME=/path/to/java-17

# Run prebuild and build:
bun run prebuild -- --platform android
cd android && ./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Session History

| Date | Changes |
|------|---------|
| 2026-03-21 | Created OpenClaw Nexus Android agent app |
| 2026-03-21 | Added Memory Engine with vector storage and autonomous research |
