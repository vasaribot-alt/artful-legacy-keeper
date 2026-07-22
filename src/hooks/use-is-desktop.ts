import { useEffect, useState } from "react";

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const check = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isMobileOrTablet = /ipad|iphone|ipod|android|tablet|mobile/.test(ua);
      setIsDesktop(!isMobileOrTablet && window.innerWidth >= 1024);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return !!isDesktop;
}
