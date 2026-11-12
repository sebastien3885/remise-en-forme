# Cahier des charges – Application personnelle de suivi forme & alimentation

Nov 12, 2026

## 1. Contexte et objectifs

L'application aide une seule personne à reprendre une activité physique régulière, à mesurer ce qu'elle fait vraiment et à ajuster son programme au fil des semaines, avec un suivi alimentaire simple en complément.

**Point de départ.** Une condition physique basse, après une longue interruption. Le but n'est pas la performance mais de se sentir à l'aise au quotidien et en bonne santé (la piscine reste un simple repère).

**Objectifs de l'application**

- Générer un planning de séances réaliste, adapté au niveau actuel.
- Enregistrer le réalisé (et pas seulement le prévu) en moins de 2 minutes par séance.
- Faire évoluer automatiquement ou semi-automatiquement les séances selon la progression et le ressenti.
- Suivre l'alimentation sans contrainte excessive : repères, hydratation, poids.

**Indicateurs de réussite à 12 semaines**

| Indicateur | Cible |
| --- | --- |
| Séances réalisées / prévues | au moins 80 % |
| Marche rapide continue | 30 min sans essoufflement excessif |
| Natation continue | 4 longueurs sans arrêt |
| Ressenti moyen de l'effort (échelle 1 à 10) | stable ou en baisse à charge égale |
| Régularité du journal alimentaire | au moins 5 jours par semaine |

## 2. Périmètre

L'application est un outil personnel, pour un seul utilisateur, utilisable surtout sur téléphone, sans compte ni service tiers obligatoire.

| Inclus (MVP) | Exclu (au moins pour la v1) |
| --- | --- |
| Programme initial généré et calendrier hebdomadaire | Multi-utilisateurs, comptes, partage social |
| Saisie rapide du réalisé d'une séance | Synchronisation avec montres ou capteurs |
| Bilan hebdomadaire et ajustement du programme | Conseils médicaux ou diagnostic |
| Journal alimentaire simple, hydratation, poids | Base de données nutritionnelle complète avec scan de codes-barres |
| Import de plans d'exercice depuis le PC et export des données (CSV / JSON) | Publication sur Google Play |

**Hypothèses de travail**

- Téléphone pour le suivi au quotidien (parfois au bord de la piscine ou en extérieur) et ordinateur pour charger les plans d'exercice : l'interface doit être lisible et utilisable à une main.
- Les données restent chez l'utilisateur (pas de service tiers imposé) ; les plans préparés sur l'ordinateur sont transférés sur le téléphone par fichier.
- Le développement est fait avec Claude Code, par petites étapes testables.

## 3. Module 1 – Planning des séances

L'application propose un programme précis de 12 semaines, jour par jour, que l'utilisateur peut déplacer, échanger ou annuler.

**Paramètres d'entrée (questionnaire initial)**

- Disponibilités : pas de créneaux fixes à déclarer ; l'utilisateur place lui-même ses séances dans le calendrier, à l'avance ou après coup (voir Planification libre).
- Matériel disponible (aucun, tapis, vélo, accès à une piscine).
- Antécédents articulaires éventuels, déclarés par l’utilisateur ; les exercices à fort impact ou à risque pour le genou sont exclus par défaut.
- Niveau de départ : distance de marche confortable, nombre de longueurs nageables, nombre de pompes ou squats possibles.

**Types de séances du programme initial**

| Type | Exemple de départ (semaines 1 à 4) | Fréquence |
| --- | --- | --- |
| Marche rapide | 30 min, allure où l'on peut parler | 3 par semaine |
| Renforcement sans matériel | Squats sur chaise, pompes contre mur, gainage 20 s, 15 min | 2 par semaine |
| Natation douce | 8 × 1 longueur, 30 à 45 s de repos | 1 par semaine (optionnel au début) |
| Mobilité | 5 min d'étirements après la séance | à chaque séance |

**Fonctions attendues**

- Vue calendrier hebdomadaire et vue « aujourd'hui » avec le détail de la séance.
- Bibliothèque d'exercices : nom, description courte, muscles travaillés, variante plus facile et plus difficile, contre-indications.
- Déplacer une séance sur un autre jour, la remplacer par une équivalente ou la marquer comme sautée.
- Minuterie intégrée (travail / repos) pour les séries.
- Au moins un jour de repos complet par semaine, imposé par l'application.

**Planification libre et import de plans**

- Créer à l'avance une séance pour un jour précis (ou une série de jours), la modifier, la déplacer ou la supprimer.
- Valider ensuite la séance au moment où elle est réalisée, ou noter après coup une séance faite sans avoir été prévue.
- Importer dans l'application un plan d'exercices (fichier JSON préparé sur le PC avec Claude) qui remplit automatiquement la bibliothèque et le calendrier.

## 4. Module 2 – Suivi du réalisé

Chaque séance prévue peut être validée en un geste, puis corrigée si le réel diffère du prévu.

**Saisie d'une séance (moins de 2 minutes)**

- Statut : faite, faite en partie, sautée (avec motif optionnel : fatigue, manque de temps, douleur, météo).
- Valeurs réelles, préremplies avec le prévu et modifiables : durée, distance, nombre de longueurs, séries × répétitions, temps de repos.
- Ressenti de l'effort sur une échelle de 1 à 10 et état général (énergie, douleurs, sommeil de la nuit précédente), en un tap.
- Note libre facultative.
- Séance non prévue : possibilité d'ajouter une activité improvisée (ex. balade, vélo).

**Consultation**

- Historique des séances avec comparaison prévu / réalisé.
- Courbes simples par indicateur : durée de marche, nombre de longueurs, charge de renforcement, ressenti.
- Série en cours (nombre de semaines tenues) et récapitulatif hebdomadaire.
- Fiche par exercice : meilleurs résultats et progression dans le temps.

**Règle de conception.** Le « réalisé » est la source de vérité : le moteur de progression (module suivant) se base sur lui, jamais sur le programme théorique.

## 5. Module 3 – Progression adaptative

Chaque semaine, l'application compare le réalisé au prévu et propose le programme de la semaine suivante ; l'utilisateur valide ou modifie avant que ce soit appliqué.

**Bilan hebdomadaire (généré le dimanche soir)**

- Taux de séances réalisées, ressenti moyen, douleurs signalées, évolution des performances.
- Question de fin de semaine : « Comment trouves-tu la charge ? » (trop facile / juste bien / trop dur).

**Règles de décision (paramétrables dans un fichier de configuration)**

| Situation observée | Ajustement proposé |
| --- | --- |
| Au moins 80 % des séances faites et ressenti moyen de 6 ou moins | Augmenter la charge d'environ 10 % (durée, répétitions ou longueurs), jamais plus |
| Entre 50 et 80 % des séances faites | Maintenir la charge, relancer la semaine |
| Moins de 50 % faites, ou ressenti de 8 ou plus | Réduire la charge d'environ 20 % et vérifier les causes (fatigue, planning) |
| Douleur signalée deux fois sur le même exercice | Le remplacer par une variante plus douce et suggérer un avis médical |
| Quatre semaines de progression d'affilée | Semaine allégée (environ 30 % de moins) pour récupérer |
| Palier atteint sur un exercice | Proposer la variante plus difficile |

**Principes**

- Un seul levier à la fois : durée, ou intensité, ou fréquence.
- Les règles sont déterministes et lisibles : l'application explique chaque changement (« +10 % car 3 séances sur 3 réalisées, effort 5/10 »).
- Option future : génération du programme par un modèle de langage, en gardant les règles ci-dessus comme garde-fous.
- Objectifs personnels modifiables (ex. 30 minutes de marche continue, 8 longueurs) avec jauge d'avancement.

## 6. Module 4 – Alimentation

Le suivi alimentaire reste volontairement léger : il sert à prendre conscience des habitudes, pas à compter chaque calorie.

**Fonctions de la v1**

- Journal de repas par jour (petit-déjeuner, déjeuner, dîner, collations) : texte libre, photo facultative, et un « bilan rapide » par repas (légumes oui / non, protéines oui / non, boisson sucrée oui / non, repas copieux oui / non).
- Hydratation : compteur de verres d'eau avec objectif quotidien.
- Poids et tour de taille : saisie hebdomadaire, courbe de tendance (moyenne glissante), sans affichage anxiogène du poids du jour.
- Repères personnalisés, par exemple : 5 fruits et légumes par jour, une source de protéines à chaque repas, limiter les produits ultra-transformés.
- Score hebdomadaire de régularité (jours où les repères sont tenus) affiché à côté du bilan sportif.

**Éducation alimentaire (dès la v1)**

- Une courte fiche par semaine (2 minutes de lecture) sur un seul thème : composition d'une assiette, protéines, fibres et légumes, boissons, lecture d'étiquettes, rythme des repas.
- Un seul défi par semaine, choisi dans la fiche (ex. un légume à chaque déjeuner), suivi dans le journal.
- Contenu rédigé avec Claude à partir de sources officielles (par exemple Santé publique France / Manger Bouger) puis vérifié avant intégration ; en cas de besoin, un diététicien reste la référence.

**Fonctions de la v2 (optionnelles)**

- Recettes et repas favoris réutilisables en un tap.
- Estimation des calories et des macronutriments via une base ouverte (par exemple Open Food Facts) avec saisie d'une portion.
- Idées de repas équilibrés adaptées aux jours d'entraînement.
- Corrélations simples : sommeil, énergie et alimentation.

**Garde-fous**

- Pas d'objectif calorique restrictif généré automatiquement : toute cible chiffrée est saisie par l'utilisateur ou validée avec un professionnel de santé ou un diététicien.
- Option pour masquer le poids et les calories si le suivi devient source de stress.

## 7. Modèle de données

L'application repose sur neuf entités ; le programme prévu et le réalisé sont séparés pour pouvoir toujours les comparer.

| Entité | Rôle | Champs principaux |
| --- | --- | --- |
| Profil | Paramètres de l'utilisateur | date de début, matériel, antécédents (genou), objectifs, unités |
| Exercice | Bibliothèque | nom, catégorie (marche, natation, renforcement, mobilité), variantes facile et difficile, contre-indications |
| Programme | Plan en cours | dates, numéro de version, motif de la révision |
| Séance prévue | Ce qui est planifié | date, type, liste d'exercices avec cibles (durée, séries, répétitions, repos), semaine |
| Séance réalisée | Ce qui a vraiment eu lieu | lien vers la séance prévue (facultatif), date, statut, valeurs réelles, effort 1 à 10, énergie, douleur, note |
| Bilan hebdomadaire | Synthèse et décision | semaine, taux de réalisation, ressenti moyen, règles appliquées, ajustements acceptés ou refusés |
| Repas | Journal alimentaire | date, type de repas, description, photo, bilan rapide |
| Hydratation | Compteur | date, nombre de verres, objectif |
| Mesure corporelle | Suivi du corps | date, poids, tour de taille |

**Relations clés.** Un programme contient des séances prévues ; une séance réalisée peut référencer une séance prévue ; un bilan hebdomadaire regroupe les séances de sa semaine et déclenche une nouvelle version du programme.

**Contraintes.** Identifiants uniques, dates au format ISO, historique conservé (jamais d'écrasement : une révision de programme crée une nouvelle version).

## 8. Écrans et parcours

Cinq écrans suffisent, accessibles par une barre de navigation en bas de l'écran du téléphone.

| Écran | Contenu | Action principale |
| --- | --- | --- |
| Aujourd'hui | Séance du jour, repas à saisir, verres d'eau, rappel du bilan | Valider la séance en un geste |
| Semaine | Calendrier des séances prévues et réalisées, ajout de séances futures, glisser-déposer pour les déplacer | Déplacer ou remplacer une séance |
| Progrès | Courbes, records, série en cours, bilans hebdomadaires | Ouvrir un bilan et accepter les ajustements |
| Alimentation | Journal du jour, hydratation, poids et tour de taille | Ajouter un repas ou un verre d'eau |
| Réglages | Profil, antécédents (genou), règles de progression, import de plans, export, sauvegarde | Modifier ses paramètres |

**Parcours clés**

1. Premier lancement : questionnaire de départ, génération du programme, validation par l'utilisateur.
2. Au quotidien : ouvrir « Aujourd'hui », faire la séance avec la minuterie, valider avec le ressenti.
3. Fin de semaine : lire le bilan, accepter ou ajuster la proposition, nouvelle semaine mise à jour.
4. Séance manquée : l'application propose de la reporter ou de la sauter, sans culpabiliser.

**Exigences d'interface.** Gros boutons utilisables à une main, mode sombre, textes lisibles en plein soleil, aucune saisie obligatoire en dehors de la validation de séance.

## 9. Exigences techniques

La solution retenue est une PWA (application web installable) hébergée gratuitement sur GitHub Pages : elle s'installe sur le téléphone Android depuis Chrome, fonctionne hors ligne et stocke les données sur le téléphone, sans serveur, sans compte et sans coût.

| Sujet | Recommandation | Alternative |
| --- | --- | --- |
| Type d'application | PWA : application web installée depuis Chrome sur Android (menu, Installer l'application) | APK Android via Capacitor, si une fonction native devient nécessaire un jour |
| Interface | TypeScript + React (ou Svelte) avec Vite | Tout framework que tu maîtrises déjà |
| Stockage | IndexedDB via une bibliothèque (ex. Dexie) | SQLite en WebAssembly, ou un petit serveur avec SQLite |
| Hors ligne | Service worker : l'application est mise en cache et fonctionne sans réseau après la première ouverture | — |
| Graphiques | Bibliothèque légère (ex. Recharts ou Chart.js) | SVG fait main |
| Moteur de progression | Module TypeScript pur, sans dépendance à l'interface, testé unitairement | — |
| Tests | Vitest pour le moteur, Playwright pour les parcours clés | — |
| Hébergement | GitHub Pages : gratuit, mise en ligne automatique à chaque modification du code | Cloudflare Pages ou Netlify, également gratuits |

**Exigences non fonctionnelles**

- Chargement en moins de 2 secondes, enregistrement d'une séance en un geste.
- Fonctionnement complet hors ligne, y compris la minuterie et les rappels de séance.
- Export et import des données en JSON, export CSV des séances et du journal.
- Sauvegarde manuelle simple (fichier) pour ne rien perdre en cas de changement de téléphone ; import des plans par fichier JSON via le sélecteur de fichiers Android, sans synchronisation automatique.
- Code organisé en modules (planning, suivi, progression, alimentation) pour que Claude Code puisse les construire un par un.
- Fichier de configuration pour les règles de progression, afin de les ajuster sans toucher au code.

**Transfert PC → application Android (décision)**

Le plus simple est d'importer un fichier JSON depuis l'application, sans reconstruire ni réinstaller l'application.

1. Sur le PC, on prépare ensemble le plan d'exercices ; Claude le génère dans un fichier JSON (`plan.json`) au format défini par l'application.
2. Le fichier est envoyé sur le téléphone par câble USB, cloud (Drive) ou mail.
3. Dans l'application : Réglages, Importer un plan, choix du fichier ; l'application contrôle le format, affiche un aperçu, puis remplace ou fusionne le programme.

Les données saisies restent dans le navigateur du téléphone et survivent aux mises à jour de l'application ; l'export JSON régulier sert de sauvegarde (effacer les données de Chrome les supprimerait).

**Hébergement gratuit (décision)**

1. Le code est publié dans un dépôt GitHub gratuit ; Claude Code configure la mise en ligne automatique sur GitHub Pages (GitHub Actions).
2. L'application est accessible à une adresse du type `https://<compte>.github.io/<nom-app>/`, sans nom de domaine à acheter.
3. Sur le téléphone, ouvrir l'adresse dans Chrome puis choisir Installer l'application : une icône apparaît sur l'écran d'accueil.
4. Chaque modification poussée sur GitHub met l'application à jour automatiquement.

Le site est public, mais il ne contient aucune donnée personnelle : vos séances, votre profil et vos plans restent sur le téléphone. Si vous préférez un code privé, Cloudflare Pages le permet gratuitement avec le même fonctionnement.

## 10. Santé, sécurité et vie privée

L'application accompagne la reprise d'activité mais ne remplace pas un avis médical ; les données de santé restent sur l'appareil de l'utilisateur.

**Santé**

- Avertissement au premier lancement : consulter un médecin avant de reprendre une activité physique après une longue inactivité.
- Question d'alerte au questionnaire de départ (douleurs thoraciques, malaises, problèmes cardiaques connus) qui déclenche un message invitant à un avis médical avant de commencer.
- Rappel dans chaque séance : arrêter en cas de douleur à la poitrine, vertige, palpitations inhabituelles ou essoufflement anormal.
- Progression plafonnée : jamais plus de 10 % d'augmentation de charge d'une semaine à l'autre, jours de repos obligatoires.
- Natation : rappel de ne jamais faire d'apnée ou d'hyperventilation seul.
- Alimentation : aucune recommandation restrictive automatique (voir module 4).

**Genou (antécédent articulaire déclaré)**

- Les antécédents sont enregistrés dans le profil ; chaque exercice de la bibliothèque porte un niveau d'impact sur le genou.
- Par défaut, la v1 privilégie la marche, le vélo et la nage en crawl, et exclut course, sauts et squats profonds ; les mouvements demandant une flexion marquée (ex. battement de brasse) sont signalés.
- Ces réglages sont des précautions, pas un avis médical ; l'utilisateur reste libre d'adapter la liste des exercices sous sa responsabilité.
- Douleur, gonflement ou sensation d'instabilité au genou : l'application propose d'arrêter la séance et suggère un avis médical.

**Vie privée et sécurité**

- Données stockées localement par défaut ; aucun suivi publicitaire ni outil d'analyse tiers.
- Aucune clé d'API ni information personnelle dans le dépôt de code.
- Si une synchronisation ou une intelligence artificielle distante est ajoutée plus tard : chiffrement en transit, consentement explicite, possibilité de tout supprimer.
- Bouton « Supprimer toutes mes données » dans les réglages.

## 11. Feuille de route et critères d'acceptation

Le développement se fait en cinq étapes ; l'application est utilisable dès la fin de l'étape 2, ce qui permet de commencer l'entraînement sans attendre le reste.

| Étape | Contenu | Critère d'acceptation |
| --- | --- | --- |
| 1. Socle | Projet, stockage local, bibliothèque d'exercices, profil (antécédents, matériel) et import de plans d'exercice | Les données survivent à un rechargement et fonctionnent hors ligne |
| 2. Planning + suivi | Programme initial de 12 semaines, vues Aujourd'hui et Semaine, validation de séance, minuterie | Une séance se valide en moins de 2 minutes ; le prévu et le réalisé s'affichent côte à côte |
| 3. Progression | Bilan hebdomadaire, règles de décision, explications des ajustements, courbes | Sur des données de test, chaque règle produit l'ajustement attendu (tests automatisés) |
| 4. Alimentation | Journal, hydratation, poids, score de régularité | Un repas se saisit en moins d'une minute ; la courbe de poids affiche une tendance |
| 5. Finitions | Export / import, mode sombre, rappels, installation de la PWA, mise en ligne sur GitHub Pages, sauvegarde | Export puis import restituent exactement les mêmes données |

**Critères transverses**

- Toute action courante tient en trois taps ou moins.
- Aucune perte de données lors des changements de version du programme.
- Les règles de progression sont couvertes par des tests automatisés.

## 12. Questions ouvertes et démarrage avec Claude Code

Toutes les questions de départ sont tranchées, y compris le format JSON des plans : l'étape 1 peut démarrer.

**Décisions prises**

- Disponibilités : l'utilisateur prévoit ses séances lui-même dans le calendrier et note ce qu'il a réalisé.
- Genou (antécédent articulaire déclaré) : exercices à faible impact par défaut, liste modifiable par l'utilisateur, sans validation médicale exigée par l'application.
- Plateforme : PWA hébergée gratuitement sur GitHub Pages et installée sur le téléphone Android pour le suivi ; l'ordinateur sert à préparer les plans, importés par fichier JSON.
- Alimentation : repères simples en v1, avec une éducation alimentaire progressive.

**Prochaine étape**

- [ ] Lancer l'étape 1 dans Claude Code avec le prompt ci-dessus, puis préparer ensemble le premier plan d'exercices au format JSON.

**Prompt de démarrage pour Claude Code (étape 1)**

```markdown
Tu vas développer une application web personnelle (PWA installable sur Android, hors ligne, données locales, déployée gratuitement sur GitHub Pages) de suivi de forme et d'alimentation, en suivant le cahier des charges ci-joint.
Commence par l'étape 1 (socle) :
1. Initialise un projet TypeScript + React + Vite avec Vitest.
2. Mets en place le stockage local (IndexedDB) et les entités du chapitre 7.
3. Crée la bibliothèque d'exercices, le profil (antécédents au genou) et l'import de plans d'exercice au format JSON.
4. Écris le moteur de progression comme un module pur et testé, avec les règles du chapitre 5 dans un fichier de configuration.
Avant de coder, propose-moi l'arborescence du projet et attends ma validation. Travaille par petits commits et explique chaque étape.
```

Conseil : place ce cahier des charges dans le dépôt sous le nom `CAHIER_DES_CHARGES.md` et ajoute un fichier `CLAUDE.md` résumant la stack, les commandes de test et les règles du chapitre 10, pour que Claude Code les retrouve à chaque session.
