import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  FlatList,
  RefreshControl
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initDatabase, getSettings, saveSettings, getTradeHistory, getPeers, getConnectedPeers, getAllArtifacts } from './src/data/database';
import { ModelSelector, getCachedModels, refreshModels, shouldSummarizeContext, summarizeMessages } from './src/data/openRouterGateway';
import { KnowledgeGraph } from './src/data/knowledgeGraph';
import { TradeProtocol } from './src/data/tradeProtocol';
import { AgentState, Settings, ChatMessage, TradeEvent, Artifact, Peer, ModelInfo, Specialty } from './src/domain/models';

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'hub' | 'trade' | 'models' | 'settings'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>({ status: 'idle', contextTokens: 0, tasksCompleted: 0, avgTradeValue: 0, connectedPeers: 0 });
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeEvent[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<{ type: string; message: string; timestamp: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const addLog = useCallback((type: string, message: string) => {
    setTerminalLogs(prev => [...prev.slice(-100), { type, message, timestamp: Date.now() }]);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        const savedSettings = getSettings();
        setSettings(savedSettings);

        if (savedSettings.apiKey) {
          const modelSelector = new ModelSelector(savedSettings.apiKey);
          await modelSelector.initialize();
          const loadedModels = await getCachedModels(savedSettings.apiKey);
          setModels(loadedModels);
          
          const kg = new KnowledgeGraph('agent-1', savedSettings.nodeAlias);
          const stats = kg.getStats();
          
          setAgentState(prev => ({
            ...prev,
            avgTradeValue: stats.avgTradeValue,
            connectedPeers: getConnectedPeers().length
          }));
        }

        setInitialized(true);
        addLog('system', 'Freeride Nexus initialized');
      } catch (error) {
        console.error('Init error:', error);
        addLog('error', `Init failed: ${error}`);
      }
    };
    init();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !settings.apiKey) return;
    
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setAgentState(prev => ({ ...prev, status: 'active' }));
    addLog('user', `User: ${input.substring(0, 50)}...`);

    try {
      const modelSelector = new ModelSelector(settings.apiKey);
      await modelSelector.initialize();
      
      const kg = new KnowledgeGraph('agent-1', settings.nodeAlias);
      
      let allMessages = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
      
      if (shouldSummarizeContext(allMessages as ChatMessage[], 8000)) {
        allMessages = summarizeMessages(allMessages as ChatMessage[], 10);
        addLog('system', 'Context summarized to fit token limit');
      }
      
      const enhancedMessages = [
        { role: 'system', content: 'You are Freeride Nexus, an autonomous AI agent node.' },
        ...allMessages
      ];
      
      let responseContent = '';
      let usedModel = '';
      
      const result = await modelSelector.attemptWithFailover(
        enhancedMessages as ChatMessage[],
        () => addLog('rotation', 'Rate limited, rotating model...')
      );
      
      responseContent = result.content;
      usedModel = result.model;
      
      addLog('model', `Model: ${usedModel}`);
      addLog('assistant', `Response: ${responseContent.substring(0, 100)}...`);
      
      const selfRating = await kg.selfAudit(responseContent, settings.apiKey);
      addLog('audit', `Self-rating: ${selfRating}/5`);
      
      if (selfRating <= 2) {
        addLog('system', 'Low rating, retrying with next model...');
        const retryResult = await modelSelector.attemptWithFailover(enhancedMessages as ChatMessage[]);
        responseContent = retryResult.content;
        addLog('retry', `Retried with ${retryResult.model}`);
      }
      
      const specialty = await kg.classifySpecialty(input, settings.apiKey);
      kg.saveArtifactFromTask(input, responseContent, specialty, selfRating);
      
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setAgentState(prev => ({
        ...prev,
        status: 'idle',
        currentModel: usedModel,
        tasksCompleted: prev.tasksCompleted + 1
      }));
      
    } catch (error: any) {
      addLog('error', `Error: ${error.message || error}`);
      setAgentState(prev => ({ ...prev, status: 'error' }));
      Alert.alert('Error', error.message || 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const loadPeerData = async () => {
    setPeers(getPeers());
    setTradeHistory(getTradeHistory(50));
    setArtifacts(getAllArtifacts().slice(0, 20));
    setAgentState(prev => ({
      ...prev,
      connectedPeers: getConnectedPeers().length,
      avgTradeValue: getAllArtifacts().reduce((sum, a) => sum + a.tradeValue, 0) / Math.max(1, getAllArtifacts().length)
    }));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (settings.apiKey) {
      const freshModels = await refreshModels(settings.apiKey);
      setModels(freshModels);
    }
    await loadPeerData();
    setRefreshing(false);
    addLog('system', 'Data refreshed');
  };

  const saveSettingsAndRestart = (newSettings: Settings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
    addLog('settings', 'Settings saved');
  };

  if (!initialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff88" />
        <Text style={styles.loadingText}>Initializing Freeride...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Freeride Nexus</Text>
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {agentState.status === 'active' ? 'Active' : agentState.status === 'error' ? 'Error' : 'Idle'}
          </Text>
          <Text style={styles.statusText}>|</Text>
          <Text style={styles.statusText}>{agentState.currentModel || 'No model'}</Text>
          <Text style={styles.statusText}>|</Text>
          <Text style={styles.statusText}>Peers: {agentState.connectedPeers}</Text>
          <Text style={styles.statusText}>|</Text>
          <Text style={styles.statusText}>TV: {agentState.avgTradeValue.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {(['chat', 'hub', 'trade', 'models', 'settings'] as const).map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => { setActiveTab(tab); if (tab === 'hub' || tab === 'trade') loadPeerData(); }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'chat' && (
        <View style={styles.chatContainer}>
          <View style={styles.terminal}>
            <ScrollView style={styles.terminalScroll}>
              {terminalLogs.map((log, i) => (
                <Text key={i} style={[
                  styles.logText,
                  log.type === 'error' && styles.errorLog,
                  log.type === 'model' && styles.modelLog,
                  log.type === 'rotation' && styles.rotationLog
                ]}>
                  [{log.type}] {log.message}
                </Text>
              ))}
            </ScrollView>
          </View>
          
          <ScrollView style={styles.messagesContainer}>
            {messages.map(msg => (
              <View key={msg.id} style={[styles.message, msg.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
                <Text style={styles.messageText}>{msg.content}</Text>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Enter prompt..."
              placeholderTextColor="#666"
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendButtonText}>Send</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeTab === 'hub' && (
        <View style={styles.hubContainer}>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Network Stats</Text>
            <Text style={styles.statsText}>Connected Peers: {peers.filter(p => p.connected).length}</Text>
            <Text style={styles.statsText}>Total Peers: {peers.length}</Text>
            <Text style={styles.statsText}>Avg Trade Value: {agentState.avgTradeValue.toFixed(2)}</Text>
          </View>
          
          <Text style={styles.sectionTitle}>My Network</Text>
          <FlatList
            data={peers}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.peerCard}>
                <Text style={styles.peerName}>{item.alias}</Text>
                <Text style={styles.peerText}>Specialty: {item.specialty}</Text>
                <Text style={styles.peerText}>TV: {item.avgTradeValue.toFixed(1)} | Artifacts: {item.artifactCount}</Text>
                <Text style={styles.peerText}>{item.connected ? '🟢 Connected' : '🔴 Disconnected'}</Text>
              </View>
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff88" />}
            ListEmptyComponent={<Text style={styles.emptyText}>No peers connected</Text>}
          />
        </View>
      )}

      {activeTab === 'trade' && (
        <View style={styles.tradeContainer}>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Trade Stats</Text>
            <Text style={styles.statsText}>Artifacts: {artifacts.length}</Text>
            <Text style={styles.statsText}>Events: {tradeHistory.length}</Text>
          </View>
          
          <Text style={styles.sectionTitle}>Trade History</Text>
          <FlatList
            data={tradeHistory}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.tradeEvent}>
                <Text style={styles.eventType}>{item.type.toUpperCase()}</Text>
                <Text style={styles.eventTime}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
                <Text style={styles.eventDelta}>ΔTV: {item.tradeValueDelta.toFixed(1)}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No trade history</Text>}
          />
        </View>
      )}

      {activeTab === 'models' && (
        <View style={styles.modelsContainer}>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Model Priority</Text>
            <Text style={styles.statsText}>Drag to reorder failover queue</Text>
          </View>
          
          <FlatList
            data={models}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => (
              <View style={styles.modelCard}>
                <View style={styles.modelInfo}>
                  <Text style={styles.modelName}>{item.name}</Text>
                  <Text style={styles.modelText}>Context: {item.contextLength.toLocaleString()}</Text>
                  <Text style={styles.modelText}>Modality: {item.modality}</Text>
                </View>
                <Switch value={item.enabled} onValueChange={(v) => {
                  const newModels = [...models];
                  newModels[index].enabled = v;
                  setModels(newModels);
                }} />
              </View>
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ff88" />}
            ListEmptyComponent={<Text style={styles.emptyText}>No free models available</Text>}
          />
        </View>
      )}

      {activeTab === 'settings' && (
        <ScrollView style={styles.settingsContainer}>
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>Node Alias</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.nodeAlias}
              onChangeText={(v) => saveSettingsAndRestart({ ...settings, nodeAlias: v })}
            />
          </View>
          
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>OpenRouter API Key</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.apiKey}
              onChangeText={(v) => saveSettingsAndRestart({ ...settings, apiKey: v })}
              secureTextEntry
              placeholder="sk-or-..."
            />
          </View>
          
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>JSONBin API Key</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.jsonBinKey}
              onChangeText={(v) => saveSettingsAndRestart({ ...settings, jsonBinKey: v })}
              secureTextEntry
            />
          </View>
          
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>JSONBin Bin ID</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.jsonBinId}
              onChangeText={(v) => saveSettingsAndRestart({ ...settings, jsonBinId: v })}
            />
          </View>
          
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>Auto Sync</Text>
            <Switch
              value={settings.autoSyncEnabled}
              onValueChange={(v) => saveSettingsAndRestart({ ...settings, autoSyncEnabled: v })}
            />
          </View>
          
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>Sync Interval (hours)</Text>
            <TextInput
              style={styles.settingInput}
              value={String(settings.syncIntervalHours)}
              onChangeText={(v) => saveSettingsAndRestart({ ...settings, syncIntervalHours: parseInt(v) || 6 })}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>Min Trade Value Threshold</Text>
            <TextInput
              style={styles.settingInput}
              value={String(settings.minTradeValueThreshold)}
              onChangeText={(v) => saveSettingsAndRestart({ ...settings, minTradeValueThreshold: parseFloat(v) || 3.0 })}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>Accept Connections (min TV)</Text>
            <TextInput
              style={styles.settingInput}
              value={String(settings.acceptConnectionsThreshold)}
              onChangeText={(v) => saveSettingsAndRestart({ ...settings, acceptConnectionsThreshold: parseFloat(v) || 2.0 })}
              keyboardType="numeric"
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a1628' },
  loadingText: { color: '#00ff88', marginTop: 16, fontSize: 18 },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#0d1f35' },
  headerTitle: { color: '#00ff88', fontSize: 24, fontWeight: 'bold' },
  statusBar: { flexDirection: 'row', marginTop: 8, gap: 8 },
  statusText: { color: '#888', fontSize: 12 },
  tabs: { flexDirection: 'row', backgroundColor: '#0d1f35', paddingHorizontal: 8 },
  tab: { paddingVertical: 12, paddingHorizontal: 16 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#00ff88' },
  tabText: { color: '#888', fontSize: 14 },
  activeTabText: { color: '#00ff88' },
  
  chatContainer: { flex: 1 },
  terminal: { height: 120, backgroundColor: '#0d1f35', padding: 8, borderBottomWidth: 1, borderBottomColor: '#333' },
  terminalScroll: { flex: 1 },
  logText: { color: '#888', fontSize: 10, fontFamily: 'monospace' },
  errorLog: { color: '#ff4444' },
  modelLog: { color: '#4488ff' },
  rotationLog: { color: '#ffaa00' },
  
  messagesContainer: { flex: 1, padding: 16 },
  message: { padding: 12, borderRadius: 8, marginBottom: 8, maxWidth: '80%' },
  userMessage: { alignSelf: 'flex-end', backgroundColor: '#1a3a5c' },
  assistantMessage: { alignSelf: 'flex-start', backgroundColor: '#0d1f35' },
  messageText: { color: '#fff', fontSize: 14 },
  
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#0d1f35', borderTopWidth: 1, borderTopColor: '#333' },
  input: { flex: 1, backgroundColor: '#1a2a3a', borderRadius: 8, padding: 12, color: '#fff', maxHeight: 80 },
  sendButton: { backgroundColor: '#00ff88', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, marginLeft: 8, justifyContent: 'center' },
  sendButtonText: { color: '#0a1628', fontWeight: 'bold' },
  
  hubContainer: { flex: 1, padding: 16 },
  tradeContainer: { flex: 1, padding: 16 },
  modelsContainer: { flex: 1, padding: 16 },
  settingsContainer: { flex: 1, padding: 16 },
  
  statsCard: { backgroundColor: '#0d1f35', padding: 16, borderRadius: 8, marginBottom: 16 },
  statsTitle: { color: '#00ff88', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  statsText: { color: '#ccc', fontSize: 14 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  
  peerCard: { backgroundColor: '#0d1f35', padding: 12, borderRadius: 8, marginBottom: 8 },
  peerName: { color: '#00ff88', fontSize: 16, fontWeight: 'bold' },
  peerText: { color: '#ccc', fontSize: 12, marginTop: 2 },
  
  tradeEvent: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0d1f35', padding: 12, borderRadius: 8, marginBottom: 8 },
  eventType: { color: '#00ff88', fontWeight: 'bold' },
  eventTime: { color: '#888' },
  eventDelta: { color: '#ccc' },
  
  modelCard: { backgroundColor: '#0d1f35', padding: 12, borderRadius: 8, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modelInfo: { flex: 1 },
  modelName: { color: '#fff', fontSize: 14 },
  modelText: { color: '#888', fontSize: 12 },
  
  settingCard: { backgroundColor: '#0d1f35', padding: 16, borderRadius: 8, marginBottom: 12 },
  settingLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  settingInput: { backgroundColor: '#1a2a3a', borderRadius: 4, padding: 8, color: '#fff', marginTop: 4 },
  
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40 }
});
