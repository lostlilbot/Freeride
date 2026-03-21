import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

interface SystemStatusProps {
  networkStatus: 'connected' | 'disconnected' | 'unknown';
  batteryLevel: number;
  powerMode: string;
  mcpConnected: boolean;
  parallelTasks: number;
}

export function SystemStatus({ 
  networkStatus, 
  batteryLevel, 
  powerMode, 
  mcpConnected,
  parallelTasks 
}: SystemStatusProps) {
  const getNetworkIcon = () => {
    switch (networkStatus) {
      case 'connected': return '📶';
      case 'disconnected': return '📴';
      default: return '❓';
    }
  };

  const getBatteryIcon = () => {
    if (batteryLevel > 80) return '🔋';
    if (batteryLevel > 50) return '🔌';
    if (batteryLevel > 20) return '⚡';
    return '🪫';
  };

  const getPowerModeColor = () => {
    switch (powerMode) {
      case 'normal': return colors.success;
      case 'low_power': return colors.warning;
      case 'critical': return colors.error;
      default: return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SYSTEM STATUS</Text>
      
      <View style={styles.statusGrid}>
        <View style={styles.statusItem}>
          <Text style={styles.statusIcon}>{getNetworkIcon()}</Text>
          <Text style={styles.statusLabel}>Network</Text>
          <Text style={[styles.statusValue, { 
            color: networkStatus === 'connected' ? colors.success : colors.warning 
          }]}>
            {networkStatus}
          </Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusIcon}>{getBatteryIcon()}</Text>
          <Text style={styles.statusLabel}>Battery</Text>
          <Text style={styles.statusValue}>{batteryLevel}%</Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusIcon}>⚙️</Text>
          <Text style={styles.statusLabel}>Power Mode</Text>
          <Text style={[styles.statusValue, { color: getPowerModeColor() }]}>
            {powerMode}
          </Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusIcon}>🔗</Text>
          <Text style={styles.statusLabel}>MCP</Text>
          <Text style={[styles.statusValue, { 
            color: mcpConnected ? colors.success : colors.textSecondary 
          }]}>
            {mcpConnected ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {parallelTasks > 0 && (
        <View style={styles.parallelIndicator}>
          <Text style={styles.parallelText}>
            🔄 {parallelTasks} parallel task(s) running
          </Text>
        </View>
      )}
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
  title: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusItem: {
    width: '50%',
    paddingVertical: spacing.sm,
  },
  statusIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statusLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  statusValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  parallelIndicator: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
  },
  parallelText: {
    color: colors.primary,
    fontSize: 12,
    textAlign: 'center',
  },
});
