# Vocabulaire

Application web de révision de vocabulaire anglais par répétition espacée.
Fonctionne hors ligne, s'installe comme une application, et synchronise la
progression entre appareils pour qui se connecte avec un compte Google.

En ligne : <https://anglais-progres.netlify.app>

## Ce que fait l'application

Chaque mot revient juste avant d'être oublié. L'ordonnancement est confié à
**FSRS**, un algorithme de répétition espacée qui calcule un intervalle propre
à chaque carte d'après les réponses passées, plutôt que d'appliquer le même
barème à tout le monde.

La connexion est **facultative**. Sans compte, tout reste sur l'appareil et
rien ne sort du navigateur. Avec un compte, la progression et le catalogue de
paquets suivent d'un appareil à l'autre.

## Architecture

Le code est organisé en quatre couches, de la plus abstraite à la plus
concrète. Chaque couche ne connaît que celles au-dessus d'elle.

| Dossier      | Rôle                                                        |
| ------------ | ----------------------------------------------------------- |
| `src/domain` | Types et règles métier. Aucune dépendance technique.         |
| `src/engine` | Ordonnancement FSRS, sessions, quotas quotidiens.            |
| `src/data`   | Stockage local (IndexedDB), Supabase, synchronisation.       |
| `src/ui`     | Composants React et écrans.                                 |

Ce découpage a une conséquence pratique : la logique de révision est testable
sans navigateur ni base de données, ce que font les tests de `src/engine`.

## Contenu et données

Le **code** est déployé sur Netlify ; le **contenu** (paquets, cartes,
catégories) vit dans Supabase. Ajouter un paquet ou corriger une traduction
est donc une opération SQL, sans nouveau déploiement.

Deux paquets sont fournis avec l'application et fonctionnent sans compte :
langage collège américain et verbes irréguliers. Les autres viennent du
catalogue.

Point à connaître pour toute insertion en base : la table `decks` possède une
colonne `published` dont la valeur par défaut est `false`, et la règle de
sécurité n'expose que les paquets publiés. **Un paquet inséré sans
`published = true` reste invisible dans l'application, sans message
d'erreur.**

## Développement

```bash
npm install      # dépendances
npm run dev      # serveur local avec rechargement à chaud
npm run build    # vérification TypeScript puis compilation dans dist/
npm run test     # tests unitaires
npm run lint     # analyse statique
```

Node 22 ou plus récent.

## Configuration

L'application fonctionne sans configuration : l'URL et la clé Supabase ont des
valeurs par défaut dans `src/data/supabase.ts`. Cette clé est *publiable*,
elle est faite pour être exposée dans un navigateur ; la sécurité repose
entièrement sur les règles RLS de la base, pas sur son secret.

Pour pointer vers un autre projet Supabase, définir `VITE_SUPABASE_URL` et
`VITE_SUPABASE_KEY`.

## Déploiement

`netlify.toml` décrit la construction, Netlify n'a rien à configurer à la
main. Toute modification poussée sur la branche principale déclenche un
nouveau déploiement.

La redirection vers `index.html` est nécessaire : l'application est une page
unique, et sans elle un rechargement sur une sous-page renverrait une 404.

## Licence

Projet personnel, tous droits réservés.
