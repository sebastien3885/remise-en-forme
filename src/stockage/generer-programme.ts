/**
 * Génère le programme initial à partir de ce qui est en base, et l'installe.
 *
 * Le chapitre 8 veut que le premier lancement se termine par une validation de
 * l'utilisateur : c'est lui qui déclenche cet appel depuis les réglages, rien
 * ne se génère tout seul.
 */
import {
  genererProgrammeInitial,
  type ProgrammeGenere,
} from '../domaine/programme/generateur'
import { db, type BaseForme } from './db'
import { installerProgramme } from './installer-programme'
import { creerDepots, type Depots } from './index'

export interface OptionsGenerationEnBase {
  base?: BaseForme
  depots?: Depots
  nombreSemaines?: number
  maintenant?: Date
}

export type ResultatGeneration =
  | { genere: true; resultat: ProgrammeGenere }
  | { genere: false; raison: string }

export async function genererEtInstallerProgramme(
  options: OptionsGenerationEnBase = {},
): Promise<ResultatGeneration> {
  const base = options.base ?? db
  const depots = options.depots ?? creerDepots(base)

  const profil = await depots.profil.lire()
  if (!profil) {
    return { genere: false, raison: 'Aucun profil enregistré.' }
  }

  const bibliotheque = await depots.exercices.tous()
  if (bibliotheque.length === 0) {
    return { genere: false, raison: 'La bibliothèque d’exercices est vide.' }
  }

  const resultat = genererProgrammeInitial({
    profil,
    bibliotheque,
    ...(options.nombreSemaines !== undefined ? { nombreSemaines: options.nombreSemaines } : {}),
    ...(options.maintenant ? { maintenant: options.maintenant } : {}),
  })

  if (resultat.seances.every((seance) => seance.type === 'repos')) {
    return {
      genere: false,
      raison:
        'Vos précautions et votre matériel ne laissent aucun exercice disponible : ajustez-les dans le profil.',
    }
  }

  await installerProgramme(base, {
    programme: resultat.programme,
    seances: resultat.seances,
    desactiverLesAutres: true,
  })

  return { genere: true, resultat }
}
