# OpenClaw Nexus - User Guide

## Overview

OpenClaw Nexus is a modular AI agent application for Android that operates within a user-scoped workspace. The agent uses dynamic skills and OpenRouter free-tier models to assist with tasks.

## Getting Started

### 1. Granting Workspace Access

OpenClaw Nexus uses Android's Storage Access Framework (SAF) to ensure secure, user-controlled file access.

**Steps to select your workspace:**
1. Open the Nexus app
2. Tap "Select Workspace" on the Dashboard
3. A file picker will appear - navigate to your desired folder
4. Tap "Open" to confirm selection
5. The app will create a `/skills` subdirectory for your skills

**Your workspace will contain:**
- `/skills/` - Dynamic skill files (`.skill.json`)
- Any files you want the agent to access

### 2. Activating Accessibility Support

For cross-app automation features, enable Accessibility Service:

**Steps:**
1. Go to Settings > Accessibility on your device
2. Find "OpenClaw Nexus" in the services list
3. Tap on it and toggle "On"
4. Confirm the permission dialog

**What this enables:**
- UI element detection for automation
- Screen content analysis
- Cross-app workflow assistance

> Note: Accessibility permission is optional. The core agent functions work without it.

### 3. Setting Up API Keys

The agent uses OpenRouter's free tier for AI responses.

**To add an API key:**
1. Go to Settings (gear icon)
2. Enter your OpenRouter API key in the input field
3. Tap "Add"

Get your free key at: https://openrouter.ai/settings

## Features

### Dynamic Skills

Skills are JSON files that define agent capabilities:

```json
{
  "name": "email_assistant",
  "trigger": "email",
  "logic_prompt": "You are an email assistant. Help draft and send emails.",
  "tools": ["read", "write", "search"],
  "enabled": true
}
```

**Creating a new skill:**
1. Go to the Skills tab
2. Tap "+ Add"
3. Fill in name, trigger keyword, logic prompt, and tools

### Model Ranking (Freeride Gateway)

When selecting models, the gateway ranks by:
- 40% - Context relevance
- 30% - Tools availability  
- 20% - Recency
- 10% - Speed

On 429 (rate limit) errors, the agent automatically rotates to the next best model.

### Foreground Service

For background task processing:
1. Enable "Auto-start Service" in Settings
2. A persistent notification will show when active
3. The agent continues processing even with screen off

## Security

### File Lock

Enable "File Lock" in Settings to restrict the agent to read-only mode outside the workspace directory. This prevents accidental modifications to system files.

## Troubleshooting

**No workspace selected:** Tap "Select Workspace" to choose a working directory

**API errors:** Check your OpenRouter key in Settings

**Skills not loading:** Ensure `.skill.json` files are in the `/skills` folder

## Technical Specifications

- Target: Android API 34+
- Framework: React Native / Expo
- Storage: User-scoped via SAF
- AI: OpenRouter Free Tier
