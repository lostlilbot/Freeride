import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import { memoryEngine } from '../../data/memoryEngine';

interface MemoryStats {
  total: number;
  lessons: number;
  corrections: number;
  research: number;
}

interface MemoryGaugeProps {
  onPress?: () => void;
}

export function MemoryGauge({ onPress }: MemoryGaugeProps) {
  const [stats, setStats] = useState<MemoryStats>({ total: 0, lessons: 0, corrections: 0, research: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const counts = await memoryEngine.getMemoryCount();
      setStats(counts);
    } catch (error) {
      console.error('Error loading memory stats:', error);
    }
  };

  const maxMemory = 100;
  const usagePercent = Math.min((stats.total / maxMemory) * 100, 100);

  const getColor = () => {
    if (usagePercent > 80) return colors.error;
    if (usagePercent > 50) return colors.warning;
    return colors.success;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title}>MEMORY</Text>
        <View style={[styles.badge, { backgroundColor: getColor() }]}>
          <Text style={styles.badgeText}>{stats.total}</Text>
        </View>
      </View>

      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeBackground}>
          <View style={[styles.gaugeFill, { width: `${usagePercent}%`, backgroundColor: getColor() }]} />
        </View>
        <Text style={styles.percentText}>{usagePercent.toFixed(0)}%</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.lessons}</Text>
          <Text style={styles.statLabel}>Lessons</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.corrections}</Text>
          <Text style={styles.statLabel}>Corrections</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.research}</Text>
          <Text style={styles.statLabel}>Research</Text>
        </View>
      </View>
    </TouchableOpacity>
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
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  gaugeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  gaugeBackground: {
    flex: 1,
    height: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 6,
  },
  percentText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
});
