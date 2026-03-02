import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SearchBar from "@/components/SearchBar";
import NavigationGrid from "@/components/NavigationGrid";
import FluidBackground from "@/components/FluidBackground";
import Watermark from "@/components/Watermark";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center bg-white overflow-x-hidden font-sans">
      {/* Background Layers */}
      <FluidBackground />
      <Watermark />

      {/* Content Layer */}
      <Header />

      <main className="relative z-10 w-full flex flex-col items-center max-w-7xl mx-auto pt-20">
        <Hero />
        <SearchBar />
        <NavigationGrid />
      </main>

    </div>
  );
}
