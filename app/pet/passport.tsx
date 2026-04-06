import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { requestBiometricAuth } from '../../services/biometricAuth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useGoBack } from '../../hooks/useGoBack';
import { useTranslation } from 'react-i18next';
import { Shadows } from '../../constants/Shadows';
import {
  Pet,
  VaccineRecord,
  WeightRecord,
  Reminder,
  MedicationRecord,
  DiaryEntry,
} from '../../types/pet';
import { Theme } from '../../constants/Colors';

// ─── helpers ────────────────────────────────────────────────────────────────

function calcAge(dob: string): string {
  if (!dob) return '';
  const parts = dob.split('/');
  if (parts.length !== 3) return '';
  const birth = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  const today = new Date();
  const years = today.getFullYear() - birth.getFullYear();
  const hadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  const age = hadBirthday ? years : years - 1;
  if (age <= 0) {
    const months =
      (today.getFullYear() - birth.getFullYear()) * 12 +
      (today.getMonth() - birth.getMonth());
    return months <= 1 ? '1 mês' : `${months} meses`;
  }
  return age === 1 ? '1 ano' : `${age} anos`;
}

function parseDDMMYYYY(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
  }
  return new Date(dateStr).getTime();
}

function moodEmoji(mood: DiaryEntry['mood']): string {
  switch (mood) {
    case 'great': return '😄';
    case 'good': return '🙂';
    case 'neutral': return '😐';
    case 'bad': return '😟';
    case 'sick': return '🤒';
    default: return '😐';
  }
}

function moodLabel(mood: DiaryEntry['mood']): string {
  switch (mood) {
    case 'great': return 'Ótimo';
    case 'good': return 'Bem';
    case 'neutral': return 'Normal';
    case 'bad': return 'Mal';
    case 'sick': return 'Doente';
    default: return mood;
  }
}

// ─── HTML builder ────────────────────────────────────────────────────────────

interface PassportData {
  pet: Pet;
  vaccines: VaccineRecord[];
  weights: WeightRecord[];
  reminders: Reminder[];
  medications: MedicationRecord[];
  diary: DiaryEntry[];
  generatedAt: string;
}

function buildPassportHtml(data: PassportData): string {
  const { pet, vaccines, weights, reminders, medications, diary, generatedAt } = data;
  const primary = '#40E0D0';
  const dark = '#00897B';
  const age = calcAge(pet.dob);

  // Sort reminders by date ascending, take next 5
  const upcomingReminders = [...reminders]
    .sort((a, b) => parseDDMMYYYY(a.date) - parseDDMMYYYY(b.date))
    .slice(0, 5);

  // Sort diary by date desc, take last 3
  const recentDiary = [...diary]
    .sort((a, b) => parseDDMMYYYY(b.date) - parseDDMMYYYY(a.date))
    .slice(0, 3);

  // Last weight
  const sortedWeights = [...weights].sort((a, b) => parseDDMMYYYY(b.date) - parseDDMMYYYY(a.date));
  const lastWeight = sortedWeights[0];

  // Active medications
  const activeMeds = medications.filter(m => m.active);

  const photoHtml = pet.photoUri
    ? `<img src="${pet.photoUri}" alt="${pet.name}" style="width:120px;height:120px;border-radius:60px;object-fit:cover;border:4px solid ${primary};margin-bottom:8px;" />`
    : `<div style="width:120px;height:120px;border-radius:60px;background:${primary};display:flex;align-items:center;justify-content:center;font-size:48px;color:#fff;margin:0 auto 8px;border:4px solid ${dark};line-height:120px;text-align:center;">
        ${pet.name.charAt(0).toUpperCase()}
       </div>`;

  const vaccinesRows = vaccines.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#999;padding:16px;">Nenhuma vacina registrada</td></tr>`
    : vaccines
        .sort((a, b) => parseDDMMYYYY(b.dateAdministered) - parseDDMMYYYY(a.dateAdministered))
        .map(v => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #eee;">${v.vaccineName}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${v.dateAdministered}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;color:${v.nextDueDate ? dark : '#999'};">
              ${v.nextDueDate || '—'}
            </td>
          </tr>`).join('');

  const medsRows = activeMeds.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#999;padding:16px;">Nenhum medicamento ativo</td></tr>`
    : activeMeds.map(m => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;">${m.name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${m.dosage}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${m.frequency}</td>
        </tr>`).join('');

  const remindersRows = upcomingReminders.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#999;padding:16px;">Nenhum lembrete</td></tr>`
    : upcomingReminders.map(r => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;">${r.description}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${r.category}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${r.date}</td>
        </tr>`).join('');

  const diaryRows = recentDiary.length === 0
    ? `<tr><td colspan="3" style="text-align:center;color:#999;padding:16px;">Nenhum registro no diário</td></tr>`
    : recentDiary.map(d => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${d.date}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${moodEmoji(d.mood)} ${moodLabel(d.mood)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#555;">${d.notes || '—'}</td>
        </tr>`).join('');

  const weightHtml = lastWeight
    ? `<div style="background:#e8f5f3;border-radius:12px;padding:16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:32px;">⚖️</span>
        <div>
          <p style="margin:0;font-size:22px;font-weight:700;color:${dark};">${lastWeight.weight} kg</p>
          <p style="margin:4px 0 0;font-size:13px;color:#666;">Registrado em ${lastWeight.date}</p>
          ${lastWeight.note ? `<p style="margin:4px 0 0;font-size:13px;color:#888;font-style:italic;">${lastWeight.note}</p>` : ''}
        </div>
       </div>`
    : `<p style="color:#999;text-align:center;">Nenhum peso registrado</p>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Passaporte — ${pet.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f8f9fa; color: #333; }
    .page { max-width: 800px; margin: 0 auto; padding: 0; }
    table { width: 100%; border-collapse: collapse; }
    th { background: ${primary}22; color: ${dark}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; }
    td { font-size: 14px; vertical-align: middle; }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg, ${primary} 0%, ${dark} 100%);padding:40px 32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.85);font-size:14px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">🐾 Pet Agenda</p>
    <h1 style="color:#fff;font-size:32px;font-weight:800;margin-bottom:4px;">Passaporte do Pet</h1>
    <p style="color:rgba(255,255,255,0.75);font-size:14px;">Documento de saúde e informações do animal</p>
  </div>

  <!-- PET INFO -->
  <div style="background:#fff;padding:32px;display:flex;gap:24px;align-items:center;border-bottom:3px solid ${primary};">
    <div style="text-align:center;flex-shrink:0;">
      ${photoHtml}
    </div>
    <div style="flex:1;">
      <h2 style="font-size:28px;font-weight:800;color:#222;margin-bottom:8px;">${pet.name}</h2>
      ${pet.species ? `<p style="font-size:15px;color:#555;margin-bottom:4px;">🐾 <strong>Espécie:</strong> ${pet.species}${pet.breed ? ` — ${pet.breed}` : ''}</p>` : ''}
      ${pet.dob ? `<p style="font-size:15px;color:#555;margin-bottom:4px;">🎂 <strong>Nascimento:</strong> ${pet.dob}${age ? ` (${age})` : ''}</p>` : ''}
    </div>
    <div style="background:${primary}18;border:2px solid ${primary};border-radius:12px;padding:16px 20px;text-align:center;flex-shrink:0;">
      <p style="font-size:11px;color:${dark};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Documento</p>
      <p style="font-size:13px;font-weight:700;color:#333;">PASSAPORTE</p>
      <p style="font-size:11px;color:#888;margin-top:4px;">${generatedAt}</p>
    </div>
  </div>

  <div style="padding:24px 32px;display:flex;flex-direction:column;gap:28px;">

    <!-- VACINAS -->
    <div style="background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.07);overflow:hidden;">
      <div style="background:${primary}18;padding:16px 20px;border-bottom:2px solid ${primary}33;display:flex;align-items:center;gap:10px;">
        <span style="font-size:22px;">💉</span>
        <h3 style="font-size:17px;font-weight:700;color:${dark};">Vacinas</h3>
        <span style="margin-left:auto;background:${primary};color:#fff;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700;">${vaccines.length}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Vacina</th>
            <th style="text-align:center;">Aplicação</th>
            <th style="text-align:center;">Próximo Reforço</th>
          </tr>
        </thead>
        <tbody>${vaccinesRows}</tbody>
      </table>
    </div>

    <!-- PESO -->
    <div style="background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.07);overflow:hidden;">
      <div style="background:#f3e5f5;padding:16px 20px;border-bottom:2px solid #ce93d833;display:flex;align-items:center;gap:10px;">
        <span style="font-size:22px;">⚖️</span>
        <h3 style="font-size:17px;font-weight:700;color:#7B1FA2;">Peso</h3>
        ${sortedWeights.length > 0 ? `<span style="margin-left:auto;background:#9C27B0;color:#fff;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700;">${sortedWeights.length} registros</span>` : ''}
      </div>
      <div style="padding:16px 20px;">
        ${weightHtml}
        ${sortedWeights.length > 1 ? `
        <table style="margin-top:8px;">
          <thead>
            <tr>
              <th>Data</th>
              <th style="text-align:center;">Peso (kg)</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            ${sortedWeights.slice(0, 6).map(w => `
              <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;">${w.date}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:700;color:#7B1FA2;">${w.weight}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#888;">${w.note || '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>` : ''}
      </div>
    </div>

    <!-- MEDICAMENTOS -->
    <div style="background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.07);overflow:hidden;">
      <div style="background:#fce4ec;padding:16px 20px;border-bottom:2px solid #f48fb133;display:flex;align-items:center;gap:10px;">
        <span style="font-size:22px;">💊</span>
        <h3 style="font-size:17px;font-weight:700;color:#C62828;">Medicamentos Ativos</h3>
        <span style="margin-left:auto;background:#E91E63;color:#fff;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700;">${activeMeds.length}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Medicamento</th>
            <th style="text-align:center;">Dosagem</th>
            <th style="text-align:center;">Frequência</th>
          </tr>
        </thead>
        <tbody>${medsRows}</tbody>
      </table>
    </div>

    <!-- LEMBRETES -->
    <div style="background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.07);overflow:hidden;">
      <div style="background:#e3f2fd;padding:16px 20px;border-bottom:2px solid #90caf933;display:flex;align-items:center;gap:10px;">
        <span style="font-size:22px;">📅</span>
        <h3 style="font-size:17px;font-weight:700;color:#1565C0;">Próximos Lembretes</h3>
        <span style="margin-left:auto;background:#2196F3;color:#fff;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700;">${upcomingReminders.length}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th style="text-align:center;">Categoria</th>
            <th style="text-align:center;">Data</th>
          </tr>
        </thead>
        <tbody>${remindersRows}</tbody>
      </table>
    </div>

    <!-- DIÁRIO -->
    <div style="background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.07);overflow:hidden;">
      <div style="background:#e8f5e9;padding:16px 20px;border-bottom:2px solid #a5d6a733;display:flex;align-items:center;gap:10px;">
        <span style="font-size:22px;">📓</span>
        <h3 style="font-size:17px;font-weight:700;color:#2E7D32;">Diário de Saúde</h3>
        <span style="margin-left:auto;background:#4CAF50;color:#fff;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700;">${recentDiary.length}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="text-align:center;">Data</th>
            <th style="text-align:center;">Humor</th>
            <th>Anotações</th>
          </tr>
        </thead>
        <tbody>${diaryRows}</tbody>
      </table>
    </div>

    <!-- QR CODE -->
    <div style="background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.07);overflow:hidden;">
      <div style="background:#fff8e1;padding:16px 20px;border-bottom:2px solid #ffe08233;display:flex;align-items:center;gap:10px;">
        <span style="font-size:22px;">📱</span>
        <h3 style="font-size:17px;font-weight:700;color:#F57F17;">QR Code de Identificação</h3>
      </div>
      <div style="padding:20px 24px;">
        <p style="font-size:18px;font-weight:700;color:#222;margin-bottom:6px;">${pet.name}</p>
        ${pet.species ? `<p style="font-size:14px;color:#555;margin-bottom:4px;">${pet.species}${pet.breed ? ` · ${pet.breed}` : ''}</p>` : ''}
        ${pet.dob ? `<p style="font-size:14px;color:#555;margin-bottom:4px;">Nascimento: ${pet.dob}</p>` : ''}
        <p style="font-size:12px;color:#999;margin-top:10px;font-style:italic;">Use o aplicativo Pet Agenda para escanear o QR Code de identificação.</p>
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="background:${dark};padding:20px 32px;text-align:center;margin-top:8px;">
    <p style="color:rgba(255,255,255,0.9);font-size:13px;margin-bottom:4px;">🐾 Pet Agenda — Passaporte do Pet</p>
    <p style="color:rgba(255,255,255,0.6);font-size:12px;">Gerado em ${generatedAt} · Documento de uso pessoal</p>
  </div>

</div>
</body>
</html>`;
}


// ─── Component ───────────────────────────────────────────────────────────────

export default function PetPassportScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const goBack = useGoBack('/');
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pet, setPet] = useState<Pet | null>(null);
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [diary, setDiary] = useState<DiaryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        if (!petId) return;
        setLoading(true);
        try {
          const [petsJSON, vaccJSON, weightJSON, remJSON, medJSON, diaryJSON] =
            await Promise.all([
              AsyncStorage.getItem('pets'),
              AsyncStorage.getItem('vaccinations'),
              AsyncStorage.getItem('weightRecords'),
              AsyncStorage.getItem('reminders'),
              AsyncStorage.getItem('petMedications'),
              AsyncStorage.getItem('petDiary'),
            ]);

          const allPets: Pet[] = petsJSON ? JSON.parse(petsJSON) : [];
          const foundPet = allPets.find(p => p.id === petId);
          setPet(foundPet || null);

          const allVacc: VaccineRecord[] = vaccJSON ? JSON.parse(vaccJSON) : [];
          setVaccines(allVacc.filter(v => v.petId === petId));

          const allWeights: WeightRecord[] = weightJSON ? JSON.parse(weightJSON) : [];
          setWeights(allWeights.filter(w => w.petId === petId));

          const allRem: Reminder[] = remJSON ? JSON.parse(remJSON) : [];
          setReminders(allRem.filter(r => r.petId === petId));

          const allMed: MedicationRecord[] = medJSON ? JSON.parse(medJSON) : [];
          setMedications(allMed.filter(m => m.petId === petId));

          const allDiary: DiaryEntry[] = diaryJSON ? JSON.parse(diaryJSON) : [];
          setDiary(allDiary.filter(d => d.petId === petId));
        } catch (err) {
          if (__DEV__) console.error('Erro ao carregar dados do passaporte:', err);
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [petId])
  );

  const handleExport = async () => {
    if (!pet) return;
    const authed = await requestBiometricAuth(t('passport.exportBiometricPrompt'));
    if (!authed) return;
    setExporting(true);
    try {
      const now = new Date();
      const generatedAt = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

      const html = buildPassportHtml({ pet, vaccines, weights, reminders, medications, diary, generatedAt });

      if (Platform.OS === 'web') {
        // On web, open in new tab
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setExporting(false);
        return;
      }

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${t('passport.title')} — ${pet.name}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(t('common.error'), t('passport.shareError'));
      }
    } catch (err) {
      if (__DEV__) console.error('Erro ao exportar passaporte:', err);
      Alert.alert(t('common.error'), t('passport.shareError'));
    } finally {
      setExporting(false);
    }
  };

  // ── Sorted display data ──────────────────────────────────────────────────
  const sortedVaccines = [...vaccines].sort((a, b) => parseDDMMYYYY(b.dateAdministered) - parseDDMMYYYY(a.dateAdministered));

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Theme.primary} />
      </SafeAreaView>
    );
  }

  if (!pet) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text.primary }]}>{t('petDetail.petNotFound')}</Text>
      </SafeAreaView>
    );
  }

  const getVaccineStatus = (v: VaccineRecord): { label: string; color: string } => {
    if (!v.nextDueDate) return { label: 'Em dia', color: '#4CAF50' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = parseDDMMYYYY(v.nextDueDate);
    if (due < today.getTime()) return { label: 'Vencida', color: '#FF9800' };
    return { label: 'Em dia', color: '#4CAF50' };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Passaporte</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting
            ? <ActivityIndicator size="small" color={Theme.primary} />
            : <Ionicons name="share-outline" size={22} color={Theme.primary} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Pet Card */}
        <View style={[styles.petCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.petCardTop}>
            <View style={[styles.petAvatarCircle, { backgroundColor: Theme.primary + '20' }]}>
              {pet.photoUri
                ? <Image source={{ uri: pet.photoUri }} style={styles.petAvatarImg} />
                : <Ionicons name="paw" size={28} color={Theme.primary} />
              }
            </View>
            <View style={styles.petCardInfo}>
              <Text style={[styles.petCardName, { color: colors.text.primary }]}>{pet.name}</Text>
              {!!(pet.breed || pet.species) && (
                <Text style={[styles.petCardBreed, { color: colors.text.secondary }]}>
                  {[pet.breed, pet.species].filter(Boolean).join(' · ')}
                </Text>
              )}

            </View>
          </View>

          {/* Info row */}
          <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
            {[
              { label: 'Espécie', value: pet.species || '—' },
              { label: 'Sexo', value: pet.gender || '—' },
              { label: 'Nascimento', value: pet.dob || '—' },
              { label: 'Microchip', value: pet.microchip || '—' },
            ].map((item, i, arr) => (
              <View
                key={item.label}
                style={[
                  styles.infoCell,
                  i < arr.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border },
                ]}
              >
                <Text style={[styles.infoCellLabel, { color: colors.text.secondary }]}>{item.label}</Text>
                <Text style={[styles.infoCellValue, { color: colors.text.primary }]} numberOfLines={1}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Vacinas */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Vacinas</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: Theme.primary + '18', borderColor: Theme.primary + '40' }]}
              onPress={() => router.push({ pathname: '/vaccines/new', params: { petId } })}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color={Theme.primary} />
              <Text style={[styles.addBtnText, { color: Theme.primary }]}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {sortedVaccines.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.text.light }]}>Nenhuma vacina registrada</Text>
          ) : (
            sortedVaccines.map((v, i) => {
              const status = getVaccineStatus(v);
              return (
                <View
                  key={v.id}
                  style={[
                    styles.vaccineRow,
                    { borderBottomColor: colors.border },
                    i === sortedVaccines.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={[styles.vaccineIconCircle, { backgroundColor: status.color + '18' }]}>
                    <Ionicons name="checkmark-circle" size={20} color={status.color} />
                  </View>
                  <View style={styles.vaccineInfo}>
                    <Text style={[styles.vaccineName, { color: colors.text.primary }]}>{v.vaccineName}</Text>
                    <Text style={[styles.vaccineDate, { color: colors.text.secondary }]}>
                      Aplicada em {v.dateAdministered}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '18' }]}>
                    <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}


// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, textAlign: 'center', marginTop: 50 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },

  scrollContent: { padding: 16, gap: 16 },

  // Pet card
  petCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  petCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  petAvatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  petAvatarImg: { width: 56, height: 56, borderRadius: 28 },
  petCardInfo: { flex: 1 },
  petCardName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  petCardBreed: { fontSize: 13, marginBottom: 4 },
  petCardId: { fontSize: 12, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  infoCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  infoCellLabel: { fontSize: 10, marginBottom: 3 },
  infoCellValue: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  // Section
  section: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  addBtnText: { fontSize: 13, fontWeight: '600' },
  emptyText: { textAlign: 'center', paddingVertical: 20, fontSize: 14, paddingHorizontal: 16 },

  // Vaccine rows
  vaccineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  vaccineIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaccineInfo: { flex: 1 },
  vaccineName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  vaccineDate: { fontSize: 12 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  // Cover card (kept for PDF compat)
  coverCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 4,
  },
  coverApp: { color: 'rgba(255,255,255,0.8)', fontSize: 13, letterSpacing: 1.5, marginBottom: 4 },
  coverTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 20 },
  coverAvatarContainer: { marginBottom: 14 },
  coverAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  coverAvatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverInitial: { color: '#fff', fontSize: 42, fontWeight: '800' },
  coverPetName: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 6 },
  coverSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 2 },

  // Section card
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#00000010',
  },
  cardIcon: { fontSize: 20 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700' },
  cardBody: { padding: 8 },

  // List rows
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  listRowMain: { flex: 1 },
  listRowTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  listRowSub: { fontSize: 13 },
  listRowBooster: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  // Weight
  weightHighlight: {
    borderRadius: 12,
    padding: 14,
    margin: 8,
  },
  weightValue: { fontSize: 28, fontWeight: '800' },
  weightDate: { fontSize: 13, marginTop: 2 },
  weightNote: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  weightHistory: { fontSize: 12, textAlign: 'center', paddingBottom: 8 },

  // Diary
  diaryMoodEmoji: { fontSize: 24 },

  // Empty
  emptyRowText: { textAlign: 'center', paddingVertical: 20, fontSize: 14 },

  // QR Code
  qrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 16,
  },
  qrImage: {
    width: 110,
    height: 110,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  qrInfo: { flex: 1 },
  qrPetName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  qrSub: { fontSize: 13, marginBottom: 2 },
  qrHint: { fontSize: 11, marginTop: 8, fontStyle: 'italic' },

  // Export button
  exportBtn: {
    backgroundColor: Theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    marginTop: 8,
    ...Shadows.primary,
  },
  exportBtnDisabled: { opacity: 0.7 },
  exportBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
