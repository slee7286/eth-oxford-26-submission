import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  variant?: "default" | "glass" | "stat" | "action";
  accent?: "emerald" | "blue" | "amber";
}

const variantClasses = {
  default: "bg-zinc-900 border border-zinc-800",
  glass: "bg-zinc-900/60 backdrop-blur-xl border border-white/5",
  stat: "bg-zinc-900 border border-zinc-800",
  action: "bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/20",
};

const accentColors = {
  emerald: "border-t-emerald-500",
  blue: "border-t-blue-500",
  amber: "border-t-amber-500",
};

export function Card({
  children,
  className = "",
  hover,
  variant = "default",
  accent,
}: CardProps) {
  const statAccent =
    variant === "stat" && accent
      ? `border-t-2 ${accentColors[accent]}`
      : "";

  return (
    <div
      className={`${variantClasses[variant]} rounded-xl p-6 ${statAccent} ${
        hover
          ? "hover:border-zinc-700 transition-all duration-200 cursor-pointer"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-lg font-semibold text-zinc-100 ${className}`}>
      {children}
    </h3>
  );
}
