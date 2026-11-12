# Remise en forme — repères pour Claude Code

Application personnelle de suivi de forme et d'alimentation. Un seul utilisateur,
usage surtout sur téléphone Android. Le cahier des charges complet est dans
[CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md) : il fait référence, et les numéros
de chapitre cités dans le code y renvoient.

## Stack

| Sujet | Choix |
| --- | --- |
| Interface | React 19 + TypeScript, Vite |
| Stockage | IndexedDB via Dexie — aucun serveur, aucun compte |
| Validation des fichiers importés | zod |
| Hors ligne | `vite-plugin-pwa` (service worker, `registerType: autoUpdate`) |
| Tests | Vitest (Playwright arrive à l'étape 5) |
| Hébergement | GitHub Pages, `base` défini dans `vite.config.ts` (`NOM_DEPOT`) |

## Commandes

```bash
npm run dev         # serveur de développement
npm test            # tous les tests, une passe
npm run test:watch  # tests en continu
npm run typecheck   # TypeScript seul
npm run build       # typecheck + build de production (génère le service worker)
npm run lint        # ESLint
```

## Organisation du code

```
src/config/      progression.json (les règles du chapitre 5) + son schéma zod
src/domaine/     métier pur : ni React, ni Dexie, ni DOM. Testable seul.
  calendrier/    export iCalendar des séances à venir (les rappels)
  entites/       les neuf entités du chapitre 7
  exercices/     bibliothèque et choix de variantes
  plans/         format d'import, contrôle, aperçu, conversion
  profil/        profil par défaut et précautions du chapitre 10
  progression/   le moteur : statistiques, règles, propositions
src/stockage/    la seule couche qui connaît IndexedDB (Dexie + dépôts)
src/ui/          écrans, composants, navigation, hooks
```

**Les règles de progression se règlent dans `src/config/progression.json`**, pas
dans le code. Le fichier est contrôlé au chargement, et il ne peut pas franchir
les garde-fous du chapitre 10 : une augmentation au-delà de 10 % ou un minimum
de zéro jour de repos font échouer le démarrage.

**Le moteur ne lit et n'écrit rien.** `genererBilan` reçoit des séances et rend
un bilan ; `proposerSemaineSuivante` reçoit une semaine et en rend une autre.
Aucun accès à la base, aucun état.

**Règle d'architecture.** `src/domaine/` n'importe jamais rien de `src/stockage/`
ni de `src/ui/`. Le moteur de progression est un module pur : il reçoit des
données, rend une proposition, et ne lit ni n'écrit rien.

**Nommage en français**, pour coller au vocabulaire du cahier des charges
(`seanceRealisee`, `bilanHebdo`, `ressenti`, `depots`). Les noms d'outillage
restent conventionnels (`src`, `public`, `dist`).

**Le réalisé est la source de vérité** (chapitre 4). Le moteur de progression se
base sur les séances réalisées, jamais sur le programme théorique.

**Un objectif se mesure sur une seule fois.** La jauge d'un objectif personnel
lit le réalisé et ne somme jamais : trois marches de dix minutes ne valent pas
« 30 minutes d'affilée », et deux séries de dix pompes ne valent pas vingt
pompes d'affilée. Un objectif dont l'indicateur n'est pas une grandeur mesurée
reste hors jeu — pas de jauge, et un mot qui le dit, jamais un 0 %.

**Jamais d'écrasement** (chapitre 7). Une révision de programme crée une nouvelle
version ; l'historique est conservé. Un bilan modifié garde côte à côte ce que
le moteur proposait (`ajustements`) et ce qui a été retenu
(`ajustementsRetenus`).

**La navigation passe par le fragment d'URL** (`#/semaine`), sans bibliothèque de
routage : c'est ce qui rend le bouton retour d'Android utile dans l'application
installée. Les cinq onglets sont déclarés une fois dans
`src/ui/navigation/onglets.ts`.

**Une séance déjà saisie ne se déplace pas**, ne s'annule pas et ne se remplace
pas. Son réalisé porte la date du jour où elle a eu lieu, et c'est lui qui fait
foi. Déposer une séance sur un jour occupé **échange** les deux, ce qui préserve
tout seul le jour de repos hebdomadaire.

**Une séance ne ment jamais sur son étiquette.** Les étirements ajoutés en fin de
séance sont des *compléments* : si l'exercice principal est écarté par le
matériel ou les précautions, la séance est refusée avec sa raison, jamais
réduite à ses compléments. Une « marche » faite de trois étirements serait pire
qu'une absence de séance.

**Une activité improvisée ne remplace pas la séance du jour.** Les deux ont eu
lieu ; les écrans affichent les deux.

**Un rappel ne se promet pas s'il ne peut pas partir.** Une PWA sans serveur
ne se réveille pas à une heure dite : pas de notification programmée, et rien
dans l'interface ne doit laisser croire le contraire. Les séances à venir
s'exportent vers l'agenda du téléphone (`src/domaine/calendrier/ics.ts`), qui
sait notifier. Les jours de repos n'y vont pas — une alarme pour ne rien faire
est du bruit — ni les séances faites, annulées ou remplacées.

## Langage visuel — « Grand geste »

Direction retenue parmi six maquettes. Fond presque noir, **un seul accent**
très lumineux, chiffres énormes, et une action principale large comme un
pouce : c'est la traduction visuelle de la contrainte des deux minutes du
chapitre 4 — l'action qui compte est la plus grosse chose à l'écran.

Tous les jetons sont dans `src/styles/global.css`, en variables CSS. **Aucune
couleur ni aucun rayon en dur dans un composant** : si une valeur manque,
ajouter un jeton plutôt qu'un littéral.

| Jeton | Valeur | Emploi |
| --- | --- | --- |
| `--fond` | `#0d1014` | fond d'écran |
| `--fond-carte` | `#171c22` | cartes et lignes |
| `--texte` / `--texte-discret` | `#f2f5f8` / `#9aa5b1` | encre (6,8:1 sur les cartes) |
| `--accent` / `--accent-texte` | `#c8f751` / `#121807` | l'action, et elle seule |
| `--cible-tactile` | 48 px | toute cible cliquable |
| `--cible-principale` | 76 px | `.bouton--principal`, un par écran |

Classes utiles : `.page`, `.carte`, `.bouton` (+ `--principal`, `--secondaire`,
`--icone`, `--fichier`), `.rangee-chiffres`, `.ligne`, `.donnees`, `.chiffre`,
`.surtitre`, `.liste-nue` (+ `.erreurs`, `.avertissements`, `.liste-ecartes`).

Trois règles qui ne se voient pas mais qui tiennent l'ensemble :

- **Un seul `.bouton--principal` par écran.** S'il y en a deux, l'écran n'a
  plus d'action principale.
- **L'accent ne sert jamais à décorer**, seulement à désigner ce sur quoi on
  appuie, ou le chiffre qui compte.
- **La couleur ne porte jamais seule une information.** Une erreur, un
  avertissement ou un état s'accompagne toujours d'un mot.

Le fond sombre est un choix de l'utilisateur, fait en connaissance du
compromis : un fond clair se lit mieux en plein soleil. L'accent est donc
volontairement très lumineux pour compenser.

## Règles de santé et de sécurité à respecter dans le code (chapitre 10)

Ces règles ne sont pas des suggestions d'interface : elles sont codées et testées.

- **Plafond de progression :** jamais plus de +10 % de charge d'une semaine à
  l'autre, quelle que soit la règle qui s'applique.
- **Modifier un bilan ne peut qu'en demander moins.** La troisième voie du
  chapitre 5 laisse retenir une part de ce que le moteur propose — la moitié, ou
  rien — mais jamais davantage : l'écran n'offre pas de facteur plus ambitieux
  et `modifierBilan` refuse celui qui dépasse, au lieu de le rogner en silence.
  Sinon le plafond de +10 % se franchirait par l'interface.
- **Un seul levier à la fois :** durée, ou intensité, ou fréquence. Pas deux.
- **Au moins un jour de repos complet par semaine**, imposé par l'application.
- **Genou** (antécédent articulaire déclaré) : chaque exercice
  porte un niveau d'impact sur le genou. Par défaut la v1 exclut course, sauts et
  squats profonds, et signale les mouvements à flexion marquée. Ce sont des
  précautions, pas un avis médical : l'utilisateur peut les lever lui-même.
- **Douleur signalée deux fois sur le même exercice** : proposer une variante plus
  douce et suggérer un avis médical.
- **Aucune cible calorique restrictive générée automatiquement.** Toute valeur
  chiffrée est saisie par l'utilisateur. Le schéma de `src/config/reperes.json`
  refuse un repère que le code ne sait pas évaluer, pour qu'aucune cible
  chiffrée ne se glisse par la configuration.
- **On ne juge que ce qui a été écrit.** Un repère alimentaire dont la donnée
  manque est hors jeu, ni tenu ni manqué : compter un repas non saisi comme un
  échec ferait du journal un registre de fautes.
- **Le poids ne s'affiche qu'en moyenne glissante**, jamais en chiffre du jour,
  et sans commentaire sur la valeur. L'option `masquerPoids` du profil retire
  la section entière.
- **Les fiches d'éducation alimentaire reformulent des sources publiques** et
  portent leur lien. Rien n'y est inventé ni personnalisé, et elles n'ont pas
  encore été relues par un professionnel de santé.
- **Aucun avis médical.** L'application accompagne, elle ne diagnostique pas.

## Vie privée

Les données restent sur l'appareil. Aucun suivi publicitaire, aucun outil
d'analyse tiers, aucune clé d'API ni donnée personnelle dans le dépôt.

**Une photo de repas entre sans ses métadonnées.** Elle est redessinée dans un
canevas (`src/ui/photo.ts`), ce qui ne garde que les pixels : l'EXIF reste
derrière, et avec lui les coordonnées GPS que les téléphones y glissent. La
sauvegarde qu'on s'envoie par mail ne trimballe donc pas la position du
restaurant. Toute autre façon d'enregistrer une photo devrait refaire ce
nettoyage.
