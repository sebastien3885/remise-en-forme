/**
 * Mise en mots d'une mesure.
 *
 * Vit dans le domaine, pas dans l'interface, parce que **trois endroits** s'en
 * servent : les écrans, l'export CSV et les explications du moteur. Une
 * deuxième implémentation quelque part et le CSV finirait par dire autre
 * chose que l'écran.
 *
 * Une cible comme `{ series: 2, repetitions: 10, reposSecondes: 60 }` se lit
 * « 2 × 10, repos 60 s » et pas comme une liste de champs.
 */
import type { Mesures } from './entites'

function pluriel(nombre: number, singulier: string): string {
  return String(nombre) + ' ' + singulier + (nombre > 1 ? 's' : '')
}

export function formaterMesures(mesures: Mesures): string {
  const morceaux: string[] = []

  if (mesures.dureeMinutes !== undefined) {
    morceaux.push(String(mesures.dureeMinutes) + ' min')
  }
  if (mesures.distanceMetres !== undefined) {
    morceaux.push(String(mesures.distanceMetres) + ' m')
  }
  if (mesures.longueurs !== undefined) {
    morceaux.push(pluriel(mesures.longueurs, 'longueur'))
  }

  // Les séries ne s'affichent jamais seules : elles multiplient ce qui suit.
  if (mesures.repetitions !== undefined) {
    morceaux.push(
      mesures.series !== undefined
        ? String(mesures.series) + ' × ' + String(mesures.repetitions)
        : String(mesures.repetitions) + ' rép.',
    )
  } else if (mesures.maintienSecondes !== undefined) {
    morceaux.push(
      mesures.series !== undefined
        ? String(mesures.series) + ' × ' + String(mesures.maintienSecondes) + ' s'
        : String(mesures.maintienSecondes) + ' s',
    )
  } else if (mesures.series !== undefined) {
    morceaux.push(pluriel(mesures.series, 'série'))
  }

  if (mesures.maintienSecondes !== undefined && mesures.repetitions !== undefined) {
    morceaux.push('tenue ' + String(mesures.maintienSecondes) + ' s')
  }
  if (mesures.reposSecondes !== undefined && mesures.reposSecondes > 0) {
    morceaux.push('repos ' + String(mesures.reposSecondes) + ' s')
  }

  return morceaux.join(', ')
}
