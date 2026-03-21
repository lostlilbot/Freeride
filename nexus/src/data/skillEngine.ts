import * as FileSystem from 'expo-file-system';
import { Skill, FileInfo } from '../domain/models';

const SKILLS_DIR = 'skills';
const DEFAULT_SKILL: Skill = {
  name: 'assistant',
  trigger: 'default',
  logic_prompt: 'You are OpenClaw Nexus, a helpful AI assistant. Respond to user queries concisely and helpfully.',
  tools: ['search', 'read', 'write'],
  enabled: true,
};

export class SkillEngine {
  private workspaceUri: string | null = null;
  private skills: Map<string, Skill> = new Map();

  setWorkspace(uri: string) {
    this.workspaceUri = uri;
  }

  getWorkspace(): string | null {
    return this.workspaceUri;
  }

  async loadSkills(): Promise<Skill[]> {
    if (!this.workspaceUri) return [DEFAULT_SKILL];

    try {
      const skillsDir = `${this.workspaceUri}/${SKILLS_DIR}`;
      const dirInfo = await FileSystem.getInfoAsync(skillsDir);

      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(skillsDir, { intermediates: true });
        const defaultSkillPath = `${skillsDir}/default.skill.json`;
        await FileSystem.writeAsStringAsync(defaultSkillPath, JSON.stringify(DEFAULT_SKILL, null, 2));
        return [DEFAULT_SKILL];
      }

      const files = await FileSystem.readDirectoryAsync(skillsDir);
      const skillFiles = files.filter((f: string) => f.endsWith('.json') || f.endsWith('.skill.json'));
      
      const loadedSkills: Skill[] = [DEFAULT_SKILL];

      for (const file of skillFiles) {
        try {
          const content = await FileSystem.readAsStringAsync(`${skillsDir}/${file}`);
          const skill = JSON.parse(content) as Skill;
          if (skill.name && skill.logic_prompt) {
            this.skills.set(skill.name, skill);
            loadedSkills.push(skill);
          }
        } catch (e) {
          console.warn(`Failed to load skill: ${file}`, e);
        }
      }

      return loadedSkills;
    } catch (error) {
      console.error('Error loading skills:', error);
      return [DEFAULT_SKILL];
    }
  }

  async saveSkill(skill: Skill): Promise<boolean> {
    if (!this.workspaceUri) return false;

    try {
      const skillsDir = `${this.workspaceUri}/${SKILLS_DIR}`;
      const dirInfo = await FileSystem.getInfoAsync(skillsDir);

      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(skillsDir, { intermediates: true });
      }

      const safeName = skill.name.toLowerCase().replace(/\s+/g, '_');
      const skillPath = `${skillsDir}/${safeName}.skill.json`;
      await FileSystem.writeAsStringAsync(skillPath, JSON.stringify(skill, null, 2));
      this.skills.set(skill.name, skill);
      return true;
    } catch (error) {
      console.error('Error saving skill:', error);
      return false;
    }
  }

  async deleteSkill(name: string): Promise<boolean> {
    if (!this.workspaceUri || name === 'assistant') return false;

    try {
      const safeName = name.toLowerCase().replace(/\s+/g, '_');
      const skillPath = `${this.workspaceUri}/${SKILLS_DIR}/${safeName}.skill.json`;
      await FileSystem.deleteAsync(skillPath);
      this.skills.delete(name);
      return true;
    } catch (error) {
      console.error('Error deleting skill:', error);
      return false;
    }
  }

  findSkillByTrigger(trigger: string): Skill | null {
    const lowerTrigger = trigger.toLowerCase();
    
    for (const [, skill] of this.skills) {
      if (skill.enabled && lowerTrigger.includes(skill.trigger.toLowerCase())) {
        return skill;
      }
    }
    
    return DEFAULT_SKILL;
  }

  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  async listWorkspaceFiles(): Promise<FileInfo[]> {
    if (!this.workspaceUri) return [];

    try {
      return await this.recursiveList(this.workspaceUri, '');
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  private async recursiveList(basePath: string, relativePath: string): Promise<FileInfo[]> {
    const fullPath = `${basePath}/${relativePath}`;
    const entries = await FileSystem.readDirectoryAsync(fullPath);
    const results: FileInfo[] = [];

    for (const entry of entries) {
      const entryPath = `${fullPath}/${entry}`;
      const info = await FileSystem.getInfoAsync(entryPath);
      
      results.push({
        name: entry,
        path: `${relativePath}/${entry}`.replace(/^\//, ''),
        isDirectory: info.isDirectory || false,
        size: 'size' in info ? info.size : 0,
        modifiedAt: 'modificationTime' in info && info.modificationTime 
          ? new Date(info.modificationTime * 1000).toISOString() 
          : new Date().toISOString(),
      });
    }

    return results.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }
}

export const skillEngine = new SkillEngine();
