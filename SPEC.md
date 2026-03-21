# OpenClaw Nexus - Specification Document

## 1. Project Overview

**Project Name:** OpenClaw Nexus  
**Type:** Android Agent Application (APK)  
**Core Functionality:** A modular AI agent that operates within a user-scoped workspace, using dynamic skills and OpenRouter free-tier models to assist with cross-app automation tasks.

---

## 2. Technology Stack & Choices

| Component | Choice |
|-----------|--------|
| Framework | Expo SDK 53 with prebuild for native modules |
| Language | TypeScript |
| State Management | React Context + AsyncStorage |
| Local Storage | expo-file-system, AsyncStorage |
| Document Picker | expo-document-picker (SAF) |
| HTTP Client | fetch (native) |
| AI Gateway | OpenRouter API (free tier) |
| Target API | Android API 34 |

### Architecture Pattern
- **Clean Architecture** with separation:
  - `presentation/` - UI components and screens
  - `domain/` - Business logic, skill engine, models
  - `data/` - Repository layer, file operations, API clients

---

## 3. Feature List

### Core Features
1. **Scoped Workspace** - User selects working directory via Storage Access Framework
2. **Dynamic Skill Engine** - Load/execute JSON skill files from workspace
3. **OpenRouter Gateway** - Smart model selection with 429 fallback rotation
4. **Foreground Service** - Persistent notification for background tasks
5. **Accessibility Service** - UI element detection for cross-app assistance

### Skill System
- Skills stored as `.skill.json` files in workspace
- Structure: `{ name, trigger, logic_prompt, tools }`
- Hot-reload capability when workspace changes

### Model Ranking (Freeride Gateway)
- 40% Context relevance
- 30% Tools availability
- 20% Recency (newer models)
- 10% Speed (latency)

### Dashboard
- Nexus Status (Active/Idle/Error)
- Active Skill display
- Memory Usage indicator
- Quick action buttons

---

## 4. UI/UX Design Direction

### Visual Style
- **Modern Dark Theme** - Dark navy (#0a1628) background
- **Accent Colors** - Cyan (#00d4ff) for active states, amber (#ffb800) for warnings
- **Card-based Layout** - Rounded containers with subtle shadows

### Color Scheme
- Primary: #00d4ff (Cyan)
- Secondary: #6366f1 (Indigo)
- Background: #0a1628 (Dark Navy)
- Surface: #1a2744 (Card)
- Text Primary: #ffffff
- Text Secondary: #94a3b8
- Success: #10b981
- Warning: #ffb800
- Error: #ef4444

### Layout
- Single-screen dashboard with scrollable sections
- Bottom action bar for quick commands
- Modal sheets for settings and documentation
- Status indicators with animated pulses

---

## 5. Data Models

### Skill Schema
```typescript
interface Skill {
  name: string;
  trigger: string;
  logic_prompt: string;
  tools: string[];
  enabled: boolean;
}
```

### Workspace State
```typescript
interface WorkspaceState {
  uri: string | null;
  path: string;
  files: FileInfo[];
  lastSync: Date;
}
```

### Agent State
```typescript
interface AgentState {
  status: 'idle' | 'active' | 'error';
  activeSkill: string | null;
  memoryUsage: number;
  currentTask: string | null;
}
```

---

## 6. API Integration

### OpenRouter Endpoints
- Base URL: `https://openrouter.ai/api/v1`
- Free models prioritized: `google/gemini-2.0-flash-exp-free`
- Fallback chain on 429: Try next model in ranked list
- Max tokens: 4096
- Temperature: 0.7
