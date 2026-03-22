export type RecurrenceType = 'none' | 'weekly' | 'monthly' | 'quarterly'

export type Pet = {
  id: string
  name: string
  species: string
  breed: string
  dob: string
  photoUri?: string // URI da foto do pet
  foodAllergies?: string[]   // Alergias alimentares
  medAllergies?: string[]    // Alergias a medicamentos
  restrictions?: string      // Restrições/observações adicionais
}

export type Reminder = {
  id: string
  petId: string // Para saber a qual pet este lembrete pertence
  category: "Saúde" | "Higiene" | "Consulta" | "Prevenção" | "Outro"
  description: string
  date: string // Vamos guardar a data como texto por enquanto
  notificationIds?: string[] // IDs das notificações agendadas
  recurrence?: RecurrenceType
  completed?: boolean
  completedAt?: string // ISO string
}
export type VaccineRecord = {
  id: string
  petId: string // Para vincular ao pet correto
  vaccineName: string // Ex: "Raiva", "V10", "Quíntupla Felina"
  dateAdministered: string // Data da aplicação
  nextDueDate?: string // Data do próximo reforço (opcional)
  notificationIds?: string[] // IDs das notificações agendadas
}
export type UserProfile = {
  name: string
  bio: string
  avatarUrl?: string // URL da foto (opcional por agora)
}

export type Friend = {
  id: string
  name: string
  avatarUrl?: string
}

export type CommunityPost = {
  id: string
  authorName: string
  authorInitials: string
  authorColor: string
  petName?: string
  category: 'Saúde' | 'Alimentação' | 'Comportamento' | 'Raças' | 'Geral' | 'Higiene'
  content: string
  photoUri?: string // URI da foto do post
  likes: string[] // array de IDs locais (para simular likes únicos)
  comments: PostComment[] // comentários
  createdAt: string // ISO string
}

export type PostComment = {
  id: string
  authorName: string
  authorInitials: string
  authorColor: string
  text: string
  createdAt: string
}

export type LostPet = {
  id: string
  type: 'lost' | 'found'
  petName: string
  species: string
  description: string
  neighborhood: string
  contactInfo: string
  photoUri?: string
  createdAt: string
  authorName: string
}

export type Achievement = {
  id: string
  unlockedAt: string // ISO string
}

export type WeeklyChallenge = {
  id: string
  week: string // formato YYYY-WW
  completed: boolean
  completedAt?: string
}

export type WeightRecord = {
  id: string
  petId: string
  weight: number   // kg, aceita decimais (ex: 4.5)
  date: string     // DD/MM/YYYY
  note?: string
}

export type MedicationRecord = {
  id: string
  petId: string
  name: string          // Nome do medicamento
  dosage: string        // Ex: "2 comprimidos"
  frequency: string     // Ex: "2x ao dia"
  startDate: string     // DD/MM/YYYY
  endDate?: string      // DD/MM/YYYY (opcional - tratamento contínuo não tem)
  vet?: string          // Nome do veterinário
  note?: string
  active: boolean       // Tratamento ativo ou concluído
}

export type DiaryEntry = {
  id: string
  petId: string
  date: string // DD/MM/YYYY
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'sick'
  notes: string
  createdAt: string // ISO string
}

export type PetDocument = {
  id: string
  petId: string
  title: string
  type: 'vaccine_card' | 'prescription' | 'exam' | 'rga' | 'other'
  photoUri: string
  date: string // DD/MM/YYYY
  note?: string
}

export type PetPhoto = {
  id: string
  petId: string
  uri: string
  date: string      // DD/MM/YYYY
  caption?: string
  createdAt: string // ISO string
}

export type FeedingRecord = {
  id: string
  petId: string
  brand: string        // Marca da ração
  dailyAmount: string  // Ex: "200g", "1 xícara"
  lastRefillDate: string // DD/MM/YYYY
  note?: string
  createdAt: string
}

export type EmergencyContact = {
  id: string
  petId: string
  type: 'vet' | 'clinic' | 'emergency'
  name: string
  phone: string
  address?: string
  notes?: string
}
