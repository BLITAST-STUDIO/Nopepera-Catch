import { createFileRoute } from "@tanstack/react-router";
import { NopperaGame } from "@/components/NopperaGame";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <NopperaGame />;
}
