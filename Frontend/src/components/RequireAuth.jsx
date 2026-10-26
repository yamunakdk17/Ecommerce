import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Sends visitors to /login (and back afterwards) when the page needs an account.
export default function RequireAuth({ children }) {
  const { user, ready, setNext } = useAuth();
  const { pathname } = useLocation();
  const go = useNavigate();
  useEffect(() => {
    if (ready && !user) {
      setNext(pathname);
      go("/login");
    }
  }, [ready, user]);
  return user ? children : null;
}
