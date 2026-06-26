import Link from "next/link";
import { Moon, Trophy, Smartphone, Calendar } from "lucide-react";
import { getNextEkadashiInZone } from "@/lib/ekadashi";
import { formatDate } from "@/lib/utils";
import { Button, Card, CardBody } from "@/components/ui";
import { CountdownToEkadashi } from "@/components/CountdownToEkadashi";
import { MoonPhase } from "@/components/MoonPhase";

const DISPLAY_TZ = "America/Los_Angeles";

export default function Home() {
  const next = getNextEkadashiInZone(new Date(), "Asia/Kolkata", DISPLAY_TZ);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <section className="relative pt-12 sm:pt-20 pb-10 text-center">
        <div className="flex justify-center fe-float">
          <MoonPhase pos={0.5} size={84} glow />
        </div>
        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted">
          <Moon size={12} className="text-accent" />
          A fantasy bracket for people who&apos;d rather put their phone down
        </div>
        <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight leading-tight">
          Less screen time.
          <br />
          <span className="fe-gradient-text">More wins.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-foreground/70">
          Join a group. On every Ekadashi, you&apos;re paired with another player.
          Whoever logs the least time on social, games, entertainment, and
          creativity advances in the bracket.
        </p>
        <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link href="/sign-up" className="contents">
            <Button size="lg" className="w-full sm:w-auto">Create account</Button>
          </Link>
          <Link href="/groups/join" className="contents">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">Join with a code</Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted">
          New to Ekadashi?{" "}
          <Link href="/learn" className="text-accent hover:underline">
            See what it&apos;s about
          </Link>
        </p>
      </section>

      <Card className="mt-6 overflow-hidden">
        <CardBody className="grid sm:grid-cols-2 gap-6 items-center">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
              <Calendar size={14} /> Next Ekadashi
            </div>
            <h2 className="mt-2 text-2xl font-semibold">{formatDate(next.date, DISPLAY_TZ)}</h2>
            <p className="mt-1 text-sm text-muted">
              <span className="capitalize">{next.paksha} paksha</span> · Los Angeles (PT)
            </p>
          </div>
          <div className="sm:text-right">
            <CountdownToEkadashi target={next.date.toISOString()} />
          </div>
        </CardBody>
      </Card>

      <section className="mt-16 sm:mt-24">
        <h2 className="text-2xl font-semibold text-center">How it works</h2>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {[
            { icon: Calendar, title: "An Ekadashi arrives", body: "Twice a month, the lunar calendar gives us an Ekadashi — a traditional day for restraint." },
            { icon: Smartphone, title: "You log four categories", body: "Upload your iOS Screen Time \u201cShow Categories\u201d screenshot. OCR reads Social, Games, Entertainment, and Creativity (WhatsApp & Messages are subtracted)." },
            { icon: Trophy, title: "Lowest total wins", body: "Whoever spent less time across those categories advances. Last person standing wins the group." },
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

      <section className="mt-16 sm:mt-24 pb-16">
        <Card className="border-accent/20">
          <CardBody>
            <h3 className="font-semibold">A note on honesty</h3>
            <p className="mt-2 text-sm text-foreground/70">
              Web apps can&apos;t read your phone&apos;s screen time directly, so
              we ask for a screenshot. Tesseract.js reads it in your browser, your
              opponent sees the same screenshot for transparency, and they can
              dispute anything that looks off. It runs on the honor system —
              fitting for a fasting day.
            </p>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
