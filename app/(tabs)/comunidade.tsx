import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, TextInput, Alert, Modal, Platform, Image,
  Animated, Dimensions, KeyboardAvoidingView,
} from 'react-native';
import { Shadows } from '../../constants/Shadows';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureGet } from '../../services/secureStorage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import {
  CommunityPost, PostComment, LostPet, Pet, Reminder,
  VaccineRecord, UserProfile, Achievement,
} from '../../types/pet';
import { ACHIEVEMENTS, groupAchievements, checkAndUnlockAchievements } from '../../hooks/useAchievements';
import AchievementGroupSection from '../../components/AchievementGroupSection';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── helpers ────────────────────────────────────────────────────────────────

const getAvatarColor = (name: string) => {
  const palette = ['#FF6B9D', '#9C27B0', '#2196F3', '#4CAF50', '#FF9800', '#40E0D0', '#F44336', '#8D6E63'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
};

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const getWeekKey = () => {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

// ─── Desafios semanais fixos ─────────────────────────────────────────────────

type ChallengeAction = 'post_photo' | 'post_health' | 'post_food' | 'post_behavior' | 'register_vaccine' | 'register_reminder' | 'report_lost' | 'none';

const WEEKLY_CHALLENGES: {
  id: string;
  title: string;
  description: string;
  tip: string;
  icon: string;
  color: string;
  action: ChallengeAction;
  category?: CommunityPost['category'];
}[] = [
  {
    id: 'photo_sleep',
    title: 'Soninho Fofo',
    description: 'Poste uma foto do seu pet dormindo ou descansando.',
    tip: 'Toque em "Postar" no feed, adicione a foto e escolha a categoria "Geral".',
    icon: 'sleep',
    color: '#9C27B0',
    action: 'post_photo',
    category: 'Geral',
  },
  {
    id: 'vaccine_week',
    title: 'Semana da Saúde',
    description: 'Registre uma vacina ou lembrete de saúde do seu pet no app.',
    tip: 'Vá até a aba Pets, abra o perfil do pet e registre uma vacina ou lembrete.',
    icon: 'needle',
    color: '#4CAF50',
    action: 'register_vaccine',
  },
  {
    id: 'first_photo',
    title: 'Apresente seu Pet!',
    description: 'Publique a primeira foto do seu pet na comunidade e se apresente.',
    tip: 'Toque em "Postar", adicione uma foto e escreva uma legenda apresentando seu pet.',
    icon: 'camera',
    color: '#40E0D0',
    action: 'post_photo',
    category: 'Geral',
  },
  {
    id: 'health_tip',
    title: 'Dica de Saúde',
    description: 'Compartilhe uma foto junto com uma dica de saúde para outros tutores.',
    tip: 'Poste uma foto na categoria "Saúde" com uma legenda explicando a dica.',
    icon: 'heart-pulse',
    color: '#F44336',
    action: 'post_health',
    category: 'Saúde',
  },
  {
    id: 'food_share',
    title: 'Hora da Refeição',
    description: 'Poste uma foto do seu pet na hora da comida ou compartilhe uma dica de alimentação.',
    tip: 'Toque em "Postar", adicione a foto e selecione a categoria "Alimentação".',
    icon: 'food-variant',
    color: '#FF9800',
    action: 'post_food',
    category: 'Alimentação',
  },
  {
    id: 'behavior_tip',
    title: 'Truque do Dia',
    description: 'Mostre um truque ou comportamento especial do seu pet com foto ou vídeo.',
    tip: 'Poste uma foto na categoria "Comportamento" descrevendo o truque.',
    icon: 'star-circle',
    color: '#2196F3',
    action: 'post_behavior',
    category: 'Comportamento',
  },
  {
    id: 'reminder_week',
    title: 'Tutor Organizado',
    description: 'Crie um lembrete de banho, consulta ou medicação para o seu pet.',
    tip: 'Abra o perfil do pet e toque em "Novo Lembrete" para agendar.',
    icon: 'calendar-check',
    color: '#673AB7',
    action: 'register_reminder',
  },
  {
    id: 'race_share',
    title: 'Orgulho da Raça',
    description: 'Poste uma foto mostrando as características únicas da raça do seu pet.',
    tip: 'Poste na categoria "Raças" e conte uma curiosidade da raça na legenda.',
    icon: 'ribbon',
    color: '#E91E63',
    action: 'post_photo',
    category: 'Raças',
  },
  {
    id: 'bath_day',
    title: 'Dia do Banho',
    description: 'Poste uma foto do seu pet antes ou depois do banho — quanto mais fofo, melhor!',
    tip: 'Toque em "Postar" e compartilhe a transformação do seu pet.',
    icon: 'shower',
    color: '#00BCD4',
    action: 'post_photo',
    category: 'Higiene',
  },
  {
    id: 'lost_awareness',
    title: 'Alerta Solidário',
    description: 'Reporte um pet perdido ou encontrado na sua região para ajudar a comunidade.',
    tip: 'Vá para a aba "Perdidos" e toque em "Reportar" para cadastrar o alerta.',
    icon: 'map-marker-alert',
    color: '#FF5722',
    action: 'report_lost',
  },
  {
    id: 'play_time',
    title: 'Hora de Brincar',
    description: 'Poste uma foto do seu pet se divertindo, brincando ou explorando.',
    tip: 'Capture esse momento e publique na categoria "Comportamento".',
    icon: 'tennis-ball',
    color: '#CDDC39',
    action: 'post_behavior',
    category: 'Comportamento',
  },
  {
    id: 'vet_visit',
    title: 'Visita ao Vet',
    description: 'Registre uma consulta veterinária no app ou poste uma dica sobre prevenção.',
    tip: 'Crie um lembrete de "Consulta" ou poste na categoria "Saúde".',
    icon: 'stethoscope',
    color: '#009688',
    action: 'register_reminder',
  },
];

type Tab = 'feed' | 'lost' | 'achievements' | 'challenges';

const POST_CATEGORIES: CommunityPost['category'][] = ['Geral', 'Saúde', 'Alimentação', 'Comportamento', 'Raças', 'Higiene'];

const CATEGORY_COLORS: Record<CommunityPost['category'], string> = {
  Geral: Theme.primary,
  Saúde: Theme.categories.Saúde.main,
  Alimentação: '#8D6E63',
  Comportamento: '#FF9800',
  Raças: '#9C27B0',
  Higiene: '#00BCD4',
};

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('feed');

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [lostPets, setLostPets] = useState<LostPet[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [completedChallengeIds, setCompletedChallengeIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [deviceId, setDeviceId] = useState('');

  const [postModalVisible, setPostModalVisible] = useState(false);
  const [lostModalVisible, setLostModalVisible] = useState(false);
  const [commentsPost, setCommentsPost] = useState<CommunityPost | null>(null);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async () => {
    try {
      const [postsJSON, lostJSON, achJSON, challengeJSON, historyJSON,
        profJSON, petsJSON, remJSON, vacJSON, storedDeviceId, weightJSON, streakJSON] = await Promise.all([
        AsyncStorage.getItem('communityPosts'),
        AsyncStorage.getItem('lostPets'),
        AsyncStorage.getItem('achievements'),
        AsyncStorage.getItem('weeklyChallenge'),
        AsyncStorage.getItem('challengeHistory'),
        secureGet('userProfile'),
        AsyncStorage.getItem('pets'),
        AsyncStorage.getItem('reminders'),
        AsyncStorage.getItem('vaccinations'),
        AsyncStorage.getItem('deviceId'),
        AsyncStorage.getItem('weightRecords'),
        AsyncStorage.getItem('streakData'),
      ]);

      let did = storedDeviceId;
      if (!did) {
        did = Date.now().toString(36) + Math.random().toString(36).slice(2);
        await AsyncStorage.setItem('deviceId', did);
      }
      setDeviceId(did);

      const parsedPosts: CommunityPost[] = postsJSON ? JSON.parse(postsJSON) : [];
      const migratedPosts = parsedPosts.map(p => ({ ...p, comments: p.comments ?? [] }));
      setPosts(migratedPosts);
      setLostPets(lostJSON ? JSON.parse(lostJSON) : []);
      setUnlockedAchievements(achJSON ? JSON.parse(achJSON) : []);
      setProfile(profJSON ? JSON.parse(profJSON) : null);

      const weekKey = getWeekKey();
      const saved = challengeJSON ? JSON.parse(challengeJSON) : null;
      setChallengeCompleted(saved?.week === weekKey && saved?.completed);

      const history: string[] = historyJSON ? JSON.parse(historyJSON) : [];
      setCompletedChallengeIds(history);

      const pets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];
      const reminders: Reminder[] = remJSON ? JSON.parse(remJSON) : [];
      const vaccines: VaccineRecord[] = vacJSON ? JSON.parse(vacJSON) : [];
      await checkAndUnlockAchievements({
        pets,
        reminders,
        vaccines,
        weightRecords: weightJSON ? JSON.parse(weightJSON) : [],
        streak: streakJSON ? JSON.parse(streakJSON) : { currentStreak: 0, bestStreak: 0, lastOpenedDate: '', totalDays: 0 },
      });

      const achJSON2 = await AsyncStorage.getItem('achievements');
      setUnlockedAchievements(achJSON2 ? JSON.parse(achJSON2) : []);
    } catch (e) {
      if (__DEV__) console.error('Erro ao carregar comunidade:', e);
    }
  };

  const savePosts = async (updated: CommunityPost[]) => {
    setPosts(updated);
    await AsyncStorage.setItem('communityPosts', JSON.stringify(updated));
  };

  const weekKey = getWeekKey();
  const weekIndex = parseInt(weekKey.split('-W')[1]) % WEEKLY_CHALLENGES.length;
  const currentChallenge = WEEKLY_CHALLENGES[weekIndex];
  const authorName = profile?.name || 'Tutor Anônimo';

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('community.title')}</Text>
        <View style={styles.headerActions}>
          {activeTab === 'feed' && (
            <TouchableOpacity
              style={[styles.headerActionBtn, { backgroundColor: Theme.primary }]}
              onPress={() => setPostModalVisible(true)}
            >
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.headerActionText}>{t('community.feed.post')}</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'lost' && (
            <TouchableOpacity
              style={[styles.headerActionBtn, { backgroundColor: Theme.danger }]}
              onPress={() => setLostModalVisible(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.headerActionText}>{t('community.lost.report')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Abas */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {([
          { id: 'feed', label: t('community.tabs.photos'), icon: 'image-multiple-outline' },
          { id: 'lost', label: t('community.tabs.lost'), icon: 'map-marker-alert-outline' },
          { id: 'achievements', label: t('community.tabs.achievements'), icon: 'trophy-outline' },
          { id: 'challenges', label: t('community.tabs.challenges'), icon: 'flag-outline' },
        ] as { id: Tab; label: string; icon: string }[]).map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.id ? Theme.primary : colors.text.light}
            />
            <Text style={[
              styles.tabLabel,
              { color: activeTab === tab.id ? Theme.primary : colors.text.light },
              activeTab === tab.id && { fontWeight: '700' },
            ]}>
              {tab.label}
            </Text>
            {tab.id === 'achievements' && unlockedAchievements.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unlockedAchievements.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Conteúdo */}
      {activeTab === 'feed' && (
        <FeedTab
          posts={posts}
          savePosts={savePosts}
          colors={colors}
          deviceId={deviceId}
          onOpenComments={(post) => setCommentsPost(post)}
        />
      )}
      {activeTab === 'lost' && (
        <LostTab lostPets={lostPets} setLostPets={setLostPets} colors={colors} />
      )}
      {activeTab === 'achievements' && (
        <AchievementsTab unlocked={unlockedAchievements} colors={colors} />
      )}
      {activeTab === 'challenges' && (
        <ChallengesTab
          challenge={currentChallenge}
          completed={challengeCompleted}
          completedIds={completedChallengeIds}
          onComplete={async () => {
            const wk = getWeekKey();
            await AsyncStorage.setItem('weeklyChallenge', JSON.stringify({ week: wk, completed: true }));
            setChallengeCompleted(true);
            // Salvar no histórico de desafios concluídos
            const newHistory = completedChallengeIds.includes(currentChallenge.id)
              ? completedChallengeIds
              : [...completedChallengeIds, currentChallenge.id];
            setCompletedChallengeIds(newHistory);
            await AsyncStorage.setItem('challengeHistory', JSON.stringify(newHistory));
            Alert.alert(t('community.challengeDoneTitle'), t('community.challengeDoneMsg'));
          }}
          onPostPhoto={() => { setActiveTab('feed'); setPostModalVisible(true); }}
          onReportLost={() => { setActiveTab('lost'); setLostModalVisible(true); }}
          colors={colors}
        />
      )}

      {/* Modal: Novo Post */}
      <NewPostModal
        visible={postModalVisible}
        onClose={() => setPostModalVisible(false)}
        onSave={async (post) => {
          const updated = [post, ...posts];
          await savePosts(updated);
          setPostModalVisible(false);
        }}
        authorName={authorName}
        colors={colors}
      />

      {/* Modal: Pet Perdido */}
      <LostPetModal
        visible={lostModalVisible}
        onClose={() => setLostModalVisible(false)}
        onSave={async (lost) => {
          const updated = [lost, ...lostPets];
          setLostPets(updated);
          await AsyncStorage.setItem('lostPets', JSON.stringify(updated));
          setLostModalVisible(false);
        }}
        authorName={authorName}
        colors={colors}
      />

      {/* Modal: Comentários */}
      {!!commentsPost && (
        <CommentsModal
          post={commentsPost}
          visible={!!commentsPost}
          onClose={() => setCommentsPost(null)}
          onSave={async (updated) => {
            const newPosts = posts.map(p => p.id === updated.id ? updated : p);
            await savePosts(newPosts);
            setCommentsPost(updated);
          }}
          authorName={authorName}
          colors={colors}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Aba: Feed de Fotos ───────────────────────────────────────────────────────

function FeedTab({ posts, savePosts, colors, deviceId, onOpenComments }: {
  posts: CommunityPost[];
  savePosts: (p: CommunityPost[]) => void;
  colors: any;
  deviceId: string;
  onOpenComments: (post: CommunityPost) => void;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<CommunityPost['category'] | 'Todos'>('Todos');

  const filtered = useMemo(() =>
    filter === 'Todos' ? posts : posts.filter(p => p.category === filter),
    [posts, filter]
  );

  const toggleLike = async (postId: string) => {
    const updated = posts.map(p => {
      if (p.id !== postId) return p;
      const liked = p.likes.includes(deviceId);
      return { ...p, likes: liked ? p.likes.filter(id => id !== deviceId) : [...p.likes, deviceId] };
    });
    savePosts(updated);
  };

  if (posts.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <MaterialCommunityIcons name="camera-outline" size={64} color={colors.text.light} />
        <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('community.feed.noPhotos')}</Text>
        <Text style={[styles.emptyMsg, { color: colors.text.secondary }]}>
          {t('community.feed.noPhotosMsg')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={i => i.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['Todos', ...POST_CATEGORIES] as const).map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                { borderColor: colors.border, backgroundColor: colors.surface },
                filter === cat && { backgroundColor: Theme.primary + '20', borderColor: Theme.primary },
              ]}
              onPress={() => setFilter(cat as any)}
            >
              <Text style={[
                styles.filterChipText,
                { color: filter === cat ? Theme.primary : colors.text.secondary },
                filter === cat && { fontWeight: '700' },
              ]}>
                {cat === 'Todos' ? t('community.feed.all') : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      }
      renderItem={({ item }) => (
        <PhotoPostCard
          post={item}
          deviceId={deviceId}
          colors={colors}
          onLike={() => toggleLike(item.id)}
          onComment={() => onOpenComments(item)}
        />
      )}
    />
  );
}

// ─── Card de Post com Foto ────────────────────────────────────────────────────

function PhotoPostCard({ post, deviceId, colors, onLike, onComment }: {
  post: CommunityPost;
  deviceId: string;
  colors: any;
  onLike: () => void;
  onComment: () => void;
}) {
  const liked = post.likes.includes(deviceId);
  const heartScale = useRef(new Animated.Value(1)).current;
  const [fullImage, setFullImage] = useState(false);

  const handleLike = () => {
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onLike();
  };

  return (
    <View style={[styles.postCard, { backgroundColor: colors.surface }]}>
      {/* Cabeçalho */}
      <View style={styles.postHeader}>
        <View style={[styles.authorAvatar, { backgroundColor: post.authorColor }]}>
          <Text style={styles.authorInitials}>{post.authorInitials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.authorName, { color: colors.text.primary }]}>{post.authorName}</Text>
          {!!post.petName && (
            <View style={styles.petNameRow}>
              <MaterialCommunityIcons name="paw" size={11} color={colors.text.light} />
              <Text style={[styles.postPetName, { color: colors.text.secondary }]}> {post.petName}</Text>
            </View>
          )}
        </View>
        <View style={styles.postMeta}>
          <View style={[styles.categoryTag, { backgroundColor: CATEGORY_COLORS[post.category] + '20' }]}>
            <Text style={[styles.categoryTagText, { color: CATEGORY_COLORS[post.category] }]}>{post.category}</Text>
          </View>
          <Text style={[styles.postTime, { color: colors.text.light }]}>{timeAgo(post.createdAt)}</Text>
        </View>
      </View>

      {/* Foto */}
      {!!post.photoUri && (
        <TouchableOpacity activeOpacity={0.95} onPress={() => setFullImage(true)}>
          <Image
            source={{ uri: post.photoUri }}
            style={styles.postImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {/* Caption */}
      {!!post.content && (
        <Text style={[styles.postContent, { color: colors.text.primary }]}>
          {!!post.petName && (
            <Text style={{ fontWeight: '700' }}>{post.petName} </Text>
          )}
          {post.content}
        </Text>
      )}

      {/* Ações */}
      <View style={[styles.postFooter, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={liked ? '#F44336' : colors.text.light}
            />
          </Animated.View>
          {post.likes.length > 0 && (
            <Text style={[styles.actionCount, { color: liked ? '#F44336' : colors.text.light }]}>
              {post.likes.length}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={21} color={colors.text.light} />
          {post.comments.length > 0 && (
            <Text style={[styles.actionCount, { color: colors.text.light }]}>{post.comments.length}</Text>
          )}
        </TouchableOpacity>

        {/* Último comentário preview */}
        {post.comments.length > 0 && (
          <TouchableOpacity style={styles.commentPreview} onPress={onComment}>
            <Text style={[styles.commentPreviewText, { color: colors.text.secondary }]} numberOfLines={1}>
              <Text style={{ fontWeight: '700', color: colors.text.primary }}>
                {post.comments[post.comments.length - 1].authorName.split(' ')[0]}
              </Text>
              {' '}{post.comments[post.comments.length - 1].text}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Visualizador de imagem full screen */}
      {!!post.photoUri && (
        <Modal visible={fullImage} transparent animationType="fade" onRequestClose={() => setFullImage(false)}>
          <TouchableOpacity
            style={styles.fullImageOverlay}
            activeOpacity={1}
            onPress={() => setFullImage(false)}
          >
            <Image source={{ uri: post.photoUri }} style={styles.fullImage} resizeMode="contain" />
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

// ─── Modal: Comentários ───────────────────────────────────────────────────────

function CommentsModal({ post, visible, onClose, onSave, authorName, colors }: {
  post: CommunityPost;
  visible: boolean;
  onClose: () => void;
  onSave: (updated: CommunityPost) => void;
  authorName: string;
  colors: any;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const comment: PostComment = {
      id: Date.now().toString(),
      authorName,
      authorInitials: getInitials(authorName),
      authorColor: getAvatarColor(authorName),
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    onSave({ ...post, comments: [...post.comments, comment] });
    setText('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
        <View style={[styles.commentsBox, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('community.comments.title')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Lista */}
          <FlatList
            data={post.comments}
            keyExtractor={c => c.id}
            style={styles.commentsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={[styles.emptyMsg, { color: colors.text.light, textAlign: 'center', paddingVertical: 24 }]}>
                {t('community.comments.empty')}
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.commentRow}>
                <View style={[styles.commentAvatar, { backgroundColor: item.authorColor }]}>
                  <Text style={styles.commentAvatarText}>{item.authorInitials}</Text>
                </View>
                <View style={[styles.commentBubble, { backgroundColor: colors.background }]}>
                  <Text style={[styles.commentAuthor, { color: colors.text.primary }]}>{item.authorName}</Text>
                  <Text style={[styles.commentText, { color: colors.text.primary }]}>{item.text}</Text>
                  <Text style={[styles.commentTime, { color: colors.text.light }]}>{timeAgo(item.createdAt)}</Text>
                </View>
              </View>
            )}
          />

          {/* Input */}
          <View style={[styles.commentInputRow, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={[styles.commentAvatar, { backgroundColor: getAvatarColor(authorName) }]}>
              <Text style={styles.commentAvatarText}>{getInitials(authorName)}</Text>
            </View>
            <TextInput
              style={[styles.commentInput, { backgroundColor: colors.background, color: colors.text.primary, borderColor: colors.border }]}
              placeholder={t('community.comments.placeholder')}
              placeholderTextColor={colors.text.light}
              value={text}
              onChangeText={setText}
              maxLength={200}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: text.trim() ? Theme.primary : colors.border }]}
              onPress={handleSend}
              disabled={!text.trim()}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Aba: Pets Perdidos ───────────────────────────────────────────────────────

function LostTab({ lostPets, setLostPets, colors }: {
  lostPets: LostPet[];
  setLostPets: (p: LostPet[]) => void;
  colors: any;
}) {
  const { t } = useTranslation();
  if (lostPets.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <MaterialCommunityIcons name="map-marker-alert-outline" size={56} color={colors.text.light} />
        <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t('community.lost.noAlerts')}</Text>
        <Text style={[styles.emptyMsg, { color: colors.text.secondary }]}>
          {t('community.lost.noAlertsMsg')}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={lostPets}
      keyExtractor={i => i.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <View style={[styles.lostCard, {
          backgroundColor: colors.surface,
          borderLeftColor: item.type === 'lost' ? Theme.danger : Theme.success,
        }]}>
          <View style={styles.lostHeader}>
            <View style={[styles.lostTypeBadge, { backgroundColor: item.type === 'lost' ? Theme.danger : Theme.success }]}>
              <Text style={styles.lostTypeBadgeText}>{item.type === 'lost' ? t('community.lost.lostBadge') : t('community.lost.foundBadge')}</Text>
            </View>
            <Text style={[styles.lostTime, { color: colors.text.light }]}>{timeAgo(item.createdAt)}</Text>
          </View>
          <View style={styles.lostBody}>
            {!!item.photoUri && (
              <Image source={{ uri: item.photoUri }} style={styles.lostPhoto} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.lostPetName, { color: colors.text.primary }]}>{item.petName}</Text>
              <Text style={[styles.lostSpecies, { color: colors.text.secondary }]}>{item.species}</Text>
              <Text style={[styles.lostDesc, { color: colors.text.secondary }]} numberOfLines={2}>{item.description}</Text>
              <View style={styles.lostMeta}>
                <Ionicons name="location-outline" size={13} color={colors.text.light} />
                <Text style={[styles.lostNeighborhood, { color: colors.text.light }]}>{item.neighborhood}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.contactBtn, { backgroundColor: Theme.primary + '20', borderColor: Theme.primary + '40' }]}
            onPress={() => Alert.alert(t('community.contactTitle'), item.contactInfo)}
          >
            <Ionicons name="chatbubble-outline" size={14} color={Theme.primary} />
            <Text style={[styles.contactBtnText, { color: Theme.primary }]}>{t('community.lost.viewContact')}</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

// ─── Aba: Conquistas ──────────────────────────────────────────────────────────

function AchievementsTab({ unlocked, colors }: { unlocked: Achievement[]; colors: any }) {
  const { t } = useTranslation();
  const unlockedIds = unlocked.map(a => a.id);
  const grouped = groupAchievements(unlockedIds);

  return (
    <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
      {/* Progresso total */}
      <View style={[styles.achProgressCard, { backgroundColor: colors.surface }]}>
        <View style={styles.achProgressRow}>
          <MaterialCommunityIcons name="trophy" size={22} color="#FFB800" />
          <Text style={[styles.achProgressText, { color: colors.text.primary }]}>
            {unlockedIds.length}
            <Text style={{ color: colors.text.light }}>/{ACHIEVEMENTS.length}</Text>
          </Text>
          <Text style={[styles.achProgressLabel, { color: colors.text.secondary }]}>{t('community.achievements.achievements')}</Text>
        </View>
        {/* Barra de progresso */}
        <View style={[styles.achProgressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.achProgressFill,
              {
                width: `${Math.round((unlockedIds.length / ACHIEVEMENTS.length) * 100)}%` as any,
                backgroundColor: '#FFB800',
              },
            ]}
          />
        </View>
        <Text style={[styles.achProgressPct, { color: colors.text.light }]}>
          {Math.round((unlockedIds.length / ACHIEVEMENTS.length) * 100)}{t('community.achievements.complete')}
        </Text>
      </View>

      {/* Grupos */}
      {grouped.map(({ group, achievements, unlockedCount }) => (
        <AchievementGroupSection
          key={group.id}
          group={group}
          achievements={achievements}
          unlockedCount={unlockedCount}
          unlockedAchievements={unlocked}
          defaultCollapsed={unlockedCount === 0}
        />
      ))}
    </ScrollView>
  );
}

// ─── Aba: Desafios ────────────────────────────────────────────────────────────

function ChallengesTab({ challenge, completed, completedIds, onComplete, onPostPhoto, onReportLost, colors }: {
  challenge: typeof WEEKLY_CHALLENGES[0];
  completed: boolean;
  completedIds: string[];
  onComplete: () => void;
  onPostPhoto: () => void;
  onReportLost: () => void;
  colors: any;
}) {
  const { t } = useTranslation();
  const totalDone = completedIds.length;
  const totalChallenges = WEEKLY_CHALLENGES.length;

  // Botão de ação direto conforme o tipo de desafio
  const renderActionButton = () => {
    if (completed) return null;
    const { action } = challenge;
    if (action === 'post_photo' || action === 'post_health' || action === 'post_food' || action === 'post_behavior') {
      return (
        <TouchableOpacity
          style={[styles.challengeActionBtn, { backgroundColor: Theme.primary }]}
          onPress={onPostPhoto}
        >
          <Ionicons name="camera" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.challengeActionBtnText}>{t('community.challenges.postPhoto')}</Text>
        </TouchableOpacity>
      );
    }
    if (action === 'report_lost') {
      return (
        <TouchableOpacity
          style={[styles.challengeActionBtn, { backgroundColor: Theme.danger }]}
          onPress={onReportLost}
        >
          <MaterialCommunityIcons name="map-marker-alert" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.challengeActionBtnText}>{t('community.challenges.reportLost')}</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const upcomingList = WEEKLY_CHALLENGES.filter(c => c.id !== challenge.id);

  return (
    <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>

      {/* Progresso geral */}
      <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
        <View style={styles.progressRow}>
          <View style={styles.progressTextCol}>
            <Text style={[styles.progressTitle, { color: colors.text.primary }]}>{t('community.challenges.progress')}</Text>
            <Text style={[styles.progressSub, { color: colors.text.secondary }]}>
              {t('community.challenges.progressSub', { done: totalDone, total: totalChallenges })}
            </Text>
          </View>
          <View style={[styles.progressCircle, { borderColor: Theme.primary }]}>
            <Text style={[styles.progressCircleNum, { color: Theme.primary }]}>{totalDone}</Text>
            <Text style={[styles.progressCircleTotal, { color: colors.text.light }]}>/{totalChallenges}</Text>
          </View>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, {
            backgroundColor: Theme.primary,
            width: `${Math.round((totalDone / totalChallenges) * 100)}%` as any,
          }]} />
        </View>
      </View>

      {/* Desafio da semana */}
      <View style={[styles.challengeCard, {
        backgroundColor: colors.surface,
        borderColor: challenge.color + '50',
      }]}>
        {/* Topo */}
        <View style={styles.challengeHeader}>
          <View style={[styles.challengeIconCircle, { backgroundColor: challenge.color + '20' }]}>
            <MaterialCommunityIcons name={challenge.icon as any} size={32} color={challenge.color} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[styles.weekBadge, { backgroundColor: challenge.color + '20' }]}>
              <Text style={[styles.weekBadgeText, { color: challenge.color }]}>{t('community.challenges.currentWeek')}</Text>
            </View>
            {completedIds.includes(challenge.id) && !completed && (
              <View style={[styles.doneBeforeBadge, { backgroundColor: Theme.success + '15' }]}>
                <Ionicons name="checkmark" size={10} color={Theme.success} />
                <Text style={[styles.doneBeforeText, { color: Theme.success }]}> {t('community.challenges.doneBefore')}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.challengeTitle, { color: colors.text.primary }]}>{t(`challenges.items.${challenge.id}.title`, { defaultValue: challenge.title })}</Text>
        <Text style={[styles.challengeDesc, { color: colors.text.secondary }]}>{t(`challenges.items.${challenge.id}.description`, { defaultValue: challenge.description })}</Text>

        {/* Dica de como cumprir */}
        <View style={[styles.tipBox, { backgroundColor: challenge.color + '12', borderColor: challenge.color + '30' }]}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={challenge.color} style={{ marginRight: 8, flexShrink: 0 }} />
          <Text style={[styles.tipText, { color: colors.text.secondary }]}>{t(`challenges.items.${challenge.id}.tip`, { defaultValue: challenge.tip })}</Text>
        </View>

        {completed ? (
          <View style={[styles.completedBadge, { backgroundColor: Theme.success + '20' }]}>
            <Ionicons name="checkmark-circle" size={20} color={Theme.success} />
            <Text style={[styles.completedText, { color: Theme.success }]}>{t('community.challenges.completed')}</Text>
          </View>
        ) : (
          <View>
            {renderActionButton()}
            <TouchableOpacity
              style={[styles.completeBtn, { backgroundColor: completed ? colors.border : challenge.color + 'CC' }]}
              onPress={onComplete}
            >
              <MaterialCommunityIcons name="flag-variant" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.completeBtnText}>{t('community.challenges.markDone')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Todos os desafios */}
      <Text style={[styles.sectionLabel, { color: colors.text.secondary, marginTop: 4 }]}>
        {t('community.challenges.allChallenges', { total: totalChallenges })}
      </Text>
      {upcomingList.map(c => {
        const done = completedIds.includes(c.id);
        return (
          <View key={c.id} style={[styles.upcomingChallenge, {
            backgroundColor: colors.surface,
            opacity: done ? 1 : 0.65,
          }]}>
            <View style={[styles.upcomingIcon, { backgroundColor: c.color + '20' }]}>
              <MaterialCommunityIcons name={c.icon as any} size={20} color={c.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.upcomingTitle, { color: colors.text.primary }]}>{t(`challenges.items.${c.id}.title`, { defaultValue: c.title })}</Text>
              <Text style={[styles.upcomingDesc, { color: colors.text.secondary }]} numberOfLines={1}>
                {t(`challenges.items.${c.id}.description`, { defaultValue: c.description })}
              </Text>
            </View>
            {done
              ? <Ionicons name="checkmark-circle" size={20} color={Theme.success} />
              : <MaterialCommunityIcons name="lock-outline" size={18} color={colors.text.light} />
            }
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Modal: Novo Post com Foto ────────────────────────────────────────────────

function NewPostModal({ visible, onClose, onSave, authorName, colors }: {
  visible: boolean;
  onClose: () => void;
  onSave: (post: CommunityPost) => void;
  authorName: string;
  colors: any;
}) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [petName, setPetName] = useState('');
  const [category, setCategory] = useState<CommunityPost['category']>('Geral');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const pickPhoto = async (useCamera: boolean) => {
    try {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.75 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.75 });
      if (!result.canceled) setPhotoUri(result.assets[0].uri);
    } catch { }
  };

  const showPhotoPicker = () => {
    Alert.alert(t('community.addPhotoPickTitle'), t('community.addPhotoPickMsg'), [
      { text: t('common.camera'), onPress: () => pickPhoto(true) },
      { text: t('common.gallery'), onPress: () => pickPhoto(false) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleSave = () => {
    if (!content.trim() && !photoUri) {
      Alert.alert(t('common.attention'), t('community.post.attentionMsg'));
      return;
    }
    const post: CommunityPost = {
      id: Date.now().toString(),
      authorName,
      authorInitials: getInitials(authorName),
      authorColor: getAvatarColor(authorName),
      petName: petName.trim() || undefined,
      category,
      content: content.trim(),
      photoUri: photoUri || undefined,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };
    onSave(post);
    setContent(''); setPetName(''); setCategory('Geral'); setPhotoUri(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('community.post.title')}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Seletor de Foto */}
              <TouchableOpacity
                style={[styles.photoPickerLarge, {
                  borderColor: photoUri ? 'transparent' : colors.border,
                  backgroundColor: photoUri ? 'transparent' : colors.background,
                }]}
                onPress={showPhotoPicker}
                activeOpacity={0.8}
              >
                {photoUri ? (
                  <>
                    <Image source={{ uri: photoUri }} style={styles.photoPickerLargeImg} />
                    <View style={styles.photoChangeOverlay}>
                      <Ionicons name="camera" size={22} color="#fff" />
                      <Text style={styles.photoChangeText}>{t('community.post.changePhoto')}</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.photoPickerEmpty}>
                    <View style={[styles.photoPickerIconCircle, { backgroundColor: Theme.primary + '20' }]}>
                      <Ionicons name="camera" size={32} color={Theme.primary} />
                    </View>
                    <Text style={[styles.photoPickerHint, { color: colors.text.primary }]}>
                      {t('community.post.addPhoto')}
                    </Text>
                    <Text style={[styles.photoPickerSub, { color: colors.text.light }]}>
                      {t('community.post.cameraOrGallery')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Categoria */}
              <Text style={[styles.modalLabel, { color: colors.text.secondary }]}>{t('community.post.category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {POST_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.filterChip,
                      { borderColor: colors.border, backgroundColor: colors.background },
                      category === cat && { backgroundColor: CATEGORY_COLORS[cat] + '20', borderColor: CATEGORY_COLORS[cat] },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { color: category === cat ? CATEGORY_COLORS[cat] : colors.text.secondary },
                      category === cat && { fontWeight: '700' },
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Nome do pet */}
              <Text style={[styles.modalLabel, { color: colors.text.secondary }]}>{t('community.post.petName')}</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text.primary, backgroundColor: colors.background, borderColor: colors.border }]}
                value={petName}
                onChangeText={setPetName}
                placeholder={t('community.post.petNamePlaceholder')}
                placeholderTextColor={colors.text.light}
                maxLength={30}
              />

              {/* Legenda */}
              <Text style={[styles.modalLabel, { color: colors.text.secondary }]}>{t('community.post.caption')}</Text>
              <TextInput
                style={[styles.modalTextArea, { color: colors.text.primary, backgroundColor: colors.background, borderColor: colors.border }]}
                value={content}
                onChangeText={setContent}
                placeholder={t('community.post.captionPlaceholder')}
                placeholderTextColor={colors.text.light}
                multiline
                numberOfLines={3}
                maxLength={300}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: colors.text.light }]}>{content.length}/300</Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: Theme.primary }]}
              onPress={handleSave}
            >
              <Ionicons name="paper-plane" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.modalSaveBtnText}>{t('community.post.publish')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Modal: Pet Perdido ───────────────────────────────────────────────────────

function LostPetModal({ visible, onClose, onSave, authorName, colors }: {
  visible: boolean;
  onClose: () => void;
  onSave: (lost: LostPet) => void;
  authorName: string;
  colors: any;
}) {
  const { t } = useTranslation();
  const [type, setType] = useState<'lost' | 'found'>('lost');
  const [petName, setPetName] = useState('');
  const [species, setSpecies] = useState('');
  const [description, setDescription] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const handleSave = () => {
    if (!petName.trim()) { Alert.alert(t('common.attention'), t('community.lost.attentionName')); return; }
    if (!neighborhood.trim()) { Alert.alert(t('common.attention'), t('community.lost.attentionNeighborhood')); return; }
    if (!contactInfo.trim()) { Alert.alert(t('common.attention'), t('community.lost.attentionContact')); return; }
    const lost: LostPet = {
      id: Date.now().toString(),
      type, petName: petName.trim(),
      species: species.trim() || 'Não informado',
      description: description.trim(),
      neighborhood: neighborhood.trim(),
      contactInfo: contactInfo.trim(),
      photoUri: photoUri || undefined,
      createdAt: new Date().toISOString(),
      authorName,
    };
    onSave(lost);
    setPetName(''); setSpecies(''); setDescription('');
    setNeighborhood(''); setContactInfo(''); setPhotoUri(null); setType('lost');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('community.lost.reportTitle')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.modalLabel, { color: colors.text.secondary }]}>{t('community.lost.type')}</Text>
            <View style={[styles.typeToggle, { marginBottom: 16 }]}>
              {(['lost', 'found'] as const).map(lostType => (
                <TouchableOpacity
                  key={lostType}
                  style={[
                    styles.typeBtn,
                    { borderColor: lostType === 'lost' ? Theme.danger : Theme.success },
                    type === lostType && { backgroundColor: lostType === 'lost' ? Theme.danger : Theme.success },
                  ]}
                  onPress={() => setType(lostType)}
                >
                  <Text style={[styles.typeBtnText, { color: type === lostType ? '#fff' : (lostType === 'lost' ? Theme.danger : Theme.success) }]}>
                    {lostType === 'lost' ? t('community.lost.lost') : t('community.lost.found')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.photoPickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={pickPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={24} color={colors.text.light} />
                  <Text style={[styles.photoPickerText, { color: colors.text.light }]}>Adicionar foto</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[styles.modalLabel, { color: colors.text.secondary }]}>{t('community.lost.nameOrDesc')}</Text>
            <TextInput style={[styles.modalInput, { color: colors.text.primary, backgroundColor: colors.background, borderColor: colors.border }]} value={petName} onChangeText={setPetName} placeholder={t('community.lost.nameOrDescPlaceholder')} placeholderTextColor={colors.text.light} maxLength={50} />

            <Text style={[styles.modalLabel, { color: colors.text.secondary }]}>{t('community.lost.speciesLabel')}</Text>
            <TextInput style={[styles.modalInput, { color: colors.text.primary, backgroundColor: colors.background, borderColor: colors.border }]} value={species} onChangeText={setSpecies} placeholder={t('community.lost.speciesPlaceholder')} placeholderTextColor={colors.text.light} maxLength={30} />

            <Text style={[styles.modalLabel, { color: colors.text.secondary }]}>{t('community.lost.descLabel')}</Text>
            <TextInput style={[styles.modalTextArea, { color: colors.text.primary, backgroundColor: colors.background, borderColor: colors.border }]} value={description} onChangeText={setDescription} placeholder={t('community.lost.descPlaceholder')} placeholderTextColor={colors.text.light} multiline numberOfLines={3} maxLength={300} textAlignVertical="top" />

            <Text style={[styles.modalLabel, { color: colors.text.secondary }]}>{t('community.lost.neighborhood')}</Text>
            <TextInput style={[styles.modalInput, { color: colors.text.primary, backgroundColor: colors.background, borderColor: colors.border }]} value={neighborhood} onChangeText={setNeighborhood} placeholder={t('community.lost.neighborhoodPlaceholder')} placeholderTextColor={colors.text.light} maxLength={60} />

            <Text style={[styles.modalLabel, { color: colors.text.secondary }]}>{t('community.lost.contact')}</Text>
            <TextInput style={[styles.modalInput, { color: colors.text.primary, backgroundColor: colors.background, borderColor: colors.border }]} value={contactInfo} onChangeText={setContactInfo} placeholder={t('community.lost.contactPlaceholder')} placeholderTextColor={colors.text.light} maxLength={80} />
          </ScrollView>
          <TouchableOpacity
            style={[styles.modalSaveBtn, { backgroundColor: type === 'lost' ? Theme.danger : Theme.success }]}
            onPress={handleSave}
          >
            <Ionicons name="alert-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.modalSaveBtnText}>{t('community.lost.publishAlert')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row' },
  headerActionBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  headerActionText: { color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 4 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: Theme.primary },
  tabLabel: { fontSize: 11, marginTop: 2 },
  tabBadge: {
    position: 'absolute', top: 6, right: 8,
    backgroundColor: Theme.danger, borderRadius: 8, minWidth: 16,
    height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  listContent: { padding: 16, paddingBottom: 40 },
  filterScroll: { marginBottom: 12 },
  filterChip: {
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6, marginRight: 8,
  },
  filterChipText: { fontSize: 13 },

  // Post card
  postCard: { borderRadius: 16, marginBottom: 16, overflow: 'hidden', ...Shadows.small },
  postHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  authorAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  authorInitials: { color: '#fff', fontSize: 14, fontWeight: '700' },
  authorName: { fontSize: 14, fontWeight: '700' },
  petNameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  postPetName: { fontSize: 12 },
  postMeta: { alignItems: 'flex-end' },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginBottom: 3 },
  categoryTagText: { fontSize: 10, fontWeight: '700' },
  postTime: { fontSize: 11 },
  postImage: {
    width: '100%',
    height: SCREEN_WIDTH > 500 ? 400 : SCREEN_WIDTH - 24,
  },
  postContent: { fontSize: 14, lineHeight: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  postFooter: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, marginTop: 4,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  actionCount: { fontSize: 14, fontWeight: '600', marginLeft: 4 },
  commentPreview: { flex: 1 },
  commentPreviewText: { fontSize: 13, lineHeight: 18 },

  // Full image viewer
  fullImageOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH },

  // Comments modal
  commentsBox: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', minHeight: 300,
    ...Shadows.medium,
  },
  commentsList: { maxHeight: 320, paddingHorizontal: 16, paddingTop: 8 },
  commentRow: { flexDirection: 'row', marginBottom: 12 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8, flexShrink: 0 },
  commentAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  commentBubble: { flex: 1, borderRadius: 12, padding: 10 },
  commentAuthor: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  commentText: { fontSize: 14, lineHeight: 18 },
  commentTime: { fontSize: 10, marginTop: 4 },
  commentInputRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1,
  },
  commentInput: {
    flex: 1, marginHorizontal: 8, borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, maxHeight: 80,
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  // Lost pets
  lostCard: { borderRadius: 16, marginBottom: 12, padding: 16, borderLeftWidth: 4, ...Shadows.small },
  lostHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  lostTypeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  lostTypeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  lostTime: { fontSize: 12 },
  lostBody: { flexDirection: 'row', marginBottom: 12 },
  lostPhoto: { width: 70, height: 70, borderRadius: 10, marginRight: 12 },
  lostPetName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  lostSpecies: { fontSize: 13, marginBottom: 4 },
  lostDesc: { fontSize: 13, lineHeight: 18 },
  lostMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  lostNeighborhood: { fontSize: 12, marginLeft: 3 },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 10, borderRadius: 10, borderWidth: 1,
  },
  contactBtnText: { fontSize: 13, fontWeight: '600', marginLeft: 6 },

  // Achievements
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 16 },

  // Achievement groups
  achProgressCard: {
    borderRadius: 16, padding: 16, marginBottom: 20,
    ...Shadows.small,
  },
  achProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  achProgressText: { fontSize: 28, fontWeight: '800' },
  achProgressLabel: { fontSize: 14, marginTop: 4 },
  achProgressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  achProgressFill: { height: '100%', borderRadius: 4 },
  achProgressPct: { fontSize: 12, textAlign: 'right' },
  // Challenges
  challengeCard: { borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1.5 },
  challengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  challengeIconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  weekBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  weekBadgeText: { fontSize: 12, fontWeight: '700' },
  challengeTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  challengeDesc: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12 },
  completedText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12 },
  completeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  upcomingChallenge: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 8, ...Shadows.small },
  upcomingIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  upcomingTitle: { fontSize: 14, fontWeight: '600' },
  upcomingDesc: { fontSize: 12 },

  // Empty state
  emptyTab: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptyMsg: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Modal base
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%',
    ...Shadows.medium,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  modalLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  modalInput: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 16 },
  modalTextArea: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 4, minHeight: 80 },
  charCount: { fontSize: 11, textAlign: 'right', marginBottom: 16 },
  modalSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 20, padding: 15, borderRadius: 12 },
  modalSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Photo picker — grande (no modal de novo post)
  photoPickerLarge: {
    width: '100%',
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPickerLargeImg: { width: '100%', height: '100%' },
  photoChangeOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8,
  },
  photoChangeText: { color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  photoPickerEmpty: { alignItems: 'center' },
  photoPickerIconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  photoPickerHint: { fontSize: 15, fontWeight: '600' },
  photoPickerSub: { fontSize: 12, marginTop: 4 },

  // Photo picker — pequeno (no modal de pet perdido)
  photoPickerBtn: { height: 90, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  photoPreview: { width: '100%', height: '100%', borderRadius: 10 },
  photoPickerText: { fontSize: 13, marginTop: 6 },

  // Type toggle (lost/found)
  typeToggle: { flexDirection: 'row' },
  typeBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 2, alignItems: 'center', marginRight: 8 },
  typeBtnText: { fontSize: 14, fontWeight: '700' },

  // Challenges — progress card
  progressCard: {
    borderRadius: 16, padding: 16, marginBottom: 16,
    ...Shadows.small,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  progressTextCol: { flex: 1 },
  progressTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  progressSub: { fontSize: 13 },
  progressCircle: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center',
  },
  progressCircleNum: { fontSize: 18, fontWeight: '800', lineHeight: 20 },
  progressCircleTotal: { fontSize: 11, lineHeight: 13 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  // Challenges — action buttons
  challengeActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 12, borderRadius: 12, marginTop: 12,
  },
  challengeActionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 6 },

  // Challenges — tip box
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18, marginLeft: 6 },

  // Challenges — done-before badge
  doneBeforeBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 10 },
  doneBeforeText: { fontSize: 12, fontWeight: '600' },
});
