export type Pet = {
  id: string
  name: string
  species: string
  breed: string
  dob: string
}

export type Reminder = {
  id: string
  petId: string // Para saber a qual pet este lembrete pertence
  category: "Saúde" | "Higiene" | "Consulta" | "Outro"
  description: string
  date: string // Vamos guardar a data como texto por enquanto
}
export type VaccineRecord = {
  id: string
  petId: string // Para vincular ao pet correto
  vaccineName: string // Ex: "Raiva", "V10", "Quíntupla Felina"
  dateAdministered: string // Data da aplicação
  nextDueDate?: string // Data do próximo reforço (opcional)
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
