import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import DashboardShowcaseSection from "@/components/landing/DashboardShowcaseSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ObjectionsSection from "@/components/landing/ObjectionsSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import PricingSection from "@/components/landing/PricingSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <SocialProofSection />
        <DashboardShowcaseSection />
        <FeaturesSection />
        <ObjectionsSection />
        <HowItWorksSection />
        <FinalCTASection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

