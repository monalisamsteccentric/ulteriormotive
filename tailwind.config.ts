import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#07070F",
        ink: "#171020",
        panel: "rgba(255,255,255,0.14)",
        line: "rgba(255,255,255,0.22)",
        mist: "rgba(255,255,255,0.72)",
        neon: "#3FE9FF",
        shock: "#FF176F",
        pink: "#FF4AA2",
        soft: "#FF9FC5",
        violet: "#8B5CF6"
      },
      boxShadow: {
        glow: "0 22px 80px rgba(255,23,111,0.34)"
      },
      keyframes: {
        glitch: {
          "0%,100%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px,1px)" },
          "40%": { transform: "translate(2px,-1px)" },
          "60%": { transform: "translate(-1px,-1px)" },
          "80%": { transform: "translate(1px,1px)" }
        }
      },
      animation: {
        glitch: "glitch 700ms steps(2,end) infinite"
      }
    }
  },
  plugins: []
};

export default config;
