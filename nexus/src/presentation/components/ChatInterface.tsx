import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import { ChatMessage } from '../../domain/models';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
}

export function ChatInterface({ messages, onSendMessage, isProcessing }: ChatInterfaceProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }): React.ReactElement => (
    <View style={[styles.message, item.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
      <Text style={styles.messageRole}>{item.role === 'user' ? 'You' : 'Nexus'}</Text>
      <Text style={styles.messageContent}>{item.content}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <Text style={styles.title}>CHAT</Text>
        <Text style={styles.subtitle}>{messages.length} messages</Text>
      </View>

      <FlatList
        data={messages.slice(-50)}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity 
          style={[styles.sendButton, isProcessing && styles.sendButtonDisabled]} 
          onPress={handleSend}
          disabled={isProcessing || !input.trim()}
        >
          <Text style={styles.sendButtonText}>
            {isProcessing ? '⏳' : '➤'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
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
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: spacing.md,
  },
  message: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceLight,
  },
  messageRole: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageContent: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 18,
    color: colors.background,
  },
});
