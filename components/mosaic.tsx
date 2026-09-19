import { ArrowUpRight, Sparkles, Flower } from "lucide-react";
import { progress } from "@/lib/domain";
import type { MosaicTile } from "@/types";
const previews = [
  { alias: "Stay curious", avatar: "violet", discoveries: 6 },
  { alias: "Make a little room", avatar: "mint", discoveries: 1 },
  { alias: "Find your spark", avatar: "coral", discoveries: 3 },
  { alias: "Go somewhere new", avatar: "gold", discoveries: 0 },
  { alias: "A different perspective", avatar: "mint", discoveries: 0 },
  { alias: "More than a scroll", avatar: "violet", discoveries: 1 },
];
export function Mosaic({
  tiles,
  preview = false,
  ownId,
}: {
  tiles: MosaicTile[];
  preview?: boolean;
  ownId?: string;
}) {
  const items = preview
    ? previews.map((p, i) => ({
        ...p,
        id: String(i),
        photo_url: null,
        editorial: false,
      }))
    : tiles;
  return (
    <div
      className={preview ? "mosaic preview-mosaic" : "mosaic"}
      aria-label={preview ? "Illustrative mosaic preview" : "Community mosaic"}
    >
      {items.map((tile, index) => (
        <article
          key={tile.id}
          className={
            "tile " + tile.avatar + (tile.id === ownId ? " own-tile" : "")
          }
          style={{
            gridColumn:
              !preview && progress(tile.discoveries).size > 1
                ? "span 2"
                : undefined,
            gridRow:
              (!preview && progress(tile.discoveries).size === 3) ||
              (preview && index === 0)
                ? "span 2"
                : undefined,
          }}
        >
          {tile.photo_url ? (
            <img src={tile.photo_url} alt={tile.alias} loading="lazy" />
          ) : (
            <div className="tile-art" aria-hidden="true">
              {preview ? (
                index % 3 === 0 ? (
                  <Flower className="asterisk" size={190} strokeWidth={1.5} />
                ) : index % 3 === 1 ? (
                  <span className="orbit" />
                ) : (
                  <ArrowUpRight
                    className="stairs"
                    size={100}
                    strokeWidth={1.2}
                  />
                )
              ) : (
                <span className="initials">
                  {tile.alias.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          )}
          <div className="tile-caption">
            <span>{tile.alias}</span>
            {preview ? (
              <ArrowUpRight size={16} />
            ) : (
              <span className="tile-level">
                {tile.editorial ? "Editorial" : progress(tile.discoveries).name}
              </span>
            )}
          </div>
          {tile.id === ownId && (
            <span className="you-tag">
              <Sparkles size={12} /> You
            </span>
          )}
        </article>
      ))}
    </div>
  );
}
