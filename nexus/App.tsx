import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Modal, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NexusProvider, useNexus } from './src/presentation/NexusContext';
import { StatusCard } from './src/presentation/components/StatusCard';
import { WorkspaceCard, FileList } from './src/presentation/components/WorkspaceCard';
import { ChatInterface } from './src/presentation/components/ChatInterface';
import { SettingsPanel } from './src/presentation/components/SettingsPanel';
import { SkillsPanel } from './src/presentation/components/SkillsPanel';
import { colors, spacing, borderRadius } from './src/presentation/theme';
import { openRouterGateway } from './src/data/openRouterGateway';

type TabType = 'dashboard' | 'chat' | 'skills' | 'settings' | 'docs';

function Dashboard() {
  const { state, pickWorkspace, refreshFiles } = useNexus();
  const { workspace, agent, skills, messages } = state;

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <StatusCard 
        status={agent.status} 
        activeSkill={agent.activeSkill} 
        memoryUsage={agent.memoryUsage} 
      />
      
      <WorkspaceCard
        workspacePath={workspace.path}
        fileCount={workspace.files.length}
        lastSync={workspace.lastSync}
        onSelectWorkspace={pickWorkspace}
      />

      {workspace.files.length > 0 && (
        <FileList files={workspace.files} />
      )}

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={refreshFiles}>
          <Text style={styles.actionButtonText}>🔄 Refresh Files</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📖 View README</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function ChatTab() {
  const { state, sendMessage } = useNexus();
  const isProcessing = state.agent.status === 'active';

  return (
    <ChatInterface
      messages={state.messages}
      onSendMessage={sendMessage}
      isProcessing={isProcessing}
    />
  );
}

function SkillsTab() {
  const { state, addSkill, setAgentStatus } = useNexus();
  const { skills, agent } = state;

  const handleSelectSkill = (name: string) => {
    setAgentStatus('idle');
    useNexus().state.agent.activeSkill;
  };

  return (
    <SkillsPanel
      skills={skills}
      activeSkill={agent.activeSkill}
      onSelectSkill={handleSelectSkill}
      onAddSkill={() => {}}
    />
  );
}

function SettingsTab() {
  const { state, updateSettings } = useNexus();
  const { settings } = state;
  
  const keyInfo = openRouterGateway.getActiveKeyInfo();

  return (
    <SettingsPanel
      settings={settings}
      onUpdateSettings={updateSettings}
      apiKeyCount={keyInfo.total}
      apiKeyPreview={keyInfo.keyPreview}
    />
  );
}

function DocsTab() {
  return (
    <View style={styles.docsContainer}>
      <Text style={styles.docsTitle}>DOCUMENTATION</Text>
      <ScrollView style={styles.docsContent}>
        <Text style={styles.docsSection}>Granting Workspace Access</Text>
        <Text style={styles.docsText}>
          1. Tap "Select Workspace" on Dashboard{'\n'}
          2. Choose a folder using the file picker{'\n'}
          3. The app will create /skills subdirectory
        </Text>
        
        <Text style={styles.docsSection}>Activating Accessibility</Text>
        <Text style={styles.docsText}>
          1. Settings → Accessibility{'\n'}
          2. Find "OpenClaw Nexus"{'\n'}
          3. Toggle to enable
        </Text>

        <Text style={styles.docsSection}>API Key Setup</Text>
        <Text style={styles.docsText}>
          Get your free key at openrouter.ai{'\n'}
          Add it in Settings → API Configuration
        </Text>

        <Text style={styles.docsSection}>Model Ranking</Text>
        <Text style={styles.docsText}>
          • 40% Context relevance{'\n'}
          • 30% Tools availability{'\n'}
          • 20% Recency{'\n'}
          • 10% Speed
        </Text>
      </ScrollView>
    </View>
  );
}

function MainContent() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { state } = useNexus();

  if (state.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing Nexus...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🐙 NEXUS</Text>
        <Text style={styles.tagline}>OpenClaw Agent</Text>
      </View>

      <View style={styles.tabContent}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'chat' && <ChatTab />}
        {activeTab === 'skills' && <SkillsTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'docs' && <DocsTab />}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('dashboard')}>
          <Text style={[styles.tabIcon, activeTab === 'dashboard' && styles.tabActive]}>📊</Text>
          <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.tabLabelActive]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('chat')}>
          <Text style={[styles.tabIcon, activeTab === 'chat' && styles.tabActive]}>💬</Text>
          <Text style={[styles.tabLabel, activeTab === 'chat' && styles.tabLabelActive]}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('skills')}>
          <Text style={[styles.tabIcon, activeTab === 'skills' && styles.tabActive]}>⚡</Text>
          <Text style={[styles.tabLabel, activeTab === 'skills' && styles.tabLabelActive]}>Skills</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('settings')}>
          <Text style={[styles.tabIcon, activeTab === 'settings' && styles.tabActive]}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('docs')}>
          <Text style={[styles.tabIcon, activeTab === 'docs' && styles.tabActive]}>📖</Text>
          <Text style={[styles.tabLabel, activeTab === 'docs' && styles.tabLabelActive]}>Docs</Text>
        </TouchableOpacity>
      </View>

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NexusProvider>
      <MainContent />
    </NexusProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  tabContent: {
    flex: 1,
    padding: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabActive: {
    opacity: 1,
  },
  tabLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  docsContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  docsTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  docsContent: {
    flex: 1,
  },
  docsSection: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  docsText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
});
