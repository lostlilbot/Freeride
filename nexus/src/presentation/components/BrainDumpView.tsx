import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import { memoryEngine, LessonLearned } from '../../data/memoryEngine';

interface BrainDumpViewProps {
  visible: boolean;
  onClose: () => void;
}

export function BrainDumpView({ visible, onClose }: BrainDumpViewProps) {
  const [lessons, setLessons] = useState<LessonLearned[]>([]);
  const [editingLesson, setEditingLesson] = useState<LessonLearned | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (visible) {
      loadLessons();
    }
  }, [visible]);

  const loadLessons = async () => {
    try {
      const allLessons = await memoryEngine.getAllLessons();
      setLessons(allLessons);
    } catch (error) {
      console.error('Error loading lessons:', error);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete Lesson',
      'Are you sure you want to delete this lesson?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await memoryEngine.deleteLesson(id);
            loadLessons();
          }
        },
      ]
    );
  };

  const handleEdit = (lesson: LessonLearned) => {
    setEditingLesson(lesson);
    setEditText(lesson.lesson);
  };

  const handleSaveEdit = async () => {
    if (editingLesson) {
      await memoryEngine.storeLesson({
        trigger: editingLesson.trigger,
        lesson: editText,
        context: editingLesson.context,
        timestamp: Date.now(),
      });
      setEditingLesson(null);
      setEditText('');
      loadLessons();
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderLesson = ({ item }: { item: LessonLearned }) => (
    <View style={styles.lessonCard}>
      <View style={styles.lessonHeader}>
        <Text style={styles.triggerText}>Trigger: {item.trigger}</Text>
        <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
      </View>
      
      <Text style={styles.lessonText}>{item.lesson}</Text>
      
      {item.context && (
        <Text style={styles.contextText} numberOfLines={2}>
          Context: {item.context}
        </Text>
      )}
      
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(item)}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => item.id && handleDelete(item.id)}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>BRAIN DUMP</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        {lessons.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧠</Text>
            <Text style={styles.emptyText}>No lessons learned yet</Text>
            <Text style={styles.emptySubtext}>
              Corrections and feedback will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={lessons}
            renderItem={renderLesson}
            keyExtractor={item => item.id?.toString() || Date.now().toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {editingLesson && (
          <Modal visible={true} transparent animationType="fade">
            <View style={styles.editModal}>
              <View style={styles.editContent}>
                <Text style={styles.editTitle}>Edit Lesson</Text>
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  placeholder="Edit lesson..."
                  placeholderTextColor={colors.textSecondary}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={() => setEditingLesson(null)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.saveButton} 
                    onPress={handleSaveEdit}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  closeButton: {
    color: colors.textSecondary,
    fontSize: 20,
    padding: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
  },
  lessonCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  triggerText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  lessonText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  contextText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.error,
  },
  deleteButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  editModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  editContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  editTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  editInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
});
