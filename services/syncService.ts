import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Pet, Reminder, VaccineRecord, WeightRecord, MedicationRecord } from '../types/pet';

type EmergencyContact = {
  id: string; petId: string;
  type: 'vet' | 'clinic' | 'emergency';
  name: string; phone: string; address?: string; notes?: string;
};

// ─── Helper: verifica se usuário está logado ───────────────────────────────────

async function getUid(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ─── Mapeadores local → Supabase ──────────────────────────────────────────────

const toSupabasePet    = (uid: string, p: Pet) => ({
  id: p.id, user_id: uid, name: p.name, species: p.species, breed: p.breed,
  dob: p.dob, photo_uri: p.photoUri, food_allergies: p.foodAllergies,
  med_allergies: p.medAllergies, restrictions: p.restrictions,
  updated_at: new Date().toISOString(),
});

const toSupabaseReminder = (uid: string, r: Reminder) => ({
  id: r.id, user_id: uid, pet_id: r.petId, category: r.category,
  description: r.description, date: r.date, recurrence: r.recurrence ?? 'none',
  completed: r.completed ?? false, completed_at: r.completedAt,
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

// ─── Sync automático por operação (offline-first) ────────────────────────────
// Salva no AsyncStorage IMEDIATAMENTE, envia ao Supabase em background.
// Se não estiver logado ou sem internet, apenas salva local — sem erro.

export async function syncPets(pets: Pet[]): Promise<void> {
  await AsyncStorage.setItem('pets', JSON.stringify(pets));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('pets').upsert(pets.map(p => toSupabasePet(uid, p)), { onConflict: 'id' })
    .then(({ error }) => { if (error) console.warn('[sync] pets:', error.message); });
}

export async function syncReminders(reminders: Reminder[]): Promise<void> {
  await AsyncStorage.setItem('reminders', JSON.stringify(reminders));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('reminders').upsert(reminders.map(r => toSupabaseReminder(uid, r)), { onConflict: 'id' })
    .then(({ error }) => { if (error) console.warn('[sync] reminders:', error.message); });
}

export async function syncVaccinations(vaccinations: VaccineRecord[]): Promise<void> {
  await AsyncStorage.setItem('vaccinations', JSON.stringify(vaccinations));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('vaccinations').upsert(vaccinations.map(v => toSupabaseVaccine(uid, v)), { onConflict: 'id' })
    .then(({ error }) => { if (error) console.warn('[sync] vaccinations:', error.message); });
}

export async function syncWeightRecords(weights: WeightRecord[]): Promise<void> {
  await AsyncStorage.setItem('weightRecords', JSON.stringify(weights));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('weight_records').upsert(weights.map(w => toSupabaseWeight(uid, w)), { onConflict: 'id' })
    .then(({ error }) => { if (error) console.warn('[sync] weights:', error.message); });
}

export async function syncMedications(meds: MedicationRecord[]): Promise<void> {
  await AsyncStorage.setItem('petMedications', JSON.stringify(meds));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('pet_medications').upsert(meds.map(m => toSupabaseMed(uid, m)), { onConflict: 'id' })
    .then(({ error }) => { if (error) console.warn('[sync] medications:', error.message); });
}

export async function syncEmergencyContacts(contacts: EmergencyContact[]): Promise<void> {
  await AsyncStorage.setItem('petEmergencyContacts', JSON.stringify(contacts));
  const uid = await getUid();
  if (!uid) return;
  supabase.from('emergency_contacts').upsert(contacts.map(c => toSupabaseContact(uid, c)), { onConflict: 'id' })
    .then(({ error }) => { if (error) console.warn('[sync] contacts:', error.message); });
}

// ─── Delete remoto ────────────────────────────────────────────────────────────

export async function deleteRemote(table: string, id: string): Promise<void> {
  const uid = await getUid();
  if (!uid) return;
  supabase.from(table).delete().eq('id', id).eq('user_id', uid)
    .then(({ error }) => { if (error) console.warn(`[sync] delete ${table}:`, error.message); });
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
  ] = await Promise.all([
    supabase.from('pets').select('*'),
    supabase.from('reminders').select('*'),
    supabase.from('vaccinations').select('*'),
    supabase.from('weight_records').select('*'),
    supabase.from('pet_medications').select('*'),
    supabase.from('emergency_contacts').select('*'),
  ]);

  const mappedPets: Pet[] = (pets ?? []).map((p: any) => ({
    id: p.id, name: p.name, species: p.species, breed: p.breed, dob: p.dob,
    photoUri: p.photo_uri, foodAllergies: p.food_allergies,
    medAllergies: p.med_allergies, restrictions: p.restrictions,
  }));

  const mappedReminders: Reminder[] = (reminders ?? []).map((r: any) => ({
    id: r.id, petId: r.pet_id, category: r.category, description: r.description,
    date: r.date, recurrence: r.recurrence, completed: r.completed,
    completedAt: r.completed_at, notificationIds: [],
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

  await Promise.all([
    AsyncStorage.setItem('pets',                 JSON.stringify(mappedPets)),
    AsyncStorage.setItem('reminders',            JSON.stringify(mappedReminders)),
    AsyncStorage.setItem('vaccinations',         JSON.stringify(mappedVaccinations)),
    AsyncStorage.setItem('weightRecords',        JSON.stringify(mappedWeights)),
    AsyncStorage.setItem('petMedications',       JSON.stringify(mappedMeds)),
    AsyncStorage.setItem('petEmergencyContacts', JSON.stringify(mappedContacts)),
  ]);
}

// ─── Upload manual completo (botão "Fazer backup") ────────────────────────────

export async function uploadToSupabase(): Promise<void> {
  const uid = await getUid();
  if (!uid) throw new Error('Usuário não autenticado.');

  const [petsJ, remindersJ, vaccJ, weightJ, medsJ, contactsJ] = await Promise.all([
    AsyncStorage.getItem('pets'),
    AsyncStorage.getItem('reminders'),
    AsyncStorage.getItem('vaccinations'),
    AsyncStorage.getItem('weightRecords'),
    AsyncStorage.getItem('petMedications'),
    AsyncStorage.getItem('petEmergencyContacts'),
  ]);

  const pets: Pet[]                   = petsJ      ? JSON.parse(petsJ)      : [];
  const reminders: Reminder[]         = remindersJ ? JSON.parse(remindersJ) : [];
  const vaccinations: VaccineRecord[] = vaccJ      ? JSON.parse(vaccJ)      : [];
  const weights: WeightRecord[]       = weightJ    ? JSON.parse(weightJ)    : [];
  const meds: MedicationRecord[]      = medsJ      ? JSON.parse(medsJ)      : [];
  const contacts: EmergencyContact[]  = contactsJ  ? JSON.parse(contactsJ)  : [];

  const ops = [];
  if (pets.length)        ops.push(supabase.from('pets').upsert(pets.map(p => toSupabasePet(uid, p)), { onConflict: 'id' }));
  if (reminders.length)   ops.push(supabase.from('reminders').upsert(reminders.map(r => toSupabaseReminder(uid, r)), { onConflict: 'id' }));
  if (vaccinations.length)ops.push(supabase.from('vaccinations').upsert(vaccinations.map(v => toSupabaseVaccine(uid, v)), { onConflict: 'id' }));
  if (weights.length)     ops.push(supabase.from('weight_records').upsert(weights.map(w => toSupabaseWeight(uid, w)), { onConflict: 'id' }));
  if (meds.length)        ops.push(supabase.from('pet_medications').upsert(meds.map(m => toSupabaseMed(uid, m)), { onConflict: 'id' }));
  if (contacts.length)    ops.push(supabase.from('emergency_contacts').upsert(contacts.map(c => toSupabaseContact(uid, c)), { onConflict: 'id' }));

  const results = await Promise.all(ops);
  const failed = results.find(r => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}
