import { useState, useEffect } from "react";

const useMediaQuery = (query: string, isEmbed?: boolean) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (isEmbed) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "layout") {
          const layout = event.data.layout;
          setMatches(layout === "app");
        }
      };
      window.addEventListener("message", handleMessage);

      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }
  }, [matches]);
  useEffect(() => {
    if (!isEmbed) {
      const media = window.matchMedia(query);
      if (media.matches !== matches) {
        setMatches(media.matches);
      }
      const listener = () => setMatches(media.matches);
      window.addEventListener("resize", listener);
      return () => window.removeEventListener("resize", listener);
    }
  }, [matches, query]);

  return matches;
};

export default useMediaQuery;
