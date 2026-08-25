import * as React from "react";
import { BREAKPOINTS } from "@/shared/constants";

export function useIsMobile() {
  // Inicial síncrono: com `undefined` o primeiro render era sempre "desktop",
  // montando/desmontando a árvore errada no celular (flash + efeitos duplicados).
  const [isMobile, setIsMobile] = React.useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth < BREAKPOINTS.MOBILE
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.MOBILE - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.MOBILE);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < BREAKPOINTS.MOBILE);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

