import Link from "next/link";
export const metadata = { title: "Terms - Ulterior Motive" };
export default function Terms() {
  return (
    <main className="legal shell">
      <Link href="/">Back to the mosaic</Link>
      <span className="eyebrow">A LITTLE MUTUAL RESPECT</span>
      <h1>Terms of participation</h1>
      <p className="quiet">Effective 19 September 2026</p>
      <h2>Joining the mosaic</h2>
      <p>
        This experience is for people aged 18 and over. Participation is
        optional. By joining, you agree to these terms and acknowledge the
        privacy notice. Your display name, approved photo or avatar, and
        discovery level may appear publicly.
      </p>
      <h2>Your uploads</h2>
      <p>
        Only upload images you own or have permission to share publicly,
        including permission from anyone identifiable in them. Do not upload
        unlawful, hateful, sexual, exploitative, deceptive or harassing content,
        personal documents, or private information. You retain ownership of your
        image and allow the operator to resize, store and display it solely to
        run and moderate this experience until you delete it.
      </p>
      <h2>Discovery and growth</h2>
      <p>
        Each distinct content link you open while participating earns one
        discovery. Opening it again does not earn extra growth. Levels begin at
        0, 1, 3, 6 and 10 discoveries, with tile size increasing at 3 and 10.
        Levels and tile sizes are playful indicators with no monetary value,
        prizes or guaranteed placement. The mosaic shows a limited set of tiles
        at a time.
      </p>
      <h2>Community moderation</h2>
      <p>
        Uploaded participant photos are reviewed before appearing publicly.
        Moderators may hide tiles and disable content to protect the community.
        Hidden participants cannot earn further discoveries. Do not automate
        participation, evade moderation or interfere with other participants.
      </p>
      <h2>External websites</h2>
      <p>
        Content links take you to third-party websites. The operator does not
        control their content or availability. Use your own judgment when
        following links.
      </p>
      <h2>Leaving</h2>
      <p>
        You can remove your anonymous account, tile, uploaded photos and
        discovery records using &quot;Delete my data&quot; in your tile panel.
        Keep this browser&apos;s session until you have completed deletion;
        anonymous sessions cannot be recovered after browser data is cleared.
      </p>
      <h2>Availability and changes</h2>
      <p>
        The operator may update or discontinue the experience. These terms do
        not limit any rights that cannot lawfully be excluded. Contact the
        organization that invited you through its published contact channel for
        assistance.
      </p>
      <Link className="button dark" href="/">
        Back to the experience
      </Link>
    </main>
  );
}
