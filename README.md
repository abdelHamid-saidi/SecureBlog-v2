# SecureBlog v2 — Authentification par JWT

API stateless : à la connexion, le serveur signe un JWT HS256 (15 minutes) et le transmet dans un cookie `HttpOnly`, `Secure` et `SameSite=Strict`. Les routes protégées vérifient ce jeton. Un JWT expiré ou altéré est rejeté.

## Lancer

```bash
docker compose up --build
```

Ouvrir [http://localhost:8080](http://localhost:8080).

Le conteneur Nginx écoute sur le port 80. Il est publié sur le port **8080**, car le port 80 est déjà utilisé par WAMP sur cette machine. L’API est exposée sur le port **4000**.

Pour arrêter :

```bash
docker compose down
```

## Architecture

| Service | Rôle | Port conteneur | Port hôte |
| --- | --- | --- | --- |
| `server` | API Express (Node.js) | 4000 | 4000 |
| `client` | Build Vite servi par Nginx, avec repli SPA vers `index.html` | 80 | 8080 |

Les comptes et les articles sont enregistrés dans `server/data/db.json` (volume bind).

```
client (React)  --fetch credentials: include-->  server :4000
                      CORS + cookie JWT
```

`CLIENT_URL` doit être exactement l’origine du navigateur (`http://localhost:8080`). Le cookie est `SameSite=Strict` : le client et l’API sont sur le même site (`localhost`), sur des ports différents.

## Authentification

- Signature **HS256** avec `jsonwebtoken`, expiration **15 minutes**.
- Cookie `token` : `HttpOnly`, `Secure`, `SameSite=Strict`.
- Pas de session serveur. La déconnexion efface le cookie.
- `requireAuth` répond `401` si le jeton est absent, expiré ou invalide.

`JWT_SECRET` dans `docker-compose.yml` est un secret de laboratoire. Le changer si la machine est exposée, puis recréer les conteneurs.

## Routes

| Méthode | Route | Accès |
| --- | --- | --- |
| `GET` | `/api/health` | public |
| `POST` | `/api/auth/register` | public |
| `POST` | `/api/auth/login` | public |
| `POST` | `/api/auth/logout` | public |
| `GET` | `/api/auth/me` | protégé |
| `GET` | `/api/articles` | public |
| `POST` | `/api/articles` | protégé |

Le mot de passe fait au moins 8 caractères. Il est stocké avec bcrypt.
