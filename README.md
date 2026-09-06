# Loto Unique

PWA statique mobile-first, compatible GitHub Pages.

## Démo

L'application est déployée ici :

https://flake9025.github.io/loto-check/

## Fonctionnalités

- sélection manuelle des 5 numéros + Numéro Chance ;
- Flash qui cherche une combinaison inédite lorsque l'historique est disponible ;
- vérification d'une combinaison dans l'historique ;
- indication des dates d'occurrence ;
- bouton « Améliorer pour la rendre unique » qui cherche une grille inédite en modifiant le minimum de numéros ;
- installation PWA sur Android et ajout à l'écran d'accueil sur iOS ;
- aucune donnée utilisateur ni backend applicatif.

## Données

`data/history.json` est généré à partir des archives publiques officielles de la FDJ. La FDJ publie les archives LOTO par périodes, dont l'historique depuis 1976. Les périodes antérieures à octobre 2008 ne sont pas utilisées pour le contrôle d'une combinaison actuelle de 5 numéros, car le jeu comportait alors 6 boules principales.

Le workflow GitHub Actions `Update Loto history` met à jour les données quotidiennement et peut être lancé manuellement.

L'application refuse de déclarer une grille « unique » si l'historique chargé est absent ou manifestement incomplet.

## GitHub Pages

1. Créer un dépôt GitHub et pousser le contenu.
2. Dans **Settings → Pages**, choisir **GitHub Actions**.
3. Lancer une fois l'action **Update Loto history**.
4. Le site est ensuite servi comme une PWA statique.

## Important sur l'« unicité »

Une combinaison jamais sortie n'a pas une probabilité supérieure au prochain tirage. L'application répond seulement à la question historique : « cette combinaison est-elle déjà apparue ? ».
