import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList,
  TouchableOpacity, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Friend } from '../../types/pet';
import { useTranslation } from 'react-i18next';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_COLORS = [
  '#40E0D0', '#FF6B9D', '#9C27B0', '#FF9800',
  '#2196F3', '#4CAF50', '#F44336', '#8D6E63',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function AddFriendsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [])
  );

  async function loadFriends() {
    try {
      const json = await AsyncStorage.getItem('friends');
      setFriends(json ? JSON.parse(json) : []);
    } catch { }
  }

  async function addFriend() {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const duplicate = friends.find(
      f => f.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      Alert.alert('Amigo já adicionado', `"${trimmed}" já está na sua lista de amigos.`);
      return;
    }

    setSaving(true);
    try {
      const friend: Friend = { id: generateId(), name: trimmed };
      const updated = [...friends, friend];
      await AsyncStorage.setItem('friends', JSON.stringify(updated));
      setFriends(updated);
      setNewName('');
    } catch {
      Alert.alert(t('common.error'), t('friends.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function removeFriend(id: string) {
    Alert.alert('Remover amigo', 'Deseja remover este amigo da sua lista?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const updated = friends.filter(f => f.id !== id);
          await AsyncStorage.setItem('friends', JSON.stringify(updated));
          setFriends(updated);
        },
      },
    ]);
  }

  const filtered = search.trim()
    ? friends.filter(f => f.name.toLowerCase().includes(search.trim().toLowerCase()))
    : friends;

  const renderFriend = ({ item }: { item: Friend }) => {
    const color = avatarColor(item.name);
    return (
      <View style={[styles.friendItem, {
        backgroundColor: colors.surface,
        borderBottomColor: colors.border,
      }]}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <Text style={[styles.friendName, { color: colors.text.primary }]}>{item.name}</Text>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => removeFriend(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Amigos</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Add friend input */}
      <View style={[styles.addCard, {
        backgroundColor: colors.surface,
        ...(Platform.OS === 'web'
          ? { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
          : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 }),
      }]}>
        <Text style={[styles.addLabel, { color: colors.text.primary }]}>Adicionar novo amigo</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.nameInput, {
              backgroundColor: colors.background,
              color: colors.text.primary,
              borderColor: colors.border,
            }]}
            placeholder="Nome do amigo..."
            placeholderTextColor={colors.text.light}
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={addFriend}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addButton, { opacity: saving || !newName.trim() ? 0.6 : 1 }]}
            onPress={addFriend}
            disabled={saving || !newName.trim()}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      {friends.length > 3 && (
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.text.light} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Buscar amigo..."
            placeholderTextColor={colors.text.light}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.text.light} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Friends list */}
      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={56} color={colors.text.light} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
            {friends.length === 0 ? 'Nenhum amigo ainda' : 'Nenhum resultado'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
            {friends.length === 0
              ? 'Adicione amigos para ver seus pets e conquistas'
              : 'Tente outro nome na busca'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderFriend}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  addCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  addLabel: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  addRow: { flexDirection: 'row', alignItems: 'center' },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#40E0D0',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  listContent: { paddingBottom: 20 },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  friendName: { flex: 1, fontSize: 16, fontWeight: '500' },
  removeBtn: { padding: 4 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
