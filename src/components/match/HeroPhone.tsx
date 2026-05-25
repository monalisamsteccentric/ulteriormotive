import Image from "next/image";
import { ArrowRight, Eye, MessageCircle, Radio } from "lucide-react";

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
      <div className="absolute left-6 right-6 top-14 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20 backdrop-blur-md">
            <Eye size={16} />
          </div>
          <span>Ulterior Motive Live</span>
        </div>
        <span className="rounded-full bg-[#ff176f] px-3 py-1 text-xs font-black shadow-glow">LIVE</span>
      </div>
      <div className="absolute bottom-28 left-6 right-6 z-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] backdrop-blur-md">
          <Radio size={13} /> Social deduction
        </div>
        <h2 className="max-w-[280px] text-3xl font-black leading-none tracking-normal text-white">{title}</h2>
        <p className="mt-3 max-w-[270px] text-xs font-semibold leading-5 text-white/85">{subtitle}</p>
      </div>
      <div className="absolute bottom-12 left-6 right-6 z-10 flex h-14 items-center justify-between rounded-full bg-white/35 px-2 pr-4 text-sm font-black text-white backdrop-blur-xl">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/25">
          <MessageCircle size={20} />
        </span>
        <span>Start guessing</span>
        <ArrowRight size={19} />
      </div>
    </article>
  );
}
