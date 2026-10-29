import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-5 text-center">
      <div className="glow-field pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative">
        <Wordmark className="justify-center" />
        <p className="mt-10 font-display text-[7rem] leading-none text-primary/90 md:text-[9rem]">404</p>
        <h1 className="mt-4 font-display text-2xl md:text-3xl">This page isn't in your notes.</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted-foreground">The link may be outdated, or the page has moved.</p>
        <Link href="/" data-testid="link-not-found-home" className="press mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25">
          <ArrowLeft className="h-4 w-4" /> Back to Cogniva
        </Link>
      </div>
    </div>
  );
}
