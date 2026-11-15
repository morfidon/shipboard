import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import screenshot from "./shipboard-screenshot.png";

export default function Home() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-5xl font-bold tracking-tight">Shipboard</h1>
      <p className="max-w-md text-lg text-muted-foreground">
        Plan the work, track every issue and ship with confidence.
      </p>
      <Image
        src={screenshot}
        alt="Shipboard's project page: a list of issues, each with its status"
        sizes="(max-width: 768px) 100vw, 768px"
        loading="eager"
        className="w-full max-w-3xl rounded-xl border shadow-sm"
      />
      <div className="flex gap-3">
        <Link href="/sign-up" className={buttonVariants({ size: "lg" })}>
          Get started
        </Link>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Open the app
        </Link>
      </div>
    </section>
  );
}
