import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, ScanLine, Shield, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ScanLine className="h-6 w-6" />
            <span className="text-xl font-bold">ToolScan</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Commencer</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-1 items-center">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-5xl font-bold tracking-tight">
              Vérifiez vos armoires d'outillage en un clin d'œil
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Utilisez la vision par ordinateur et la réalité augmentée pour
              détecter instantanément les outils manquants dans vos armoires.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline">
                  En savoir plus
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Fonctionnalités
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-full bg-primary p-3 text-primary-foreground">
                <ScanLine className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">
                Détection automatique
              </h3>
              <p className="text-muted-foreground">
                Scannez votre armoire et détectez automatiquement les outils
                manquants grâce à l'IA.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-full bg-primary p-3 text-primary-foreground">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Réalité augmentée</h3>
              <p className="text-muted-foreground">
                Visualisez en temps réel les emplacements des outils manquants
                directement sur votre écran.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-full bg-primary p-3 text-primary-foreground">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Multi-tenant</h3>
              <p className="text-muted-foreground">
                Gérez plusieurs organisations et utilisateurs avec des
                permissions granulaires.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 ToolScan. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
