/**
 * Produit les icônes PNG de la PWA à partir d'une seule définition.
 *
 * Chrome sur Android réclame des PNG de 192 et 512 pixels pour proposer
 * l'installation ; un SVG seul ne suffit pas toujours. Plutôt que de garder
 * trois fichiers binaires qu'on ne saurait plus refaire, le dessin vit ici et
 * les PNG se régénèrent avec `npm run icones`.
 *
 * L'icône maskable est à part : Android recadre les icônes adaptatives dans
 * un cercle, et tout ce qui dépasse de la zone sûre — environ 80 % du côté —
 * est rogné. Sa version a donc un fond à bord perdu et un glyphe réduit.
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Resvg } from '@resvg/resvg-js'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = join(RACINE, 'public', 'icones')

const FOND = '#0d1014'
const ACCENT = '#c8f751'

/** Le glyphe : une courbe qui monte, et son point d'arrivée. */
function glyphe(echelle) {
  const decalage = 256 - 256 * echelle
  return `<g transform="translate(${decalage},${decalage}) scale(${echelle})">
    <path d="M112 352 L200 264 L272 320 L400 176" fill="none" stroke="${ACCENT}"
          stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="400" cy="176" r="34" fill="${ACCENT}"/>
  </g>`
}

const AVEC_COINS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"
     role="img" aria-label="Remise en forme">
  <rect width="512" height="512" rx="96" fill="${FOND}"/>
  ${glyphe(1)}
</svg>`

const PLEIN_BORD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${FOND}"/>
  ${glyphe(0.68)}
</svg>`

const A_PRODUIRE = [
  { nom: 'icone-192.png', svg: AVEC_COINS, taille: 192 },
  { nom: 'icone-512.png', svg: AVEC_COINS, taille: 512 },
  { nom: 'icone-maskable-512.png', svg: PLEIN_BORD, taille: 512 },
  { nom: 'icone.svg', svg: AVEC_COINS },
]

for (const { nom, svg, taille } of A_PRODUIRE) {
  const chemin = join(DOSSIER, nom)

  if (taille === undefined) {
    writeFileSync(chemin, svg.replace(/\n\s+/g, '\n  ').trim() + '\n')
    console.log(nom, '· source vectorielle')
    continue
  }

  const rendu = new Resvg(svg, { fitTo: { mode: 'width', value: taille } }).render()
  const png = rendu.asPng()
  writeFileSync(chemin, png)
  console.log(nom, '·', taille + '×' + taille, '·', png.length, 'octets')
}
