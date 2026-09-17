import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-block">
      <span
        className={`block font-display leading-none text-forest ${compact ? "text-xl" : "text-3xl"}`}
      >
        Operating Map
      </span>
      <span className="eyebrow mt-1 block">by Cascade Studios</span>
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border py-6 text-center">
      <p className="eyebrow">Cascade Studios · Atlanta · cascadestudios.co</p>
    </footer>
  );
}

export function Page({
  children,
  header = true,
  wide = false,
}: {
  children: ReactNode;
  header?: boolean;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto w-full px-5 pt-8 pb-10 ${wide ? "max-w-5xl" : "max-w-xl"}`}>
        {header ? (
          <div className="mb-8">
            <Wordmark />
          </div>
        ) : null}
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow mb-2">{children}</p>;
}

export function CodeText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`code-text ${className}`}>{children}</span>;
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="surface p-8 text-center">
      <p className="eyebrow">{label}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="surface border-terracotta p-6 text-center">
      <p className="text-sm text-terracotta-deep">{message}</p>
    </div>
  );
}
