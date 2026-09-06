# Loto Unique

PWA statique mobile-first, compatible GitHub Pages.

## Fonctionnalités

- sélection manuelle des 5 numéros + Numéro Chance ;
- Flash ;
- vérification d'une combinaison dans l'historique ;
- indication des dates d'occurrence ;
- bouton « Améliorer pour la rendre unique » qui cherche une grille inédite en modifiant le minimum de numéros ;
- installation PWA sur Android et ajout à l'écran d'accueil sur iOS ;
- aucune donnée utilisateur ni backend applicatif.

## Données

`data/history.json` est généré à partir des archives publiques de la FDJ. Le workflow GitHub Actions `Update Loto history` le met à jour quotidiennement et peut être lancé manuellement.

La FDJ reste la source officielle des résultats. Le script dépend de la structure de sa page d'archives et doit être contrôlé si celle-ci évolue.

## GitHub Pages

1. Créer un dépôt GitHub et pousser le contenu.
2. Dans **Settings → Pages**, choisir **GitHub Actions**.
3. Lancer une fois l'action **Update Loto history**.
4. Le site est ensuite servi comme une PWA statique.

## Important sur l'« unicité »

Une combinaison jamais sortie n'a pas une probabilité supérieure au prochain tirage. L'application répond seulement à la question historique : « cette combinaison est-elle déjà apparue ? ».
