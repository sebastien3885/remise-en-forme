# Format des plans d'exercice (`plan.json`)

Un plan se prépare sur l'ordinateur, s'envoie sur le téléphone (câble, Drive,
mail), puis s'importe depuis **Réglages → Importer un plan**. L'application
contrôle le fichier, affiche un aperçu, et ne l'applique qu'après validation.

Exemples prêts à l'emploi dans ce dépôt :

- [`data/plans/exemple-plan.json`](../data/plans/exemple-plan.json) — le
  programme de départ du cahier des charges, quatre semaines.
- [`data/plans/exemple-plan-exercice-sur-mesure.json`](../data/plans/exemple-plan-exercice-sur-mesure.json)
  — un plan qui ajoute son propre exercice à la bibliothèque.

## Squelette

```json
{
  "format": "plan-remise-en-forme",
  "version": 1,
  "nom": "Reprise en douceur – semaines 1 à 4",
  "description": "Facultatif.",
  "dateDebut": "2026-11-16",
  "exercices": [],
  "seances": []
}
```

| Champ | Obligatoire | Rôle |
| --- | --- | --- |
| `format` | oui | Toujours `plan-remise-en-forme`. Permet de refuser tout de suite un autre JSON. |
| `version` | oui | Version du format. Aujourd'hui `1`. |
| `nom` | oui | Apparaît dans l'aperçu et dans le motif de révision du programme. |
| `description` | non | Une ou deux phrases. |
| `dateDebut` | oui | Date ISO `AAAA-MM-JJ`. Sert à numéroter les semaines. |
| `exercices` | non | Exercices à ajouter ou mettre à jour. Vide si le plan n'utilise que la bibliothèque. |
| `seances` | oui | Au moins une séance. |

## Ce qu'il ne faut **pas** écrire

Ces valeurs sont déduites, les écrire est une erreur :

- le **numéro de semaine** d'une séance — calculé depuis `dateDebut` ;
- l'**ordre** des exercices dans une séance — c'est leur ordre dans la liste ;
- les **identifiants** des séances et du programme — générés à l'import ;
- l'**identifiant** d'un exercice, si son nom suffit : `Marche rapide` devient
  `marche-rapide`.

## Un exercice

Seulement si le plan en apporte un qui n'est pas déjà dans la bibliothèque.

```json
{
  "id": "marche-fractionnee",
  "nom": "Marche fractionnée",
  "categorie": "marche",
  "description": "Alterner 2 min rapide et 2 min tranquille.",
  "musclesTravailles": ["jambes", "endurance"],
  "varianteFacileId": "marche-rapide",
  "contreIndications": [],
  "impactGenou": "faible",
  "flexionMarquee": false,
  "materielRequis": ["aucun"],
  "consigneSecurite": "Revenir à l'allure tranquille dès que la respiration ne suit plus."
}
```

| Champ | Obligatoire | Valeurs |
| --- | --- | --- |
| `id` | non | Slug. Déduit de `nom` si absent. |
| `nom` | oui | |
| `categorie` | oui | `marche`, `velo`, `natation`, `renforcement`, `mobilite`, `autre` |
| `description` | non | Défaut : vide. |
| `musclesTravailles` | non | Défaut : liste vide. |
| `varianteFacileId`, `varianteDifficileId` | non | Identifiant d'un exercice du plan **ou** de la bibliothèque. Omettre la clé s'il n'y en a pas : `null` est refusé. |
| `contreIndications` | non | Défaut : liste vide. |
| `impactGenou` | oui | `faible`, `modere`, `eleve` |
| `flexionMarquee` | non | Défaut : `false`. Mettre `true` pour un mouvement à forte flexion du genou. |
| `materielRequis` | non | Défaut : `["aucun"]`. Parmi `aucun`, `tapis`, `velo`, `piscine`. |
| `consigneSecurite` | non | Rappelée pendant la séance. |

Un exercice à `impactGenou: "eleve"` est accepté, mais il sera écarté des
propositions tant que les précautions du profil ne sont pas levées — l'aperçu
le signale.

## Une séance

```json
{
  "date": "2026-11-16",
  "type": "marche",
  "titre": "Marche rapide 30 min",
  "notes": "Allure où la conversation reste possible.",
  "exercices": [
    {
      "exerciceId": "marche-rapide",
      "cibles": { "dureeMinutes": 30 },
      "consigne": "Ralentir dès que parler devient difficile."
    }
  ]
}
```

| Champ | Obligatoire | Valeurs |
| --- | --- | --- |
| `date` | oui | ISO `AAAA-MM-JJ`, jamais avant la semaine de `dateDebut`. |
| `type` | oui | Les catégories, plus `repos`. |
| `titre` | oui | Ce qui s'affiche dans le calendrier. |
| `notes` | non | |
| `exercices` | oui sauf pour `repos` | Au moins un exercice, sauf jour de repos. |

Un jour de repos s'écrit avec `"type": "repos"` et une liste d'exercices vide.

### Les cibles

Au moins une valeur par exercice, toutes facultatives et combinables :

| Cible | Unité |
| --- | --- |
| `dureeMinutes` | minutes |
| `distanceMetres` | mètres |
| `longueurs` | longueurs de bassin |
| `series` | nombre de séries |
| `repetitions` | répétitions par série |
| `maintienSecondes` | secondes (gainage, étirements) |
| `reposSecondes` | secondes entre les séries |

## Ce que l'application refuse

L'import est bloqué, avec le chemin exact dans le fichier :

- une **clé inconnue** — `duréeMinutes` au lieu de `dureeMinutes` serait sinon
  ignoré en silence, et la séance partirait sans cible ;
- un `exerciceId` **introuvable**, ni dans le plan ni dans la bibliothèque ;
- une **variante** qui pointe vers un exercice inexistant ;
- deux exercices portant le **même identifiant** ;
- une séance datée **avant** la semaine de `dateDebut` ;
- une **semaine sans jour de repos complet** : le cahier des charges impose au
  moins un jour de repos par semaine, et cette règle n'est pas contournable par
  un fichier.

## Remplacer ou fusionner

À l'import, deux choix :

- **Remplacer** — une nouvelle version du programme devient active. L'ancienne
  version et ses séances sont conservées : rien n'est écrasé.
- **Fusionner** — les séances rejoignent le programme en cours, et leurs
  semaines sont numérotées depuis la date de début de *ce* programme, pour
  rester alignées sur lui.

Dans les deux cas, les exercices du plan sont ajoutés à la bibliothèque, ou
mettent à jour ceux de même identifiant.
