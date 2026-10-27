import { createContext, useContext } from "react";

export const StoreContext = createContext(null);

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider");
  return context;
}
