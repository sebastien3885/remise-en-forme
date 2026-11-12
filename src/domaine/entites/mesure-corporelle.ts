/**
 * Entité Mesure corporelle (chapitre 7) : poids et tour de taille.
 *
 * Saisie hebdomadaire. L'affichage privilégie la moyenne glissante plutôt que
 * le poids du jour, et le profil permet de masquer le poids entièrement
 * (chapitre 6).
 */
import type { DateIso, HorodatageIso, Id } from './communs'

export interface MesureCorporelle {
  id: Id
  date: DateIso
  poidsKg?: number
  tourTailleCm?: number
  saisieLe: HorodatageIso
}
