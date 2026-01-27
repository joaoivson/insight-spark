import { lazy, Suspense } from "react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load de seções pesadas para melhor performance
const HeroSection = lazy(() => import("@/components/landing/HeroSection"));
const SocialProofSection = lazy(() => import("@/components/landing/SocialProofSection"));
const HowItWorksSection = lazy(() => import("@/components/landing/HowItWorksSection"));
const FeaturesSection = lazy(() => import("@/components/landing/FeaturesSection"));
const DashboardShowcaseSection = lazy(() => import("@/components/landing/DashboardShowcaseSection"));
const ObjectionsSection = lazy(() => import("@/components/landing/ObjectionsSection"));
const PricingSection = lazy(() => import("@/components/landing/PricingSection"));
const FAQSection = lazy(() => import("@/components/landing/FAQSection"));
const FinalCTASection = lazy(() => import("@/components/landing/FinalCTASection"));

// Skeleton loader para seções
const SectionSkeleton = () => (
  <div className="py-24">
    <div className="container mx-auto px-4">
      <Skeleton className="h-12 w-64 mb-4 mx-auto" />
      <Skeleton className="h-6 w-96 mb-8 mx-auto" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Suspense fallback={<SectionSkeleton />}>
          <HeroSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <SocialProofSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <HowItWorksSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <FeaturesSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <DashboardShowcaseSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <ObjectionsSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <PricingSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <FAQSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <FinalCTASection />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default Index;

