import { createContext, useContext, useEffect, useState } from "react";
import { getMe, loginUser, registerUser, updateMe } from "../api.js";
import { ls } from "../utils.js";

const AuthCtx = createContext();
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [next, setNext] = useState("/dashboard"); // where to go after login

  useEffect(() => {
    if (!ls.get("bm_token")) {
      setReady(true);
      return;
    }
    getMe()
      .then(setUser)
      .catch(() => ls.del("bm_token"))
      .finally(() => setReady(true));
  }, []);

  const save = ({ token, user }) => {
    ls.set("bm_token", token);
    setUser(user);
    return user;
  };
  const login = (f) => loginUser(f).then(save);
  const register = (f) => registerUser(f).then(save);
  const logout = () => {
    ls.del("bm_token");
    setUser(null);
  };
  const updateProfile = (f) => updateMe(f).then(setUser);

  return (
    <AuthCtx.Provider
      value={{
        user,
        ready,
        next,
        setNext,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
