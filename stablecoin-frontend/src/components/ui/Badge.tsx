import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "yellow" | "red" | "gray" | "blue";
  className?: string;
}

const variants = {
  green: "bg-emerald-900/50 text-emerald-400 border-emerald-800",
  yellow: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
  red: "bg-red-900/50 text-red-400 border-red-800",
  gray: "bg-zinc-800 text-zinc-400 border-zinc-700",
  blue: "bg-blue-900/50 text-blue-400 border-blue-800",
};

export function Badge({ children, variant = "gray", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
