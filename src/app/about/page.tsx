import Link from "next/link";
import { Card, CardBody } from "@/components/ui";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 space-y-6">
      <h1 className="text-3xl font-semibold">About Fantasy Ekadashi</h1>

      <Card>
        <CardBody className="prose prose-invert max-w-none space-y-4 text-foreground/80">
          <p>
            Ekadashi is the eleventh day of each fortnight in the Hindu lunar
            calendar. Two of them fall in every lunar month — one in the bright
            half (<em>Shukla Paksha</em>) and one in the dark half (
            <em>Krishna Paksha</em>) — and they&apos;ve traditionally been days
            for fasting, reflection, and a softer pace.
          </p>
          <p>
            Fantasy Ekadashi turns that intention into a friendly bracket.
            Create a league with friends. On every Ekadashi, you&apos;re
            randomly paired with another player. Whoever logs the least phone
            screen time that day wins and advances. Eliminations stack up over
            the lunar year. Last one standing takes the league.
          </p>

          <h2 className="text-xl font-semibold text-foreground">
            How dates are calculated
          </h2>
          <p>
            We compute the lunar phase astronomically using SunCalc and pick
            the calendar date containing the midpoint of each tithi-11 window.
            That avoids the &ldquo;skipped&rdquo; (<em>kshaya</em>) and
            &ldquo;doubled&rdquo; (<em>vriddhi</em>) tithi edge cases, so
            you&apos;ll get exactly one Ekadashi per half-month in your
            league&apos;s timezone.
          </p>

          <h2 className="text-xl font-semibold text-foreground">
            How screen time is verified
          </h2>
          <p>
            Web apps can&apos;t read your phone&apos;s OS-level screen time
            (Apple and Google reserve that for native apps). So after midnight
            on Ekadashi, you upload a screenshot of your iOS Screen Time or
            Android Digital Wellbeing summary. We run Tesseract.js
            <em> in your browser</em> to read the daily total — the image
            isn&apos;t shipped anywhere unless you save it. Once submitted, the
            screenshot is visible to your opponent for transparency, and they
            can dispute a result that looks off.
          </p>

          <h2 className="text-xl font-semibold text-foreground">
            Free forever
          </h2>
          <p>
            This site is built with Next.js + Supabase, both of which have
            generous free tiers. There&apos;s no ads, no analytics tracker, no
            payment. It&apos;s a hobby project — be kind to it.
          </p>
        </CardBody>
      </Card>

      <p className="text-center text-sm">
        <Link href="/" className="text-accent hover:underline">
          ← Back home
        </Link>
      </p>
    </div>
  );
}
