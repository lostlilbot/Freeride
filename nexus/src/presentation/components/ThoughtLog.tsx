import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

export interface ThoughtStep {
  id: string;
  type: 'plan' | 'act' | 'observe' | 'reason' | 'error';
  content: string;
  timestamp: Date;
}

interface ThoughtLogProps {
  maxSteps?: number;
  autoScroll?: boolean;
}

export function ThoughtLog({ maxSteps = 50, autoScroll = true }: ThoughtLogProps) {
  const [steps, setSteps] = useState<ThoughtStep[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const addThought = (type: ThoughtStep['type'], content: string) => {
    const newStep: ThoughtStep = {
      id: `thought_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date(),
    };

    setSteps(prev => {
      const updated = [...prev, newStep];
      if (updated.length > maxSteps) {
        return updated.slice(-maxSteps);
      }
      return updated;
    });

    if (autoScroll && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const clearLog = () => {
    setSteps([]);
  };

  const getTypeColor = (type: ThoughtStep['type']) => {
    switch (type) {
      case 'plan': return colors.primary;
      case 'act': return colors.warning;
      case 'observe': return colors.success;
      case 'reason': return colors.secondary;
      case 'error': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getTypeIcon = (type: ThoughtStep['type']) => {
    switch (type) {
      case 'plan': return '📋';
      case 'act': return '⚡';
      case 'observe': return '👁';
      case 'reason': return '🧠';
      case 'error': return '❌';
      default: return '•';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.title}>🤖 THOUGHT LOG</Text>
          <View style={[styles.badge, { backgroundColor: steps.length > 0 ? colors.success : colors.textSecondary }]}>
            <Text style={styles.badgeText}>{steps.length}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.clearButton} onPress={clearLog}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▲'}</Text>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView 
          ref={scrollRef}
          style={styles.logContainer}
          showsVerticalScrollIndicator={false}
        >
          {steps.length === 0 ? (
            <Text style={styles.emptyText}>
              No thoughts yet. Start a conversation to see the agent's reasoning.
            </Text>
          ) : (
            steps.map(step => (
              <View key={step.id} style={styles.stepContainer}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepIcon}>{getTypeIcon(step.type)}</Text>
                  <Text style={[styles.stepType, { color: getTypeColor(step.type) }]}>
                    {step.type.toUpperCase()}
                  </Text>
                  <Text style={styles.stepTime}>{formatTime(step.timestamp)}</Text>
                </View>
                <Text style={styles.stepContent}>{step.content}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

export const thoughtLog = {
  plan: (content: string) => console.log(`[PLAN] ${content}`),
  act: (content: string) => console.log(`[ACT] ${content}`),
  observe: (content: string) => console.log(`[OBSERVE] ${content}`),
  reason: (content: string) => console.log(`[REASON] ${content}`),
  error: (content: string) => console.error(`[ERROR] ${content}`),
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surfaceLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginRight: spacing.sm,
  },
  clearButtonText: {
    color: colors.error,
    fontSize: 12,
  },
  expandIcon: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  logContainer: {
    maxHeight: 200,
    padding: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    padding: spacing.lg,
  },
  stepContainer: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  stepType: {
    fontSize: 10,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  stepTime: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  stepContent: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },
});
