import Link from "next/link";
import {
  Moon,
  Sparkles,
  HeartPulse,
  Brain,
  Leaf,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import { Card, CardBody, Button } from "@/components/ui";
import { MoonPhase } from "@/components/MoonPhase";
import { LunarDial } from "@/components/LunarDial";

export const metadata = {
  title: "What is Ekadashi?",
  description:
    "A visual guide to Ekadashi — the eleventh lunar day — what it is and why it matters.",
};

const PHASES = [
  { pos: 0, label: "New" },
  { pos: 0.125, label: "Waxing" },
  { pos: 0.25, label: "First qtr" },
  { pos: 0.375, label: "Ekadashi", highlight: true },
  { pos: 0.5, label: "Full" },
  { pos: 0.625, label: "Waning" },
  { pos: 0.75, label: "Last qtr" },
  { pos: 0.875, label: "Ekadashi", highlight: true },
];

const SIGNIFICANCE = [
  {
    icon: Leaf,
    title: "A rhythm with the moon",
    body: "The Hindu calendar follows the moon. Each 11th day after the new and full moon marks a natural pause — a built-in checkpoint twice a month, not a one-off resolution.",
  },
  {
    icon: HeartPulse,
    title: "Rest for the body",
    body: "Traditionally a fasting day. Lightening the digestive load is treated as a reset — a chance for the body to recover rather than constantly consume.",
  },
  {
    icon: Brain,
    title: "Discipline for the mind",
    body: "Ekadashi is less about going hungry and more about restraint: choosing what you take in, noticing cravings, and proving to yourself that you're in charge of them.",
  },
  {
    icon: Sparkles,
    title: "A spiritual reset",
    body: "Across traditions it's a day for reflection, devotion, and intention — clearing the noise so what actually matters has room to be heard.",
  },
];

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-20">
      {/* Hero */}
      <section className="relative pt-14 sm:pt-20 pb-10 text-center overflow-hidden">
        <div
          className="pointer-events-none absolute left-1/2 top-6 -z-10 h-64 w-64 -translate-x-1/2 rounded-full fe-glow"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--accent) 35%, transparent), transparent 70%)",
          }}
        />
        <div className="flex justify-center fe-float">
          <MoonPhase pos={0.5} size={120} glow />
        </div>
        <h1 className="mt-8 text-4xl sm:text-5xl font-semibold tracking-tight">
          What is{" "}
          <span className="bg-gradient-to-r from-accent via-amber-300 to-accent-2 bg-clip-text text-transparent">
            Ekadashi
          </span>
          ?
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-foreground/70">
          <span className="text-foreground">Ekadashi</span> (एकादशी) means
          &ldquo;the eleventh.&rdquo; It&apos;s the eleventh day of each half of
          the lunar month — a day traditionally set aside for fasting,
          reflection, and self-restraint.
        </p>
      </section>

      {/* Phase strip */}
      <Card className="mt-2">
        <CardBody>
          <p className="text-xs uppercase tracking-wider text-muted text-center">
            The moon over one month
          </p>
          <div className="mt-6 flex items-end justify-between gap-1 sm:gap-3 overflow-x-auto pb-2">
            {PHASES.map((ph, i) => (
              <div key={i} className="flex flex-col items-center gap-2 min-w-[44px]">
                <MoonPhase pos={ph.pos} size={48} />
                <span
                  className={`text-[10px] sm:text-xs text-center ${
                    ph.highlight ? "text-accent font-semibold" : "text-muted"
                  }`}
                >
                  {ph.label}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-foreground/70">
            As the moon waxes and wanes, the lunar month is split into two halves.
            The <span className="text-accent font-medium">eleventh day</span> of
            each half is an Ekadashi — so it comes around{" "}
            <span className="text-foreground">twice a month</span>.
          </p>
        </CardBody>
      </Card>

      {/* The two pakshas */}
      <section className="mt-10 grid sm:grid-cols-2 gap-4">
        <Card>
          <CardBody className="flex items-center gap-4">
            <MoonPhase pos={0.375} size={64} />
            <div>
              <h3 className="font-semibold">Shukla Ekadashi</h3>
              <p className="mt-1 text-sm text-foreground/70">
                In the <span className="text-foreground">waxing</span> half
                (Shukla paksha), as the moon grows from new toward full.
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center gap-4">
            <MoonPhase pos={0.875} size={64} />
            <div>
              <h3 className="font-semibold">Krishna Ekadashi</h3>
              <p className="mt-1 text-sm text-foreground/70">
                In the <span className="text-foreground">waning</span> half
                (Krishna paksha), as the moon shrinks from full toward new.
              </p>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Lunar dial */}
      <section className="mt-12 text-center">
        <h2 className="text-2xl font-semibold">Where it falls in the month</h2>
        <p className="mx-auto mt-2 max-w-lg text-foreground/70">
          A lunar month has 30 lunar days, called <em>tithis</em>. Count eleven
          from the new moon, and eleven from the full moon — those two points are
          the Ekadashis.
        </p>
        <Card className="mt-6 inline-block">
          <CardBody>
            <LunarDial />
          </CardBody>
        </Card>
      </section>

      {/* Significance */}
      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-center">Why it&apos;s significant</h2>
        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          {SIGNIFICANCE.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardBody>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/15 text-accent">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-foreground/70">{body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* The Fantasy Ekadashi twist */}
      <section className="mt-14">
        <Card className="border-accent/30 overflow-hidden relative">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--accent-2) 50%, transparent), transparent 70%)",
            }}
          />
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2 text-accent">
              <Smartphone size={20} />
              <span className="text-xs uppercase tracking-wider font-semibold">
                The Fantasy Ekadashi twist
              </span>
            </div>
            <h3 className="text-xl font-semibold">
              A fast for the digital age
            </h3>
            <p className="text-sm text-foreground/80">
              The heart of Ekadashi is restraint — consuming less, on purpose,
              and noticing what pulls at your attention. For most of us today,
              the thing that pulls hardest is a screen. Fantasy Ekadashi keeps
              the spirit of the day and points it at the modern craving: on each
              Ekadashi, you and another player compete to spend the{" "}
              <span className="text-foreground font-medium">
                least time on social, games, entertainment, and creativity apps
              </span>
              . Same idea, new appetite.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/sign-up">
                <Button size="lg">
                  Start your first Ekadashi <ArrowRight size={18} />
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="secondary">
                  How scoring works
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </section>

      <p className="mt-10 text-center text-sm">
        <Link href="/" className="text-muted hover:text-foreground inline-flex items-center gap-1">
          <Moon size={14} /> Back home
        </Link>
      </p>
    </div>
  );
}
