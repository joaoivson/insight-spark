import { useEffect } from "react";
import { setAffiliateRef } from "@/shared/utils/affiliate";
import SalesHeader from "@/features/landing/sales/SalesHeader";
import SalesHero from "@/features/landing/sales/SalesHero";
import SalesProblema from "@/features/landing/sales/SalesProblema";
import SalesComoFunciona from "@/features/landing/sales/SalesComoFunciona";
import SalesRoasReal from "@/features/landing/sales/SalesRoasReal";
import SalesPainelReal from "@/features/landing/sales/SalesPainelReal";
import SalesFuncionalidades from "@/features/landing/sales/SalesFuncionalidades";
import SalesPrecos from "@/features/landing/sales/SalesPrecos";
import SalesFAQ from "@/features/landing/sales/SalesFAQ";
import SalesFinalCTA from "@/features/landing/sales/SalesFinalCTA";
import SalesFooter from "@/features/landing/sales/SalesFooter";

const Index = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setAffiliateRef(ref);
  }, []);

  return (
    <div className="font-manrope bg-[#090D16] text-[#F5F7FA] min-h-screen">
      <SalesHeader />
      <main>
        <SalesHero />
        <SalesProblema />
        <SalesComoFunciona />
        <SalesRoasReal />
        <SalesPainelReal />
        <SalesFuncionalidades />
        <SalesPrecos />
        <SalesFAQ />
        <SalesFinalCTA />
      </main>
      <SalesFooter />
    </div>
  );
};

export default Index;
