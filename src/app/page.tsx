import Link from "next/link";
import { Moon, Trophy, Smartphone, Calendar } from "lucide-react";
import { getNextEkadashi } from "@/lib/ekadashi";
import { formatDate } from "@/lib/utils";
import { Button, Card, CardBody } from "@/components/ui";
import { CountdownToEkadashi } from "@/components/CountdownToEkadashi";

export default function Home() {
  const next = getNextEkadashi();

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      {/* Hero ------------------------------------------------------------ */}
      <section className="pt-12 sm:pt-20 pb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted">
          <Moon size={12} className="text-accent" />
          A fantasy bracket for people who&apos;d rather put their phone down
        </div>

        <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight leading-tight">
          Less screen time.
          <br />
          <span className="bg-gradient-to-r from-accent via-amber-300 to-accent-2 bg-clip-text text-transparent">
            More wins.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg text-foreground/70">
          Join a league. On every Ekadashi, you&apos;re paired with another player.
          Whoever logs the least phone screen time advances in the bracket.
          That&apos;s it.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <Link href="/sign-in">
            <Button size="lg">Start playing</Button>
          </Link>
          <Link href="/leagues/join">
            <Button size="lg" variant="secondary">
              Join with a code
            </Button>
          </Link>
        </div>
      </section>

      {/* Next Ekadashi ------------------------------------------------- */}
      <Card className="mt-6 overflow-hidden">
        <CardBody className="grid sm:grid-cols-2 gap-6 items-center">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
              <Calendar size={14} />
              Next Ekadashi
            </div>
            <h2 className="mt-2 text-2xl font-semibold">
              {formatDate(next.date)}
            </h2>
            <p className="mt-1 text-sm text-muted capitalize">
              {next.paksha} paksha · IST
            </p>
          </div>
          <div className="sm:text-right">
            <CountdownToEkadashi target={next.date.toISOString()} />
          </div>
        </CardBody>
      </Card>

      {/* How it works -------------------------------------------------- */}
      <section className="mt-16 sm:mt-24">
        <h2 className="text-2xl font-semibold text-center">How it works</h2>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: Calendar,
              title: "An Ekadashi arrives",
              body: "Twice a month, the lunar calendar gives us an Ekadashi — a traditional day for restraint and reflection.",
            },
            {
              icon: Smartphone,
              title: "You log your screen time",
              body: "After midnight, upload a screenshot of your iPhone Screen Time or Android Digital Wellbeing. OCR reads the number — or just type it in.",
            },
            {
              icon: Trophy,
              title: "Lowest time wins",
              body: "Whoever spent less time on their phone advances in the bracket. Last person standing wins the league.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardBody>
                <Icon size={24} className="text-accent" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-foreground/70">{body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* Honesty note -------------------------------------------------- */}
      <section className="mt-16 sm:mt-24 pb-16">
        <Card className="border-accent/20">
          <CardBody>
            <h3 className="font-semibold">A note on honesty</h3>
            <p className="mt-2 text-sm text-foreground/70">
              Web apps can&apos;t read your phone&apos;s screen time directly —
              that&apos;s why we ask for a screenshot. Tesseract.js reads the
              number in your browser (your photo never leaves your device unless
              you choose to share it with your opponent). Your opponent can
              dispute a result if it looks off. The whole thing runs on the
              honor system, which feels appropriate for a fasting day.
            </p>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
