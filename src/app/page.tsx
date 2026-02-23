'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Satellite,
  Blocks,
  Map as MapIcon,
  LineChart,
  Globe2,
  CheckCircle2,
  Search,
  Database,
  Hash,
} from 'lucide-react';

const stats = [
  { label: 'Verified buyers and sellers', value: 18000, displayValue: '18k+' },
  {
    label: 'Tons of CO₂ tracked and monitored',
    value: 4800000,
    displayValue: '4.8M+',
  },
  {
    label: 'Forests listed on the marketplace',
    value: 100,
    displayValue: '100+',
  },
];

const trust = [
  {
    title: 'AI-Verified Forest Data',
    description:
      'Satellite and LiDAR-powered models track canopy health, biomass, and carbon absorption in real time.',
    icon: Satellite,
  },
  {
    title: 'Blockchain Transparency',
    description:
      'Immutable tracking from issuance to retirement. No double counting, auditable by design.',
    icon: Blocks,
  },
  {
    title: 'Vietnam-Focused',
    description:
      "Aligned with national net-zero roadmap and local policies. Built for Vietnam's forests and partners.",
    icon: Globe2,
  },
];

const features = [
  {
    title: 'AI-Powered Forest Credit Calculator',
    description:
      'Advanced AI models that calculate carbon credits from satellite images with high accuracy.',
    icon: MapIcon,
  },
  {
    title: 'Marketplace & Pricing',
    description: 'Compare credits by price, impact, and certification in a clean trading UI.',
    icon: LineChart,
  },
  {
    title: 'Secure Local Payments',
    description: 'Bank transfers, e-wallets, and cards. Optimized for Vietnam.',
    icon: ShieldCheck,
  },
  {
    title: 'Portfolio & Certificates',
    description: 'Track ownership, retirement, and download ESG-ready certificates instantly.',
    icon: CheckCircle2,
  },
];

const steps = [
  {
    title: 'Explore & Compare',
    description:
      'Browse verified Vietnamese forest projects with live impact data and transparent pricing.',
  },
  {
    title: 'Buy & Secure',
    description:
      'Purchase credits with local payments, lock ownership on-chain, and receive receipts instantly.',
  },
  {
    title: 'Track & Report',
    description: 'Monitor your offsets, retire credits, and export ESG-ready certificates anytime.',
  },
];

function AnimatedStat({
  value,
  displayValue,
  label,
}: {
  value: number;
  displayValue: string;
  label: string;
}) {
  const elementRef = useRef<HTMLParagraphElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;

    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          hasAnimated.current = true;
          const duration = 1500;
          const start = performance.now();
          const startValue = 0;

          const animate = (currentTime: number) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (value - startValue) * easedProgress);

            if (element) {
              if (value >= 1000000) {
                element.textContent = `${(currentValue / 1000000).toFixed(1)}M+`;
              } else if (value >= 1000) {
                element.textContent = `${(currentValue / 1000).toFixed(1)}k+`;
              } else {
                element.textContent = `${currentValue}+`;
              }
            }

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              if (element) {
                element.textContent = displayValue;
              }
            }
          };

          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [value, displayValue, label]);

  return (
    <p ref={elementRef} className="text-5xl font-bold text-emerald-700">
      {displayValue}
    </p>
  );
}

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-white via-green-50/40 to-white text-gray-900">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-green-200/40 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="absolute left-1/2 top-[420px] h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-200/30 blur-3xl" />
      </div>

      {/* Hero */}
      <section className="relative z-10 px-4 pt-12 pb-20 sm:pt-16 lg:pt-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-3xl leading-tight font-semibold text-gray-900 sm:text-4xl lg:text-5xl">
                  EcoCredit – Vietnam&apos;s Carbon Credit Platform
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Turn forest protection into climate action. Explore trusted projects, purchase
                  credits with local payments, and download audit-ready certificates in minutes.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-700 flex-shrink-0"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-emerald-700 ring-1 ring-emerald-100 shadow-sm transition hover:-translate-y-0.5 hover:ring-emerald-200 flex-shrink-0"
                >
                  Book a demo
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-8">
                {stats.map((item) => (
                  <div key={item.label}>
                    <AnimatedStat
                      value={item.value}
                      displayValue={item.displayValue}
                      label={item.label}
                    />
                    <p className="text-sm text-gray-600 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative h-[500px]">
              <Image
                src="/mangrove-forest.jpg"
                alt="Mangrove forest in Vietnam"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover rounded-3xl shadow-2xl"
                priority
              />
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-emerald-900/40 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="rounded-2xl bg-gradient-to-r from-emerald-600/70 to-emerald-500/70 p-5 text-white shadow-lg backdrop-blur-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
                        Verified certificate
                      </p>
                      <p className="mt-2 text-xl font-semibold">Mangrove Reserve | Can Gio</p>
                      <p className="text-sm text-white/80">1,200 credits · VCS · Issued 2026</p>
                    </div>
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-white/90">
                    <div>
                      <p className="text-xs text-white/70">Status</p>
                      <p className="font-semibold">On-chain</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/70">Retirement</p>
                      <p className="font-semibold">Available</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/70">Coverage</p>
                      <p className="font-semibold">Scope 1 & 2</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="relative z-10 px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-600 p-8 shadow-lg">
            <div className="grid gap-6 md:grid-cols-3">
              {trust.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/20 bg-white/95 p-6 shadow-sm backdrop-blur"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Public Verification CTA */}
      <section className="relative z-10 px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm overflow-hidden relative">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-50 blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Public Verification
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                  Don&apos;t trust us — verify it yourself
                </h2>
                <p className="text-gray-600 max-w-xl">
                  Every transaction on EcoCredit is hashed with SHA-256 and stored in an immutable
                  database. Enter any order ID to independently verify its authenticity — no account
                  required.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Hash className="h-4 w-4 text-emerald-600" />
                    SHA-256 hashing
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-emerald-600" />
                    immudb immutable storage
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Search className="h-4 w-4 text-emerald-600" />
                    Open verification
                  </span>
                </div>
              </div>
              <Link
                href="/verify"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-white font-semibold shadow-lg shadow-emerald-200 hover:-translate-y-0.5 hover:bg-emerald-700 transition whitespace-nowrap"
              >
                Verify a transaction
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="relative z-10 px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              What we do
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-gray-900">
              All-in-one carbon credit marketplace
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {features.map((item) => (
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

      {/* How it works */}
      <section className="relative z-10 px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-gray-900">
              Protect forests. Offset carbon. Build trust.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="absolute right-4 top-4 h-10 w-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-semibold">
                  0{index + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-3 text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-4 pb-20">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 p-10 text-white shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
                Join Vietnam&apos;s net-zero future
              </p>
              <h2 className="text-3xl font-semibold leading-tight">
                Protect forests. Offset carbon. Build trust.
              </h2>
              <p className="text-white/90">
                Unlock the full value of nature-based credits. Transparent, auditable, and ready for
                ESG reporting.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Link
                href="/auth"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-emerald-700 font-semibold shadow-lg shadow-emerald-300/40 hover:-translate-y-0.5 transition whitespace-nowrap"
              >
                Get started
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-white font-semibold hover:-translate-y-0.5 transition whitespace-nowrap"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
