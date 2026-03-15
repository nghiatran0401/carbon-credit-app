import Link from 'next/link';
import {
  Leaf,
  Satellite,
  Blocks,
  Globe2,
  ShieldCheck,
  TreePine,
  Users,
  Target,
  ArrowRight,
  BarChart3,
  Waves,
  Award,
} from 'lucide-react';

const values = [
  {
    title: 'Transparency',
    description:
      'Every credit is traceable from forest origin to retirement. On-chain audit trails ensure no double counting.',
    icon: ShieldCheck,
  },
  {
    title: 'Scientific Rigor',
    description:
      'AI models validated against ground-truth LiDAR data. Biomass estimates meet international MRV standards.',
    icon: Satellite,
  },
  {
    title: 'Local Impact',
    description:
      'Revenue flows back to Vietnamese forest communities. We prioritize projects that protect biodiversity and livelihoods.',
    icon: TreePine,
  },
  {
    title: 'Accessibility',
    description:
      'Local payment methods, Vietnamese language support, and simple onboarding lower the barrier to climate action.',
    icon: Users,
  },
];

const techStack = [
  {
    title: 'AI Forest Analysis',
    description:
      'Satellite imagery processed through deep learning models to estimate canopy cover, biomass density, and carbon sequestration potential.',
    icon: Satellite,
  },
  {
    title: 'Immutable Audit Trails',
    description:
      'Order and retirement records are stored in tamper-proof databases, enabling third-party verification at any time.',
    icon: Blocks,
  },
  {
    title: 'Graph-Based Tracking',
    description:
      'Carbon credit lifecycle — from issuance through trade to retirement — modeled as a knowledge graph for full supply-chain visibility.',
    icon: BarChart3,
  },
  {
    title: 'Verified Standards',
    description:
      "Credits aligned with VCS, Gold Standard, and Vietnam's national REDD+ framework for international compliance.",
    icon: Award,
  },
];

const milestones = [
  { year: '2024', event: 'Platform concept developed with focus on Vietnamese mangrove forests' },
  { year: '2025', event: 'AI biomass analysis engine launched with satellite integration' },
  { year: '2025', event: 'Marketplace opened with first verified forest projects listed' },
  { year: '2026', event: 'Immutable audit trails and carbon movement tracking deployed' },
];

export default function AboutPage() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-white via-green-50/40 to-white text-gray-900">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-green-200/40 blur-3xl" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="absolute left-1/3 top-[600px] h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
      </div>

      {/* Hero */}
      <section className="relative z-10 px-4 pt-12 pb-16 sm:pt-16 lg:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 mb-6">
            <Leaf className="h-4 w-4" />
            About EcoCredit
          </div>
          <h1 className="text-3xl leading-tight font-semibold text-gray-900 sm:text-4xl lg:text-5xl">
            Turning Vietnam&apos;s forests into a force for climate action
          </h1>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            EcoCredit is a carbon credit marketplace purpose-built for Vietnam. We connect forest
            conservation projects with buyers who need verified, audit-ready offsets — powered by AI
            analysis and immutable tracking.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="relative z-10 px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-600 p-8 shadow-lg">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div className="text-white space-y-4">
                <div className="flex items-center gap-3">
                  <Target className="h-8 w-8" />
                  <h2 className="text-2xl font-semibold">Our Mission</h2>
                </div>
                <p className="text-white/90 leading-relaxed">
                  Vietnam holds some of Southeast Asia&apos;s most valuable carbon sinks — from the
                  mangrove deltas of Can Gio to the highland forests of the Central Highlands. Yet
                  these ecosystems remain under-monetized and under-protected.
                </p>
                <p className="text-white/90 leading-relaxed">
                  EcoCredit exists to change that. We provide the technology and marketplace
                  infrastructure that lets forest managers quantify their carbon impact, issue
                  verified credits, and reach both domestic and international buyers — all while
                  ensuring every transaction is transparent, traceable, and tamper-proof.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/95 p-6 backdrop-blur">
                  <Globe2 className="h-8 w-8 text-emerald-600 mb-3" />
                  <p className="text-2xl font-bold text-gray-900">Net Zero</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Aligned with Vietnam&apos;s 2050 target
                  </p>
                </div>
                <div className="rounded-2xl bg-white/95 p-6 backdrop-blur">
                  <Waves className="h-8 w-8 text-emerald-600 mb-3" />
                  <p className="text-2xl font-bold text-gray-900">Mangroves</p>
                  <p className="text-sm text-gray-600 mt-1">5x more carbon than inland forests</p>
                </div>
                <div className="rounded-2xl bg-white/95 p-6 backdrop-blur">
                  <TreePine className="h-8 w-8 text-emerald-600 mb-3" />
                  <p className="text-2xl font-bold text-gray-900">14.6M ha</p>
                  <p className="text-sm text-gray-600 mt-1">Vietnam&apos;s total forest coverage</p>
                </div>
                <div className="rounded-2xl bg-white/95 p-6 backdrop-blur">
                  <ShieldCheck className="h-8 w-8 text-emerald-600 mb-3" />
                  <p className="text-2xl font-bold text-gray-900">REDD+</p>
                  <p className="text-sm text-gray-600 mt-1">National framework compliant</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="relative z-10 px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              What drives us
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-gray-900">Our core values</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {values.map((item) => (
              <div
                key={item.title}
                className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-transparent to-transparent opacity-60" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="relative mt-4 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="relative mt-2 text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="relative z-10 px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Our technology
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-gray-900">
              Built for trust and verification
            </h2>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
              Every layer of the platform is designed to make carbon credits more credible,
              auditable, and accessible.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {techStack.map((item) => (
              <div
                key={item.title}
                className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-transparent to-transparent opacity-60" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="relative mt-4 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="relative mt-2 text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="relative z-10 px-4 pb-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Our journey
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-gray-900">Key milestones</h2>
          </div>
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-emerald-200" />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <div key={i} className="relative flex gap-6 items-start">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold z-10">
                    {m.year.slice(2)}
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex-1">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                      {m.year}
                    </p>
                    <p className="mt-1 text-sm text-gray-700">{m.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-4 pb-20">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 p-10 text-white shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
                Ready to make an impact?
              </p>
              <h2 className="text-3xl font-semibold leading-tight">
                Start offsetting your carbon footprint today
              </h2>
              <p className="text-white/90">
                Browse verified Vietnamese forest projects, purchase credits with local payments,
                and receive audit-ready certificates in minutes.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Link
                href="/auth"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-emerald-700 font-semibold shadow-lg shadow-emerald-300/40 hover:-translate-y-0.5 transition whitespace-nowrap"
              >
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-white font-semibold hover:-translate-y-0.5 transition whitespace-nowrap"
              >
                Browse marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
