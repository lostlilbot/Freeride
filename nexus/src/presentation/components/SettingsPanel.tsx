import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import { AppSettings } from '../../data/storageRepository';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  apiKeyCount: number;
  apiKeyPreview: string;
}

export function SettingsPanel({ settings, onUpdateSettings, apiKeyCount, apiKeyPreview }: SettingsPanelProps) {
  const [apiKeyInput, setApiKeyInput] = useState('');

  const handleAddApiKey = async () => {
    if (apiKeyInput.trim()) {
      // This would be handled by parent to update the gateway
      setApiKeyInput('');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>SETTINGS</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Configuration</Text>
        <View style={styles.apiKeyStatus}>
          <Text style={styles.label}>Active Keys:</Text>
          <Text style={styles.value}>{apiKeyCount}</Text>
        </View>
        <View style={styles.apiKeyStatus}>
          <Text style={styles.label}>Current Key:</Text>
          <Text style={styles.value}>{apiKeyPreview}</Text>
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            placeholder="Enter OpenRouter API Key..."
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddApiKey}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>File Lock</Text>
            <Text style={styles.settingDescription}>Only allow read within workspace</Text>
          </View>
          <Switch
            value={settings.fileLockEnabled}
            onValueChange={(value) => onUpdateSettings({ fileLockEnabled: value })}
            trackColor={{ false: colors.surfaceLight, true: colors.primary }}
            thumbColor={colors.textPrimary}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto-start Service</Text>
            <Text style={styles.settingDescription}>Start foreground service on boot</Text>
          </View>
          <Switch
            value={settings.autoStartService}
            onValueChange={(value) => onUpdateSettings({ autoStartService: value })}
            trackColor={{ false: colors.surfaceLight, true: colors.primary }}
            thumbColor={colors.textPrimary}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingDescription}>Show task notifications</Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(value) => onUpdateSettings({ notificationsEnabled: value })}
            trackColor={{ false: colors.surfaceLight, true: colors.primary }}
            thumbColor={colors.textPrimary}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Memory</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Max Memory</Text>
          <Text style={styles.value}>{settings.maxMemoryMB} MB</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  apiKeyStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  settingDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
