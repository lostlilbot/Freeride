import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import { AgentStatus } from '../../domain/models';

interface StatusCardProps {
  status: AgentStatus;
  activeSkill: string | null;
  memoryUsage: number;
}

const statusLabels: Record<AgentStatus, string> = {
  idle: 'Ready',
  active: 'Processing',
  error: 'Error',
  listening: 'Listening',
};

const statusColors: Record<AgentStatus, string> = {
  idle: colors.success,
  active: colors.primary,
  error: colors.error,
  listening: colors.warning,
};

export function StatusCard({ status, activeSkill, memoryUsage }: StatusCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NEXUS STATUS</Text>
        <View style={[styles.indicator, { backgroundColor: statusColors[status] }]}>
          <View style={[styles.dot, { backgroundColor: statusColors[status] }]} />
        </View>
      </View>
      
      <View style={styles.statusRow}>
        <Text style={styles.label}>State:</Text>
        <Text style={[styles.value, { color: statusColors[status] }]}>
          {statusLabels[status]}
        </Text>
      </View>
      
      <View style={styles.statusRow}>
        <Text style={styles.label}>Active Skill:</Text>
        <Text style={styles.value}>{activeSkill || 'None'}</Text>
      </View>
      
      <View style={styles.statusRow}>
        <Text style={styles.label}>Memory:</Text>
        <Text style={styles.value}>{memoryUsage.toFixed(1)} MB</Text>
      </View>
      
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: `${Math.min(memoryUsage, 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
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
  indicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
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
  progressBar: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
