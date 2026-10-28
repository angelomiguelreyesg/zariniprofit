import { TrendingUp } from "lucide-react";

export default function Logo({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: { icon: "h-6 w-6", text: "text-base" },
    md: { icon: "h-8 w-8", text: "text-xl" },
    lg: { icon: "h-12 w-12", text: "text-3xl" },
  }[size];

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${sizes.icon} flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm`}
      >
        <TrendingUp className="h-[55%] w-[55%]" strokeWidth={2.5} />
      </div>
      <span
        className={`${sizes.text} font-bold tracking-tight text-slate-900 dark:text-white`}
      >
        Zarini<span className="text-brand-600 dark:text-brand-400">Profit</span>
      </span>
    </div>
  );
}
