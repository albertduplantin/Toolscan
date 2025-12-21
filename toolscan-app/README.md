# ToolScan

Application multi-tenant de vérification d'armoires d'outillage par vision par ordinateur et réalité augmentée.

## Stack Technique

- **Next.js 15** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** + **shadcn/ui** - Interface utilisateur
- **Clerk** - Authentification multi-tenant
- **Drizzle ORM** + **Neon** - Base de données PostgreSQL
- **Vercel** - Déploiement
- **Stripe** - Paiements

## Prérequis

- Node.js 18+ et npm
- Un compte Clerk (gratuit)
- Un compte Neon (gratuit)
- Un compte Vercel (optionnel pour le déploiement)

## Installation

1. **Cloner le projet**

```bash
git clone <votre-repo>
cd toolscan-app
```

2. **Installer les dépendances**

```bash
npm install
```

3. **Configurer les variables d'environnement**

Copiez le fichier `.env.example` en `.env.local` et remplissez les variables :

```bash
cp .env.example .env.local
```

Remplissez les variables :

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` et `CLERK_SECRET_KEY` : depuis votre dashboard Clerk
- `DATABASE_URL` : depuis votre dashboard Neon

4. **Initialiser la base de données**

```bash
npm run db:push
```

5. **Lancer le serveur de développement**

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Scripts disponibles

- `npm run dev` - Lancer le serveur de développement
- `npm run build` - Build pour la production
- `npm start` - Lancer le serveur de production
- `npm run lint` - Linter le code
- `npm run db:generate` - Générer les migrations Drizzle
- `npm run db:push` - Pousser le schéma vers la base de données
- `npm run db:studio` - Ouvrir Drizzle Studio

## Structure du projet

```
src/
├── app/                    # App Router Next.js
│   ├── (auth)/            # Routes d'authentification
│   ├── (dashboard)/       # Routes protégées
│   └── api/               # API routes
├── components/
│   └── ui/                # Composants shadcn/ui
├── lib/
│   ├── db/                # Configuration Drizzle
│   └── utils.ts           # Utilitaires
└── middleware.ts          # Middleware Clerk
```

## Documentation

Consultez les documents suivants pour plus d'informations :

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Architecture complète de l'application
- [DEPENDENCIES.md](../../DEPENDENCIES.md) - Liste des dépendances

## Déploiement

L'application est prête pour être déployée sur Vercel :

```bash
vercel
```

Assurez-vous de configurer les variables d'environnement dans votre dashboard Vercel.

## Licence

ISC
