# Remise en forme

Suivi d'une reprise d'activité physique, et de l'alimentation qui va avec.

C'est une application web installable (PWA) : on l'ouvre dans Chrome sur
Android, on l'ajoute à l'écran d'accueil, et elle se comporte ensuite comme une
application — plein écran, bouton retour, et **elle marche sans réseau**.

**Rien ne sort de l'appareil.** Pas de compte, pas de serveur, pas de suivi
publicitaire ni d'outil d'analyse. Les séances, le journal et les photos vivent
dans le navigateur du téléphone, et nulle part ailleurs.

Elle est écrite en français, de l'interface au code : `seanceRealisee`,
`bilanHebdo`, `ressenti`. C'est le vocabulaire du cahier des charges, gardé tel
quel pour qu'il n'y ait rien à traduire entre ce qui est demandé et ce qui est
écrit.

→ [L'application publiée depuis ce dépôt](https://sebastien3885.github.io/remise-en-forme/)

## Ce qu'elle fait

Cinq écrans, une barre d'onglets en bas.

**Aujourd'hui** — la séance du jour, les repas à noter, les verres d'eau, et le
rappel d'un bilan qui attend une décision. Une séance se valide en un geste :
statut, effort, énergie, sommeil, douleur éventuelle. Une minuterie de travail
et de repos accompagne les séries, et garde l'écran allumé pendant le décompte.

**Semaine** — le calendrier des séances prévues et réalisées, côte à côte. On
pose une séance sur un jour libre, on en déplace une, on en remplace une. Une
séance déposée sur un jour occupé **échange** sa place avec celle qui s'y
trouve, ce qui préserve tout seul le jour de repos hebdomadaire.

**Progrès** — le bilan de la semaine, les règles qui se sont déclenchées avec
leur explication en clair, les courbes par exercice, la série de semaines
tenues, les objectifs personnels avec leur jauge, et la régularité du journal
alimentaire sur la même semaine.

**Repas** — le journal du jour en quatre bascules par repas (légumes,
protéines, boisson sucrée, repas copieux), une description et une photo
facultatives, l'hydratation, le poids en tendance, une fiche d'éducation
alimentaire par semaine et un seul défi à la fois.

**Réglages** — le profil (matériel, précautions, antécédents, niveau de
départ), la génération du programme de douze semaines, l'import d'un plan
préparé ailleurs, l'export vers l'agenda du téléphone, la sauvegarde, et le
bouton d'installation quand le navigateur la propose.

## Les partis pris

Ce sont les décisions qui expliquent le reste du code. Elles sont codées et
testées, pas seulement écrites ici.

**Le réalisé est la source de vérité.** Le moteur de progression se base sur ce
qui a été fait, jamais sur ce qui était prévu. Une séance sautée ne porte ni
effort ni énergie — mettre un chiffre par défaut reviendrait à fabriquer une
donnée que le moteur finirait par lire.

**Jamais plus de +10 % d'une semaine à l'autre**, et un seul levier à la fois :
la durée, ou l'intensité. Un bilan se refuse, s'accepte, ou se modifie — mais
modifier ne peut qu'en demander *moins* : si l'écran laissait choisir plus que
ce que le moteur propose, le plafond se franchirait par la porte de derrière.

**Jamais d'écrasement.** Une révision de programme crée une version ; l'ancienne
et ses séances restent consultables. Un bilan modifié garde côte à côte ce que
le moteur proposait et ce qui a été retenu. Et on ne replanifie pas un jour déjà
vécu.

**Rien n'est supposé du corps de qui l'installe.** Le profil de départ ne
contient aucun antécédent ; ils se déclarent. Et un antécédent n'écarte jamais
un exercice par lui-même — ce sont les précautions qui le font, pour qu'effacer
une ligne d'historique ne retire pas une protection en silence.

**On ne juge que ce qui a été écrit.** Un repère alimentaire dont la donnée
manque est hors jeu, ni tenu ni manqué. Compter un repas non saisi comme un
échec ferait du journal un registre de fautes.

**Une séance ne ment jamais sur son étiquette.** Si l'exercice principal est
écarté par le matériel ou les précautions, la séance est refusée avec sa
raison, jamais réduite aux étirements qui l'accompagnaient.

**Une photo de repas entre sans ses métadonnées.** Elle est redessinée dans un
canevas, ce qui ne garde que les pixels : l'EXIF reste derrière, et avec lui les
coordonnées GPS que les téléphones y glissent. Une sauvegarde qu'on s'envoie par
mail ne trimballe donc pas la position du restaurant.

**Rien ne se promet qui ne puisse se tenir.** Une application web sans serveur
ne se réveille pas à une heure dite : il n'y a donc aucune notification
programmée, et rien dans l'interface ne laisse croire le contraire. Les séances
à venir s'exportent vers l'agenda du téléphone, qui sait notifier. De même, le
bouton « Installer » n'apparaît que si le navigateur propose vraiment
l'installation.

## Ce qu'elle ne fait pas

- **Aucun avis médical.** Elle accompagne une reprise, elle ne diagnostique
  rien.
- **Aucun comptage de calories**, et aucune cible chiffrée générée
  automatiquement : toute valeur vient de l'utilisateur.
- **Aucun compte, aucune synchronisation.** Deux appareils ne partagent rien ;
  la sauvegarde JSON fait le pont, à la main.
- **Aucune notification.** Voir plus haut.

## Santé

L'application exclut par défaut la course, les sauts et les squats profonds, et
signale les mouvements à flexion marquée : c'est un réglage prudent pour une
reprise après une longue interruption, modifiable sous votre responsabilité.
Elle rappelle d'arrêter en cas de douleur à la poitrine, de vertige ou
d'essoufflement anormal.

**Ce sont des précautions, pas un avis médical.** Après une longue période sans
activité physique, parlez-en à un médecin avant de reprendre.

Les fiches d'éducation alimentaire reformulent des sources publiques — Manger
Bouger, Santé publique France, l'Assurance Maladie — et portent leur lien. Elles
**n'ont pas été relues par un professionnel de santé** : en cas de doute, c'est
un diététicien qui tranche, pas cette application.

## L'installer chez soi

L'application est conçue pour être publiée par chacun sur son propre compte, pas
pour être partagée depuis un serveur commun — c'est ce qui garde les données à
leur place.

1. Dupliquez ce dépôt (*fork*), ou créez le vôtre à partir du code.
2. Changez `NOM_DEPOT` dans [vite.config.ts](vite.config.ts) si votre dépôt
   porte un autre nom : cette ligne fixe le chemin public des fichiers, et un
   nom qui ne correspond pas donne une page blanche.
3. Activez **Settings → Pages → Source : GitHub Actions**, avant la première
   poussée.
4. Poussez. Chaque poussée sur `main` relance les tests, puis republie
   ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)).

La marche à suivre détaillée, avec les pièges d'une première fois sur GitHub,
est dans [docs/mise-en-ligne.md](docs/mise-en-ligne.md).

## Développer

Node 24.

```bash
npm install
npm run dev
```

| Commande | Ce qu'elle fait |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm test` | tous les tests, une passe |
| `npm run test:watch` | les tests en continu |
| `npm run typecheck` | TypeScript seul |
| `npm run build` | typecheck puis build de production, service worker compris |
| `npm run lint` | ESLint |

React 19 et TypeScript avec Vite, IndexedDB via Dexie, zod pour valider ce qui
entre, `vite-plugin-pwa` pour le hors ligne. Aucune dépendance de graphiques :
les courbes sont du SVG écrit à la main.

### Organisation du code

```
src/config/     les règles de progression et les repères alimentaires, en JSON
                contrôlé par un schéma — pas dans le code
src/domaine/    le métier pur : ni React, ni Dexie, ni DOM. Testable seul.
src/stockage/   la seule couche qui connaît IndexedDB
src/ui/         écrans, composants, navigation, hooks
```

Deux règles tiennent cette séparation : `src/domaine/` n'importe jamais rien de
`src/stockage/` ni de `src/ui/`, et **le moteur de progression ne lit ni
n'écrit rien** — il reçoit des séances, il rend un bilan.

Les règles de progression se règlent dans
[src/config/progression.json](src/config/progression.json). Le fichier est
contrôlé au chargement et ne peut pas franchir les garde-fous : une augmentation
au-delà de 10 %, ou un minimum de zéro jour de repos, font échouer le démarrage
plutôt que de passer inaperçues.

## Documents

- [CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md) — ce que l'application doit
  faire, en douze chapitres. Les numéros cités dans le code y renvoient.
- [CLAUDE.md](CLAUDE.md) — les repères de développement : invariants, langage
  visuel, règles de santé à respecter dans le code.
- [docs/mise-en-ligne.md](docs/mise-en-ligne.md) — publier et installer sur le
  téléphone.
- [docs/format-plan.md](docs/format-plan.md) — le format JSON d'un plan de
  séances, avec deux exemples dans [data/plans](data/plans).

## Licence

Aucune licence n'est attachée à ce dépôt pour l'instant : le code est public à
lire, mais tous les droits restent réservés par défaut. Si vous souhaitez le
réutiliser, demandez.
