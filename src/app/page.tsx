import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { APP_CONFIG } from '@/lib/config';
import {
  CalendarDays,
  Users,
  ClipboardCheck,
  Calculator,
  CreditCard,
  BarChart3,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏸</span>
            <span className="font-bold text-lg">{APP_CONFIG.name}</span>
          </div>
          <Link href="/login">
            <Button variant="default" size="sm" className="rounded-full px-6">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/10" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32 lg:py-40">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-6">
              <span className="text-base">🏸</span>
              Badminton Club Management
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
              Manage your club{' '}
              <span className="gradient-text">effortlessly.</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-4 max-w-xl">
              Schedule. Register. Play.{' '}
              <span className="text-foreground font-medium">Split costs automatically.</span>
            </p>

            <p className="text-muted-foreground mb-8 max-w-lg">
              The all-in-one platform for badminton clubs. Weekly scheduling, 
              smart attendance tracking, automatic cost splitting, and payment management.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/login">
                <Button size="lg" className="rounded-full px-8 text-base h-12 w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                  Continue with Google
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full px-8 text-base h-12 border border-input bg-background hover:bg-accent hover:text-accent-foreground font-medium transition-colors"
              >
                Learn More
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From scheduling to payment tracking, we handle the logistics so you can focus on playing.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: CalendarDays,
                title: 'Easy Registration',
                description: 'Browse upcoming sessions and register with a single tap. Get notified when registration opens.',
              },
              {
                icon: Users,
                title: 'Weekly Schedule',
                description: 'Automatic session generation from recurring schedules. Always know when and where to play.',
              },
              {
                icon: ClipboardCheck,
                title: 'Attendance Tracking',
                description: 'Accurate attendance records with set tracking. Know exactly who played and how much.',
              },
              {
                icon: Calculator,
                title: 'Smart Cost Splitting',
                description: 'Automatic cost calculation based on attendance and sets played. Fair and transparent.',
              },
              {
                icon: CreditCard,
                title: 'Payment Tracking',
                description: 'Track who has paid and who still owes. Upload payment proofs for easy verification.',
              },
              {
                icon: BarChart3,
                title: 'Financial Reports',
                description: 'Monthly reports, attendance charts, and payment summaries. Full visibility for admins.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border bg-card p-6 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                  <feature.icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 sm:py-28 bg-muted/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground text-lg">Simple steps to get started</p>
          </div>

          <div className="grid sm:grid-cols-5 gap-4 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Register', emoji: '✍️' },
              { step: '2', title: 'Join a Session', emoji: '🏸' },
              { step: '3', title: 'Play', emoji: '🎯' },
              { step: '4', title: 'Costs Calculated', emoji: '🧮' },
              { step: '5', title: 'Pay', emoji: '💰' },
            ].map((item, i) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-card border shadow-sm flex items-center justify-center mx-auto mb-3 text-2xl">
                  {item.emoji}
                </div>
                <div className="text-xs text-muted-foreground font-medium mb-1">Step {item.step}</div>
                <div className="font-semibold text-sm">{item.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to streamline your club?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Get started in seconds with your Google account. No setup required.
            </p>
            <Link href="/login">
              <Button size="lg" className="rounded-full px-8 text-base h-12 shadow-lg shadow-primary/25">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏸</span>
              <span className="font-semibold">{APP_CONFIG.name}</span>
              <span className="text-muted-foreground text-sm">— {APP_CONFIG.subtitle}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {APP_CONFIG.name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
