import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import { Skill } from '../../domain/models';

interface SkillsPanelProps {
  skills: Skill[];
  activeSkill: string | null;
  onSelectSkill: (name: string) => void;
  onAddSkill: () => void;
}

export function SkillsPanel({ skills, activeSkill, onSelectSkill, onAddSkill }: SkillsPanelProps) {
  const renderSkill = ({ item }: { item: Skill }) => (
    <TouchableOpacity
      style={[styles.skillItem, item.name === activeSkill && styles.skillItemActive]}
      onPress={() => onSelectSkill(item.name)}
    >
      <View style={styles.skillInfo}>
        <Text style={styles.skillName}>{item.name}</Text>
        <Text style={styles.skillTrigger}>Trigger: {item.trigger}</Text>
        <Text style={styles.skillTools} numberOfLines={1}>
          Tools: {item.tools.join(', ')}
        </Text>
      </View>
      <View style={[styles.skillBadge, { backgroundColor: item.enabled ? colors.success : colors.textSecondary }]}>
        <Text style={styles.skillBadgeText}>{item.enabled ? 'ON' : 'OFF'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SKILLS</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddSkill}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={skills}
        renderItem={renderSkill}
        keyExtractor={item => item.name}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  addButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  skillItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  skillItemActive: {
    borderColor: colors.primary,
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  skillTrigger: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  skillTools: {
    color: colors.primary,
    fontSize: 11,
    marginTop: 2,
  },
  skillBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  skillBadgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '600',
  },
});
