# OpenClaw Mobile v3.5 - Nexus Prime

## Sovereign Agentic Node for Autonomous Mobile Workflows

---

## Overview

OpenClaw Nexus Prime is a **Sovereign Agentic Node** designed for P2P resource trade and autonomous mobile workflows. It operates as your personal AI agent on Android, capable of:

- **Offline Intent Parsing** - Local 2B-parameter model for basic operations
- **Dynamic Skill Loading** - JSON-based skills for specialized tasks
- **Semantic Memory** - Vector-based learning from corrections
- **Multi-Model Orchestration** - Parallel execution across free AI models
- **MCP Protocol** - Model Context Protocol for P2P tool trading

---

## Quick Start

### 1. Install APK
Download and install `openclaw-nexus.apk` on your Android device (API 34+).

### 2. Setup OpenRouter Key
1. Go to **Settings** → **API Configuration**
2. Enter your OpenRouter API key
3. Get free keys at: https://openrouter.ai/settings

### 3. Grant Workspace Access
1. Tap **Select Workspace** on Dashboard
2. Choose a folder (recommended: `/Documents/OpenClaw/`)
3. The app creates `/skills/` subdirectory automatically

### 4. Enable Accessibility Service (Optional)
For UI-aware automation:
1. Settings → Accessibility → OpenClaw Nexus
2. Toggle to enable
3. Allows cross-app workflow assistance

---

## The FreeRide Protocol

### $0-Cost Failover Logic

Nexus Prime uses **smart model ranking** to maximize free tier usage:

| Weight | Factor | Description |
|--------|--------|-------------|
| 40% | Context | Model relevance to task |
| 30% | Tools | Available tool count |
| 20% | Recency | Last usage timestamp |
| 10% | Speed | Latency performance |

### Model Ranking Process

1. Query triggers model selection
2. Each model scored by weights above
3. **On 429 (rate limit)**: Auto-rotate to next best model
4. Backup keys rotate automatically on exhaustion

### Interpreting Model Ranks

- **Rank 1**: Best context match - use for complex reasoning
- **Rank 2**: Good tools - use for multi-step tasks
- **Rank 3**: Fastest - use for simple queries

---

## The Mercenary Layer

### P2P Resource Monitoring

The Mercenary Layer tracks resource swaps and deals:

1. **Live Log Access**: Settings → View Logs
2. **Resource Swap Headers**: MCP barter exchanges
3. **Deal History**: Saved in `/workspace/lessons/`

### Resource Swap Format

```
=== RESOURCE SWAP ===
Offer: read_file(path)
Request: web_search(query)
Value: 1 token credit
=== END SWAP ===
```

### Monitoring Active Deals

- **Dashboard**: Shows active MCP connections
- **Status Bar**: Parallel task indicators
- **Memory Gauge**: Learned facts count

---

## Features Reference

### Dashboard
- Nexus Status (Idle/Active/Error)
- System Status (Network/Battery/MCP)
- Memory Gauge (Learned facts)
- Workspace Files browser

### Chat
- Direct AI communication
- Context-aware responses
- Correction triggers learning

### Skills
- Dynamic `.skill.json` files
- Trigger-based activation
- Tool array configuration

### Settings
- File Lock (read-only outside workspace)
- Auto-start Service
- Notifications
- API Key management
- Memory Clear

---

## Memory Engine

### Self-Correction Triggers
When you correct the agent, it learns:
- "no", "wrong", "incorrect"
- "not", "don't", "fix"
- "change", "update", "revise"

### Knowledge Injection
Past lessons are prepended to system prompts automatically.

### Brain Dump
View and edit learned lessons in Dashboard → Memory Gauge → Brain Dump

---

## Technical Specifications

| Component | Specification |
|-----------|---------------|
| Target API | Android 34+ |
| Framework | React Native / Expo |
| Storage | Scoped (SAF) |
| AI | OpenRouter Free Tier |
| Memory | SQLite + Vector Embeddings |
| Protocol | MCP (JSON-RPC 2.0) |

---

## Power Modes

| Mode | Battery | Capabilities |
|------|---------|--------------|
| Normal | >50% | Full AI, background sync |
| Low Power | 15-50% | Single request, no background |
| Critical | <15% | Read-only, minimal AI |

---

## Troubleshooting

### No API Key
Get free key at https://openrouter.ai/settings

### Offline Mode
Network disconnected - uses local intent parsing only

### Memory Full
Go to Settings → Clear Memory

### Skills Not Loading
Ensure `.skill.json` files in `/workspace/skills/`

---

## License

Open Source - MIT License
