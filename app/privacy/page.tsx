import Link from "next/link";
export const metadata = { title: "Privacy - Ulterior Motive" };
export default function Privacy() {
  return (
    <main className="legal shell">
      <Link href="/">Back to the mosaic</Link>
      <span className="eyebrow">YOUR SPACE, YOUR CHOICE</span>
      <h1>Privacy notice</h1>
      <p className="quiet">Effective 19 September 2026</p>
      <h2>What the experience stores</h2>
      <p>
        If you join, we create an anonymous account in Supabase and store your
        chosen display name, avatar colour, optional photo, consent version and
        timestamp, discovery records, and moderation status. No email address or
        password is requested from participants. Administrator accounts use an
        email address and password.
      </p>
      <h2>What becomes public</h2>
      <p>
        Your approved tile displays your name, avatar or photo, and discovery
        level. Photos are private until a moderator approves them. Do not upload
        sensitive images or identifying information you do not want others to
        see. Anyone can view or copy a publicly visible tile.
      </p>
      <h2>Why we use it</h2>
      <p>
        We use this information to run the mosaic, remember your progress,
        prevent duplicate rewards, moderate uploads, and display aggregate
        discovery analytics. A discovery means opening a content link; we do not
        monitor whether you read or finish it. We do not include advertising
        trackers or sell participant data.
      </p>
      <h2>Your browser and service providers</h2>
      <p>
        Supabase stores authentication tokens in browser local storage so you
        can return to your tile. Supabase provides authentication, database and
        image storage; AWS Amplify hosts the experience. Cloudflare Turnstile,
        when configured, processes browser and network signals to prevent
        automated abuse. These providers may process operational logs, including
        IP addresses, under their own terms. Short-lived hashed rate-limit
        identifiers are used for abuse prevention.
      </p>
      <h2>Retention and deletion</h2>
      <p>
        Your tile and discoveries remain until you delete them or the operator
        removes them. Use &quot;Delete my data&quot; in your tile panel on the
        home page to delete your anonymous account, profile, visits and stored
        photos. Deletion removes public visibility immediately; already issued
        image links expire within five minutes. Copies someone else saved and
        provider backups are not immediately erased by this action and remain
        subject to those providers&apos; retention policies.
      </p>
      <p>
        Your anonymous session belongs to this browser. Clearing its data,
        signing out, or using another device loses the ability to manage this
        tile. There is no email-based recovery. Delete your data before clearing
        the browser if you want it removed.
      </p>
      <h2>External content</h2>
      <p>
        Discovery links open independent websites. Those sites have their own
        privacy policies and may collect information when you visit them.
      </p>
      <h2>Questions or requests</h2>
      <p>
        Contact the organization that invited you to this experience using its
        published contact channel. It operates this mosaic and handles privacy
        requests. Do not include sensitive information in your public display
        name.
      </p>
      <Link className="button dark" href="/#experience">
        Manage my tile
      </Link>
    </main>
  );
}
