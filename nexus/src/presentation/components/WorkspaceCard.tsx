import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import { FileInfo } from '../../domain/models';

interface WorkspaceCardProps {
  workspacePath: string;
  fileCount: number;
  lastSync: Date | null;
  onSelectWorkspace: () => void;
}

export function WorkspaceCard({ workspacePath, fileCount, lastSync, onSelectWorkspace }: WorkspaceCardProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>WORKSPACE</Text>
        <View style={[styles.badge, { backgroundColor: workspacePath ? colors.success : colors.warning }]}>
          <Text style={styles.badgeText}>{workspacePath ? 'Active' : 'None'}</Text>
        </View>
      </View>

      {workspacePath ? (
        <>
          <Text style={styles.path} numberOfLines={2}>{workspacePath}</Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{fileCount}</Text>
              <Text style={styles.statLabel}>Files</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDate(lastSync)}</Text>
              <Text style={styles.statLabel}>Last Sync</Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.emptyText}>No workspace selected</Text>
      )}

      <TouchableOpacity style={styles.button} onPress={onSelectWorkspace}>
        <Text style={styles.buttonText}>{workspacePath ? 'Change Workspace' : 'Select Workspace'}</Text>
      </TouchableOpacity>
    </View>
  );
}

interface FileListProps {
  files: FileInfo[];
}

export function FileList({ files }: FileListProps) {
  const renderFile = (file: FileInfo, depth: number = 0) => (
    <View key={file.path} style={[styles.fileItem, { paddingLeft: depth * 16 + 8 }]}>
      <Text style={styles.fileIcon}>{file.isDirectory ? '📁' : '📄'}</Text>
      <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
    </View>
  );

  return (
    <View style={styles.fileList}>
      <Text style={styles.fileListTitle}>Workspace Files</Text>
      {files.slice(0, 10).map(file => renderFile(file))}
      {files.length > 10 && (
        <Text style={styles.moreFiles}>+{files.length - 10} more files</Text>
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
    fontSize: 10,
    fontWeight: '600',
  },
  path: {
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  fileList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  fileListTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  fileIcon: {
    marginRight: spacing.sm,
    fontSize: 14,
  },
  fileName: {
    color: colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  moreFiles: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
