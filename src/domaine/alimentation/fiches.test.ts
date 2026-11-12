import { describe, expect, it } from 'vitest'

import { FICHES, ficheDeLaSemaine } from './fiches'

describe('fiches d’éducation alimentaire', () => {
  it('couvre les thèmes annoncés par le chapitre 6', () => {
    const themes = FICHES.map((fiche) => fiche.theme.toLowerCase())

    expect(themes.join(' | ')).toMatch(/composition d’une assiette/)
    expect(themes.join(' | ')).toMatch(/fibres et légumes/)
    expect(themes.join(' | ')).toMatch(/protéines/)
    expect(themes.join(' | ')).toMatch(/boissons/)
    expect(themes.join(' | ')).toMatch(/étiquettes/)
  })

  it('porte une source publique sur chaque fiche', () => {
    // Le chapitre 6 veut un contenu tiré de sources officielles : la fiche
    // doit pouvoir être remontée jusqu'à elles.
    for (const fiche of FICHES) {
      expect(fiche.source.url).toMatch(/^https:\/\//)
      expect(fiche.source.url).toMatch(/mangerbouger\.fr|santepubliquefrance\.fr/)
      expect(fiche.source.nom.length).toBeGreaterThan(10)
    }
  })

  it('tient en deux minutes de lecture', () => {
    for (const fiche of FICHES) {
      const mots = fiche.paragraphes.join(' ').split(/\s+/).length

      expect(fiche.paragraphes.length).toBeGreaterThanOrEqual(3)
      // Environ 200 mots par minute de lecture tranquille.
      expect(mots).toBeLessThan(400)
    }
  })

  it('propose plusieurs défis, pour n’en choisir qu’un', () => {
    for (const fiche of FICHES) {
      expect(fiche.defis.length).toBeGreaterThanOrEqual(2)
      expect(new Set(fiche.defis).size).toBe(fiche.defis.length)
    }
  })

  it('n’avance aucune cible chiffrée personnalisée', () => {
    // Garde-fou du chapitre 6 : pas d'objectif calorique généré.
    const texte = JSON.stringify(FICHES).toLowerCase()

    expect(texte).not.toMatch(/kcal|calorie|imc|perdre \d/)
  })

  it('a des identifiants uniques', () => {
    expect(new Set(FICHES.map((fiche) => fiche.id)).size).toBe(FICHES.length)
  })
})

describe('ficheDeLaSemaine', () => {
  it('donne la première fiche la première semaine', () => {
    expect(ficheDeLaSemaine(1).id).toBe(FICHES[0]?.id)
  })

  it('avance d’une fiche par semaine', () => {
    expect(ficheDeLaSemaine(3).id).toBe(FICHES[2]?.id)
  })

  it('repart au début une fois les fiches épuisées', () => {
    // Mieux vaut relire une fiche qu'avoir un écran vide à la semaine 7.
    expect(ficheDeLaSemaine(FICHES.length + 1).id).toBe(FICHES[0]?.id)
    expect(ficheDeLaSemaine(FICHES.length + 3).id).toBe(FICHES[2]?.id)
  })

  it('tient une semaine zéro ou négative sans casser', () => {
    expect(ficheDeLaSemaine(0)).toBeDefined()
    expect(ficheDeLaSemaine(-1)).toBeDefined()
  })
})
