import Link from "next/link";
import { Card, CardBody } from "@/components/ui";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 space-y-6">
      <h1 className="text-3xl font-semibold">About Fantasy Ekadashi</h1>
      <Card>
        <CardBody className="space-y-4 text-foreground/80">
          <p>
            Ekadashi is the eleventh day of each lunar fortnight — two per month,
            traditionally days of fasting and restraint. Fantasy Ekadashi turns
            that into a friendly bracket: on each Ekadashi you&apos;re paired with
            another player, and whoever logs the least phone time across the
            counted categories advances.
          </p>
          <h2 className="text-xl font-semibold text-foreground">Categories &amp; scoring</h2>
          <p>
            We score the sum of your iOS Screen Time categories — Social (every
            social app, WhatsApp &amp; Messages included), Games, Entertainment,
            Creativity, Health &amp; Fitness, Utilities, Shopping &amp; Food, and
            Other. Productivity &amp; Finance, Education, Information &amp;
            Reading, and Travel don&apos;t count. If you don&apos;t submit before
            the window closes, you&apos;re scored a full 24 hours.
          </p>
          <h2 className="text-xl font-semibold text-foreground">How screen time is verified</h2>
          <p>
            Web apps can&apos;t read OS screen time, so you upload a screenshot of
            your &ldquo;Show Categories&rdquo; view. Tesseract.js reads it in your
            browser; the screenshot is shared with your opponent for transparency,
            and they can dispute. The group admin settles disputes.
          </p>
          <h2 className="text-xl font-semibold text-foreground">Free forever</h2>
          <p>
            Built on Next.js + Supabase free tiers. No ads, no payment — login is
            a verified email + password.
          </p>
        </CardBody>
      </Card>
      <p className="text-center text-sm">
        <Link href="/" className="text-accent hover:underline">← Back home</Link>
      </p>
    </div>
  );
}
