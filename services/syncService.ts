import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { secureSet, secureGet } from './secureStorage';
import {
  Pet, Reminder, VaccineRecord, WeightRecord, MedicationRecord,
  DiaryEntry, PetDocument, PetPhoto, FeedingRecord, UserProfile,
  EmergencyContact,
} from '../types/pet';

// ─── Helper: verifica se usuário está logado ───────────────────────────────────

async function getUid(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ─── Mapeadores local → Supabase ──────────────────────────────────────────────

const toSupabasePet = (uid: string, p: Pet) => ({
  id: p.id, user_id: uid, name: p.name, species: p.species, breed: p.breed,
  dob: p.dob, photo_uri: p.photoUri, food_allergies: p.foodAllergies,
  med_allergies: p.medAllergies, restrictions: p.restrictions,
  gender: p.gender, castrated: p.castrated ?? false, microchip: p.microchip,
  weight: p.weight ?? null,
  is_memorial: p.isMemorial ?? false,
  memorial_date: p.memorialDate ?? null,
  updated_at: new Date().toISOString(),
});

const toSupabaseReminder = (uid: string, r: Reminder) => ({
  id: r.id, user_id: uid, pet_id: r.petId, category: r.category,
  description: r.description, date: r.date, recurrence: r.recurrence ?? 'none',
  completed: r.completed ?? false, completed_at: r.completedAt,
  time: r.time ?? null,
  notes: r.notes ?? null,
  medication_dose: r.medicationDose ?? null,
  medication_interval: r.medicationInterval ?? null,
});

const toSupabaseVaccine = (uid: string, v: VaccineRecord) => ({
  id: v.id, user_id: uid, pet_id: v.petId, vaccine_name: v.vaccineName,
  date_administered: v.dateAdministered, next_due_date: v.nextDueDate,
});

const toSupabaseWeight = (uid: string, w: WeightRecord) => ({
  id: w.id, user_id: uid, pet_id: w.petId,
  weight: w.weight, date: w.date, note: w.note,
});

const toSupabaseMed = (uid: string, m: MedicationRecord) => ({
  id: m.id, user_id: uid, pet_id: m.petId, name: m.name, dosage: m.dosage,
  frequency: m.frequency, start_date: m.startDate, end_date: m.endDate,
  vet: m.vet, note: m.note, active: m.active,
});

const toSupabaseContact = (uid: string, c: EmergencyContact) => ({
  id: c.id, user_id: uid, pet_id: c.petId, type: c.type,
  name: c.name, phone: c.phone, address: c.address, notes: c.notes,
});

const toSupabaseDiary = (uid: string, d: DiaryEntry) => ({
  id: d.id, user_id: uid, pet_id: d.petId,
  date: d.date, mood: d.mood, notes: d.notes,
});

const toSupabaseDocument = (uid: string, d: PetDocument) => ({
  id: d.id, user_id: uid, pet_id: d.petId,
  title: d.title, type: d.type, photo_uri: d.photoUri, date: d.date, note: d.note,
});

const toSupabasePhoto = (uid: string, p: PetPhoto) => ({
  id: p.id, user_id: uid, pet_id: p.petId,
  uri: p.uri, date: p.date, caption: p.caption,
});

const toSupabaseFeeding = (uid: string, f: FeedingRecord) => ({
  id: f.id, user_id: uid, pet_id: f.petId,
  brand: f.brand, daily_amount: f.dailyAmount,
  last_refill_date: f.lastRefillDate, note: f.note,
});

const toSupabaseProfile = (uid: string, p: UserProfile) => ({
  user_id:      uid,
  name:         p.name,
  bio:          p.bio,
  avatar_url:   p.avatarUrl,
  phone:        p.phone ?? null,
  city:         p.city ?? null,
  country:      p.country ?? null,
  country_code: p.countryCode ?? null,
  // Campos Brasil — null quando não-BR (limpa valores antigos no Supabase)
  state:        p.state ?? null,
  cep:          p.cep ?? null,
  // Campos internacionais — null quando BR (limpa valores antigos no Supabase)
  region:       p.region ?? null,
  postal_code:  p.postalCode ?? null,
  birth_date:   p.birthDate ?? null,
  experience:   p.experience ?? null,
  platform:     Platform.OS,
  updated_at:   new Date().toISOString(),
});

// ─── Sync automático por operação (offline-first) ────────────────────────────
// Salva no AsyncStorage IMEDIATAMENTE, envia ao Supabase em background.
// Se não estiver logado ou sem internet, apenas salva local — sem erro.

export async function syncPets(pets: Pet[]): Promise<void> {
  await AsyncStorage.setItem('pets', JSON.stringify(pets));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('pets').upsert(pets.map(p => toSupabasePet(uid, p)), { onConflict: 'id' })
    .then(({ error }) => { if (error) if (__DEV__) console.warn('[sync] pets:', error.message); });
}

export async function syncReminders(reminders: Reminder[]): Promise<void> {
  await AsyncStorage.setItem('reminders', JSON.stringify(reminders));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('reminders').upsert(reminders.map(r => toSupabaseReminder(uid, r)), { onConflict: 'id' })
    .then(({ error }) => { if (error) if (__DEV__) console.warn('[sync] reminders:', error.message); });
}

export async function syncVaccinations(vaccinations: VaccineRecord[]): Promise<void> {
  await AsyncStorage.setItem('vaccinations', JSON.stringify(vaccinations));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('vaccinations').upsert(vaccinations.map(v => toSupabaseVaccine(uid, v)), { onConflict: 'id' })
    .then(({ error }) => { if (error) if (__DEV__) console.warn('[sync] vaccinations:', error.message); });
}

export async function syncWeightRecords(weights: WeightRecord[]): Promise<void> {
  await AsyncStorage.setItem('weightRecords', JSON.stringify(weights));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('weight_records').upsert(weights.map(w => toSupabaseWeight(uid, w)), { onConflict: 'id' })
    .then(({ error }) => { if (error) if (__DEV__) console.warn('[sync] weights:', error.message); });
}

export async function syncMedications(meds: MedicationRecord[]): Promise<void> {
  await AsyncStorage.setItem('petMedications', JSON.stringify(meds));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('pet_medications').upsert(meds.map(m => toSupabaseMed(uid, m)), { onConflict: 'id' })
    .then(({ error }) => { if (error) if (__DEV__) console.warn('[sync] medications:', error.message); });
}

export async function syncEmergencyContacts(contacts: EmergencyContact[]): Promise<void> {
  await secureSet('petEmergencyContacts', JSON.stringify(contacts));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('emergency_contacts').upsert(contacts.map(c => toSupabaseContact(uid, c)), { onConflict: 'id' })
    .then(({ error }) => { if (error) if (__DEV__) console.warn('[sync] contacts:', error.message); });
}

export async function syncDiaryEntries(entries: DiaryEntry[]): Promise<void> {
  await AsyncStorage.setItem('diaryEntries', JSON.stringify(entries));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('pet_diary').upsert(entries.map(d => toSupabaseDiary(uid, d)), { onConflict: 'id' })
    .then(({ error }) => { if (error) if (__DEV__) console.warn('[sync] diary:', error.message); });
}

export async function syncPetDocuments(docs: PetDocument[]): Promise<void> {
  await AsyncStorage.setItem('petDocuments', JSON.stringify(docs));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('pet_documents').upsert(docs.map(d => toSupabaseDocument(uid, d)), { onConflict: 'id' })
    .then(({ error }) => { if (error) if (__DEV__) console.warn('[sync] documents:', error.message); });
}

export async function syncPetPhotos(photos: PetPhoto[]): Promise<void> {
  await AsyncStorage.setItem('petPhotos', JSON.stringify(photos));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('pet_photos').upsert(photos.map(p => toSupabasePhoto(uid, p)), { onConflict: 'id' })
    .then(({ error }) => { if (error) if (__DEV__) console.warn('[sync] photos:', error.message); });
}

export async function syncFeedingRecords(feedings: FeedingRecord[]): Promise<void> {
  await AsyncStorage.setItem('feedingRecords', JSON.stringify(feedings));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('pet_feedings').upsert(feedings.map(f => toSupabaseFeeding(uid, f)), { onConflict: 'id' })
    .then(({ error }) => { if (error) if (__DEV__) console.warn('[sync] feedings:', error.message); });
}

export async function syncUserProfile(profile: UserProfile): Promise<void> {
  await secureSet('userProfile', JSON.stringify(profile));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('user_profiles').upsert(toSupabaseProfile(uid, profile), { onConflict: 'user_id' })
    .then(({ error }) => { if (error) if (__DEV__) console.warn('[sync] profile:', error.message); });
}

// ─── Delete remoto ────────────────────────────────────────────────────────────

export async function deleteRemote(table: string, id: string): Promise<void> {
  const uid = await getUid();
  if (!uid) return;
  supabase.from(table).delete().eq('id', id).eq('user_id', uid)
    .then(({ error }) => { if (error) if (__DEV__) console.warn(`[sync] delete ${table}:`, error.message); });
}

// ─── Conquistas ───────────────────────────────────────────────────────────────

export async function syncAchievements(achievements: { id: string; unlockedAt: string }[]): Promise<void> {
  await AsyncStorage.setItem('achievements', JSON.stringify(achievements));
  const uid = await getUid();
  if (!uid) return;
  if (achievements.length === 0) return;
  supabase.from('user_achievements').upsert(
    achievements.map(a => ({
      user_id:        uid,
      achievement_id: a.id,
      unlocked_at:    a.unlockedAt,
    })),
    { onConflict: 'user_id,achievement_id' }
  ).then(({ error }) => { if (error) if (__DEV__) console.warn('[sync] achievements:', error.message); });
}

// ─── Registro de motivo de exclusão ──────────────────────────────────────────

export async function recordDeletion(params: {
  petId: string;
  petName: string;
  petSpecies: string;
  reason: string;
  isMemorial: boolean;
}): Promise<void> {
  const uid = await getUid();
  if (!uid) return;
  supabase.from('pet_deletions').insert({
    user_id:    uid,
    pet_id:     params.petId,
    pet_name:   params.petName,
    pet_species: params.petSpecies,
    reason:     params.reason,
    is_memorial: params.isMemorial,
  }).then(({ error }) => {
    if (error) if (__DEV__) console.warn('[sync] recordDeletion:', error.message);
  });
}

// ─── Download na abertura do app (Supabase → local) ──────────────────────────

export async function downloadFromSupabase(): Promise<void> {
  const uid = await getUid();
  if (!uid) return;

  const [
    { data: pets },
    { data: reminders },
    { data: vaccinations },
    { data: weights },
    { data: meds },
    { data: contacts },
    { data: diary },
    { data: documents },
    { data: photos },
    { data: feedings },
    { data: profile },
    { data: achievementsRemote },
  ] = await Promise.all([
    supabase.from('pets').select('*'),
    supabase.from('reminders').select('*'),
    supabase.from('vaccinations').select('*'),
    supabase.from('weight_records').select('*'),
    supabase.from('pet_medications').select('*'),
    supabase.from('emergency_contacts').select('*'),
    supabase.from('pet_diary').select('*'),
    supabase.from('pet_documents').select('*'),
    supabase.from('pet_photos').select('*'),
    supabase.from('pet_feedings').select('*'),
    supabase.from('user_profiles').select('*').eq('user_id', uid).single(),
    supabase.from('user_achievements').select('achievement_id, unlocked_at'),
  ]);

  const mappedPets: Pet[] = (pets ?? []).map((p: any) => ({
    id: p.id, name: p.name, species: p.species, breed: p.breed, dob: p.dob,
    photoUri: p.photo_uri, foodAllergies: p.food_allergies,
    medAllergies: p.med_allergies, restrictions: p.restrictions,
    gender: p.gender, castrated: p.castrated, microchip: p.microchip,
    weight: p.weight ?? undefined,
    isMemorial: p.is_memorial ?? false,
    memorialDate: p.memorial_date ?? undefined,
  }));

  const mappedReminders: Reminder[] = (reminders ?? []).map((r: any) => ({
    id: r.id, petId: r.pet_id, category: r.category, description: r.description,
    date: r.date, recurrence: r.recurrence, completed: r.completed,
    completedAt: r.completed_at, notificationIds: [],
    time: r.time ?? undefined,
    notes: r.notes ?? undefined,
    medicationDose: r.medication_dose ?? undefined,
    medicationInterval: r.medication_interval ?? undefined,
  }));

  const mappedVaccinations: VaccineRecord[] = (vaccinations ?? []).map((v: any) => ({
    id: v.id, petId: v.pet_id, vaccineName: v.vaccine_name,
    dateAdministered: v.date_administered, nextDueDate: v.next_due_date,
    notificationIds: [],
  }));

  const mappedWeights: WeightRecord[] = (weights ?? []).map((w: any) => ({
    id: w.id, petId: w.pet_id, weight: w.weight, date: w.date, note: w.note,
  }));

  const mappedMeds: MedicationRecord[] = (meds ?? []).map((m: any) => ({
    id: m.id, petId: m.pet_id, name: m.name, dosage: m.dosage,
    frequency: m.frequency, startDate: m.start_date, endDate: m.end_date,
    vet: m.vet, note: m.note, active: m.active,
  }));

  const mappedContacts: EmergencyContact[] = (contacts ?? []).map((c: any) => ({
    id: c.id, petId: c.pet_id, type: c.type, name: c.name,
    phone: c.phone, address: c.address, notes: c.notes,
  }));

  const mappedDiary: DiaryEntry[] = (diary ?? []).map((d: any) => ({
    id: d.id, petId: d.pet_id, date: d.date, mood: d.mood,
    notes: d.notes, createdAt: d.created_at,
  }));

  const mappedDocuments: PetDocument[] = (documents ?? []).map((d: any) => ({
    id: d.id, petId: d.pet_id, title: d.title, type: d.type,
    photoUri: d.photo_uri, date: d.date, note: d.note,
  }));

  const mappedPhotos: PetPhoto[] = (photos ?? []).map((p: any) => ({
    id: p.id, petId: p.pet_id, uri: p.uri, date: p.date,
    caption: p.caption, createdAt: p.created_at,
  }));

  const mappedFeedings: FeedingRecord[] = (feedings ?? []).map((f: any) => ({
    id: f.id, petId: f.pet_id, brand: f.brand, dailyAmount: f.daily_amount,
    lastRefillDate: f.last_refill_date, note: f.note, createdAt: f.created_at,
  }));

  const mappedAchievements = (achievementsRemote ?? []).map((a: any) => ({
    id: a.achievement_id,
    unlockedAt: a.unlocked_at,
  }));

  const saves: Promise<void>[] = [
    AsyncStorage.setItem('pets',                 JSON.stringify(mappedPets)),
    AsyncStorage.setItem('reminders',            JSON.stringify(mappedReminders)),
    AsyncStorage.setItem('vaccinations',         JSON.stringify(mappedVaccinations)),
    AsyncStorage.setItem('weightRecords',        JSON.stringify(mappedWeights)),
    AsyncStorage.setItem('petMedications',       JSON.stringify(mappedMeds)),
    secureSet('petEmergencyContacts', JSON.stringify(mappedContacts)),
    AsyncStorage.setItem('diaryEntries',         JSON.stringify(mappedDiary)),
    AsyncStorage.setItem('petDocuments',         JSON.stringify(mappedDocuments)),
    AsyncStorage.setItem('petPhotos',            JSON.stringify(mappedPhotos)),
    AsyncStorage.setItem('feedingRecords',       JSON.stringify(mappedFeedings)),
    AsyncStorage.setItem('achievements',         JSON.stringify(mappedAchievements)),
  ];

  if (profile) {
    const mappedProfile: UserProfile = {
      name: profile.name, bio: profile.bio, avatarUrl: profile.avatar_url,
      phone: profile.phone, city: profile.city, state: profile.state,
      cep: profile.cep, birthDate: profile.birth_date, experience: profile.experience,
    };
    saves.push(secureSet('userProfile', JSON.stringify(mappedProfile)));
  }

  await Promise.all(saves);
}

// ─── Upload manual completo (botão "Fazer backup") ────────────────────────────

export async function uploadToSupabase(): Promise<void> {
  const uid = await getUid();
  if (!uid) throw new Error('Usuário não autenticado.');

  const [
    petsJ, remindersJ, vaccJ, weightJ, medsJ, contactsJ,
    diaryJ, docsJ, photosJ, feedingsJ, profileJ,
  ] = await Promise.all([
    AsyncStorage.getItem('pets'),
    AsyncStorage.getItem('reminders'),
    AsyncStorage.getItem('vaccinations'),
    AsyncStorage.getItem('weightRecords'),
    AsyncStorage.getItem('petMedications'),
    secureGet('petEmergencyContacts'),
    AsyncStorage.getItem('diaryEntries'),
    AsyncStorage.getItem('petDocuments'),
    AsyncStorage.getItem('petPhotos'),
    AsyncStorage.getItem('feedingRecords'),
    secureGet('userProfile'),
  ]);

  const pets: Pet[]                   = petsJ      ? JSON.parse(petsJ)      : [];
  const reminders: Reminder[]         = remindersJ ? JSON.parse(remindersJ) : [];
  const vaccinations: VaccineRecord[] = vaccJ      ? JSON.parse(vaccJ)      : [];
  const weights: WeightRecord[]       = weightJ    ? JSON.parse(weightJ)    : [];
  const meds: MedicationRecord[]      = medsJ      ? JSON.parse(medsJ)      : [];
  const contacts: EmergencyContact[]  = contactsJ  ? JSON.parse(contactsJ)  : [];
  const diary: DiaryEntry[]           = diaryJ     ? JSON.parse(diaryJ)     : [];
  const docs: PetDocument[]           = docsJ      ? JSON.parse(docsJ)      : [];
  const photos: PetPhoto[]            = photosJ    ? JSON.parse(photosJ)    : [];
  const feedings: FeedingRecord[]     = feedingsJ  ? JSON.parse(feedingsJ)  : [];
  const profile: UserProfile | null   = profileJ   ? JSON.parse(profileJ)   : null;

  const ops = [];
  if (pets.length)        ops.push(supabase.from('pets').upsert(pets.map(p => toSupabasePet(uid, p)), { onConflict: 'id' }));
  if (reminders.length)   ops.push(supabase.from('reminders').upsert(reminders.map(r => toSupabaseReminder(uid, r)), { onConflict: 'id' }));
  if (vaccinations.length)ops.push(supabase.from('vaccinations').upsert(vaccinations.map(v => toSupabaseVaccine(uid, v)), { onConflict: 'id' }));
  if (weights.length)     ops.push(supabase.from('weight_records').upsert(weights.map(w => toSupabaseWeight(uid, w)), { onConflict: 'id' }));
  if (meds.length)        ops.push(supabase.from('pet_medications').upsert(meds.map(m => toSupabaseMed(uid, m)), { onConflict: 'id' }));
  if (contacts.length)    ops.push(supabase.from('emergency_contacts').upsert(contacts.map(c => toSupabaseContact(uid, c)), { onConflict: 'id' }));
  if (diary.length)       ops.push(supabase.from('pet_diary').upsert(diary.map(d => toSupabaseDiary(uid, d)), { onConflict: 'id' }));
  if (docs.length)        ops.push(supabase.from('pet_documents').upsert(docs.map(d => toSupabaseDocument(uid, d)), { onConflict: 'id' }));
  if (photos.length)      ops.push(supabase.from('pet_photos').upsert(photos.map(p => toSupabasePhoto(uid, p)), { onConflict: 'id' }));
  if (feedings.length)    ops.push(supabase.from('pet_feedings').upsert(feedings.map(f => toSupabaseFeeding(uid, f)), { onConflict: 'id' }));
  if (profile)            ops.push(supabase.from('user_profiles').upsert(toSupabaseProfile(uid, profile), { onConflict: 'user_id' }));

  const results = await Promise.all(ops);
  const failed = results.find(r => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}
