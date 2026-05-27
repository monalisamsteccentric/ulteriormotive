import Image from "next/image";
import { Eye, Radio } from "lucide-react";

type HeroPhoneProps = {
  image: string;
  title: string;
  subtitle: string;
  align?: "left" | "center" | "right";
  featured?: boolean;
};

export function HeroPhone({ image, title, subtitle, align = "left", featured }: HeroPhoneProps) {
  return (
    <article className={`phone-frame ${featured ? "phone-frame-mid" : ""} ${align === "center" ? "lg:-translate-y-4" : ""}`}>
      <Image src={image} alt="" fill priority={featured} sizes="(max-width: 768px) 88vw, 30vw" className="object-cover" />
      <div className="phone-status text-white">
        <span>9:41</span>
        <span className="tracking-[2px]">5G • •</span>
      </div>
      <div className="absolute left-5 right-5 top-14 z-10 flex items-center justify-between gap-3 sm:left-6 sm:right-6">
        <div className="flex min-w-0 items-center gap-2 text-sm font-bold sm:text-xs">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20 backdrop-blur-md">
            <Eye size={16} />
          </div>
          <span className="truncate">Ulterior Motive Live</span>
        </div>
        <span className="rounded-full bg-[#ff176f] px-3 py-1 text-sm font-black shadow-glow sm:text-xs">LIVE</span>
      </div>
      <div className="absolute bottom-28 left-5 right-5 z-10 sm:left-6 sm:right-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-sm font-black uppercase tracking-[0.08em] backdrop-blur-md sm:text-xs sm:tracking-[0.18em]">
          <Radio size={13} /> Social deduction
        </div>
        <h2 className="max-w-[300px] text-4xl font-black leading-none tracking-normal text-white sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-[300px] text-base font-semibold leading-7 text-white/90 sm:text-xs sm:leading-5">{subtitle}</p>
      </div>
    </article>
  );
}
