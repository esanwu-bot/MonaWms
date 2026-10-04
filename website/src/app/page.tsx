import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Pain from "@/components/Pain";
import Features from "@/components/Features";
import Mechanism from "@/components/Mechanism";
import Modules from "@/components/Modules";
import Stack from "@/components/Stack";
import Deploy from "@/components/Deploy";
import Demo from "@/components/Demo";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Pain />
        <Features />
        <Mechanism />
        <Modules />
        <Stack />
        <Deploy />
        <Demo />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
