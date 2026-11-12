/**
 * Fiches d'éducation alimentaire (chapitre 6).
 *
 * Une fiche par semaine, deux minutes de lecture, un seul thème, et un défi à
 * choisir dedans.
 *
 * **Origine du contenu.** Chaque fiche reformule les repères publics du
 * Programme national nutrition santé et de Santé publique France, et porte le
 * lien de sa source. Rien n'est inventé, rien n'est personnalisé : ce sont des
 * repères de population générale, pas un conseil adapté à quelqu'un.
 *
 * **À vérifier avant usage.** Le cahier des charges demande que ce contenu
 * soit « vérifié avant intégration ». Il a été écrit à partir des sources
 * citées, mais il n'a pas encore été relu par un professionnel de santé. En
 * cas de doute, c'est un diététicien qui tranche, pas cette application.
 *
 * **Ce qu'on ne fait pas ici.** Aucune cible chiffrée personnalisée, aucun
 * objectif calorique, aucun régime (garde-fou du chapitre 6).
 */
import type { Id } from '../entites'

export interface SourceFiche {
  nom: string
  url: string
}

export interface Fiche {
  id: Id
  titre: string
  theme: string
  /** Trois ou quatre paragraphes courts : deux minutes de lecture. */
  paragraphes: string[]
  /** Les défis proposés. L'utilisateur en choisit **un seul** (chapitre 6). */
  defis: string[]
  source: SourceFiche
}

const MANGER_BOUGER: SourceFiche = {
  nom: 'Manger Bouger — l’essentiel des recommandations alimentaires',
  url: 'https://www.mangerbouger.fr/content/show/1597/file/L%E2%80%99essentiel%20des%20recommandations%20alimentaires.pdf',
}

const AFFICHE_ADULTES: SourceFiche = {
  nom: 'Manger Bouger — recommandations pour les adultes',
  url: 'https://www.mangerbouger.fr/content/show/1502/file/Affiche_recommandations_adultes.pdf',
}

/**
 * L'Assurance Maladie. C'est la source publique qui décrit le **rythme** des
 * repas : les repères du PNNS, eux, disent quoi manger, pas quand.
 */
const AMELI: SourceFiche = {
  nom: 'Assurance Maladie — alimentation de l’adulte, des repas équilibrés au fil de la semaine',
  url: 'https://www.ameli.fr/assure/sante/themes/alimentation/alimentation-adulte/alimentation-adulte-equilibre-repas',
}

const SANTE_PUBLIQUE_FRANCE: SourceFiche = {
  nom: 'Santé publique France — recommandations alimentation et activité physique',
  url: 'https://www.santepubliquefrance.fr/sites/default/files/rdd/document/42466_spf00000619.pdf',
}

export const FICHES: readonly Fiche[] = [
  {
    id: 'assiette',
    titre: 'Composer son assiette',
    theme: 'Composition d’une assiette',
    paragraphes: [
      'Les repères officiels tiennent en trois verbes : augmenter, aller vers, réduire. Augmenter les fruits et légumes, les légumes secs, les fruits à coque non salés, l’activité physique et le fait maison. Aller vers les aliments de saison, produits localement, et le bio quand c’est possible. Réduire la viande, la charcuterie, l’alcool, les produits sucrés et salés, et le temps passé assis.',
      'Ce cadre ne demande pas de compter quoi que ce soit. Il décrit une direction : un peu plus de ceci, un peu moins de cela, repas après repas.',
      'En pratique, une assiette équilibrée fait une large place aux légumes, garde une source de protéines, et ajoute un féculent — de préférence complet. L’ordre d’importance compte plus que les proportions exactes.',
    ],
    defis: [
      'Des légumes à chaque déjeuner cette semaine',
      'Un repas fait maison de plus que d’habitude',
      'Une assiette où les légumes occupent la plus grande place, tous les jours',
    ],
    source: MANGER_BOUGER,
  },

  {
    id: 'rythme',
    titre: 'Le rythme des repas',
    theme: 'Rythme des repas',
    paragraphes: [
      'L’Assurance Maladie décrit la journée autour de trois repas principaux, à des horaires les plus fixes possibles, week-end compris. C’est la régularité qui est recommandée, pas une heure précise : la source ne donne pas d’horaire à viser, et cette fiche n’en invente pas.',
      'Le petit-déjeuner y est décrit comme de préférence copieux et complet, chaque matin. Le goûter ou la collation, en revanche, sont facultatifs : à prendre si on en ressent le besoin, en laissant au moins deux heures avant le repas suivant.',
      'La durée compte autant que le contenu. Prendre le temps de déguster et de bien mâcher, et un repas assez long pour que la sensation de satiété ait le temps d’arriver : manger vite en faisant autre chose la laisse arriver trop tard.',
      'Rien de tout cela n’est une règle à tenir tous les jours. Un repas décalé ou sauté ne se rattrape pas et ne se compte pas en faute : c’est le rythme habituel qui est en jeu, pas la journée d’hier.',
    ],
    defis: [
      'Un petit-déjeuner complet chaque matin de la semaine',
      'Les trois repas à peu près à la même heure, week-end compris',
      'Aucune collation dans les deux heures avant un repas',
      'Un repas par jour pris à table, sans écran',
    ],
    source: AMELI,
  },

  {
    id: 'fibres',
    titre: 'Fibres, légumes et féculents complets',
    theme: 'Fibres et légumes',
    paragraphes: [
      'Au moins cinq fruits et légumes par jour, avec une part plus importante de légumes que de fruits. Une portion, c’est environ ce qui tient dans la main : une poignée de haricots verts, une pomme, deux abricots.',
      'Les féculents complets — pain complet, pâtes complètes, riz complet — sont recommandés au moins une fois par jour. Ils contiennent nettement plus de fibres que leurs équivalents raffinés.',
      'Les légumes secs — lentilles, pois chiches, haricots — sont conseillés au moins deux fois par semaine. Ils apportent à la fois des fibres et des protéines, ce qui en fait une alternative simple à la viande.',
      'Frais, surgelés ou en conserve : les trois comptent. Le surgelé nature n’a rien à envier au frais, et il ne se perd pas au fond du bac.',
    ],
    defis: [
      'Des légumes secs deux fois cette semaine',
      'Du pain ou des pâtes complètes une fois par jour',
      'Un fruit au petit-déjeuner tous les matins',
    ],
    source: AFFICHE_ADULTES,
  },

  {
    id: 'proteines',
    titre: 'Les sources de protéines',
    theme: 'Protéines',
    paragraphes: [
      'Du poisson deux fois par semaine, dont un poisson gras : sardine, maquereau, hareng ou saumon. Les poissons en conserve comptent, et coûtent moins cher que le frais.',
      'La viande rouge et surtout la charcuterie sont à réduire. Les repères officiels situent la limite autour de 500 g de viande rouge par semaine, et de 150 g de charcuterie.',
      'Les légumes secs, les œufs et les produits laitiers sont les autres sources courantes. Alterner entre elles revient à peu près à ce que recommandent les repères, sans rien calculer.',
      'Pour une reprise d’activité physique, les protéines ne demandent pas de supplément particulier : une source à chaque repas suffit largement.',
    ],
    defis: [
      'Du poisson deux fois cette semaine, dont un gras',
      'Une source de protéines à chaque repas',
      'Un repas sans viande de plus que d’habitude',
    ],
    source: AFFICHE_ADULTES,
  },

  {
    id: 'boissons',
    titre: 'Ce qu’on boit',
    theme: 'Boissons',
    paragraphes: [
      'L’eau est la seule boisson recommandée, à volonté, pendant et entre les repas. C’est le repère le plus simple de tous.',
      'Les jus de fruits, les sodas — y compris les versions allégées — et les boissons dites énergisantes sont à limiter au maximum : pas plus d’un verre par jour dans tous les cas. Un jus de fruits, même pressé, ne remplace pas un fruit : il en garde le sucre et perd l’essentiel des fibres.',
      'L’eau du robinet, l’eau gazeuse, le thé et le café sans sucre entrent dans le compte. C’est le sucre qui pose problème, pas la variété.',
      'Pendant une marche ou une séance, boire avant d’avoir soif reste le repère le plus fiable.',
    ],
    defis: [
      'Aucune boisson sucrée de la semaine',
      'Une bouteille d’eau toujours à portée pendant la journée',
      'Un verre d’eau avant chaque repas',
    ],
    source: SANTE_PUBLIQUE_FRANCE,
  },

  {
    id: 'etiquettes',
    titre: 'Lire une étiquette',
    theme: 'Lecture d’étiquettes',
    paragraphes: [
      'Le Nutri-Score, de A à E, donne une indication rapide de la qualité nutritionnelle d’un produit. Les repères officiels invitent à réduire les produits classés D et E, sans les interdire.',
      'La liste des ingrédients se lit par ordre décroissant : ce qui arrive en premier est ce qu’il y a le plus. Si le sucre figure dans les trois premiers, le produit est sucré, quel que soit le discours de l’emballage.',
      'À produit équivalent, la liste la plus courte, avec le moins d’additifs, est le meilleur choix par défaut. C’est aussi la règle la plus facile à appliquer en magasin, sans rien connaître.',
      'Le sel vient surtout des produits transformés — charcuterie, plats préparés, soupes déshydratées, fromage, pain — et beaucoup moins de la salière. Réduire les premiers est plus efficace que de saler moins à table.',
    ],
    defis: [
      'Comparer le Nutri-Score de deux produits avant d’en choisir un',
      'Remplacer un plat préparé par un plat fait maison',
      'Lire la liste d’ingrédients de trois produits du placard',
    ],
    source: SANTE_PUBLIQUE_FRANCE,
  },

  {
    id: 'bouger',
    titre: 'Bouger, et rester moins assis',
    theme: 'Activité physique et sédentarité',
    paragraphes: [
      'Au moins trente minutes d’activité dynamique par jour : marcher d’un bon pas compte. Un peu d’activité vaut déjà mieux que rien, et davantage vaut mieux qu’un peu — c’est la formulation même des recommandations.',
      'Deux fois par semaine, des exercices de renforcement musculaire, de souplesse et d’équilibre. C’est exactement ce que fait le programme de cette application.',
      'Le temps passé assis est un repère à part, indépendant du sport : il est recommandé de le réduire et de l’interrompre régulièrement. Se lever quelques minutes toutes les heures ou deux compte autant que la séance du jour.',
      'Tout s’additionne : les trente minutes peuvent se découper en plusieurs fois dix minutes dans la journée.',
    ],
    defis: [
      'Se lever cinq minutes toutes les heures de travail',
      'Une marche de dix minutes après le déjeuner, chaque jour',
      'Prendre l’escalier à chaque occasion de la semaine',
    ],
    source: SANTE_PUBLIQUE_FRANCE,
  },
]

/**
 * La fiche de la semaine. Les fiches tournent en boucle : après la dernière
 * on revient à la première, ce qui vaut mieux qu'un écran vide à partir de la
 * septième semaine.
 */
export function ficheDeLaSemaine(semaine: number): Fiche {
  const index = ((semaine - 1) % FICHES.length + FICHES.length) % FICHES.length
  // La liste n'est jamais vide : l'accès est sûr.
  return FICHES[index] as Fiche
}
