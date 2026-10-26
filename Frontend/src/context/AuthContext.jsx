import { useEffect, useState } from "react";
import { getMe, loginUser, registerUser, updateMe } from "../api.js";
import { ls } from "../utils.js";
import { AuthCtx } from "./authContext.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(() => !ls.get("bm_token"));
  const [next, setNext] = useState("/dashboard"); // where to go after login

  useEffect(() => {
    if (!ls.get("bm_token")) return;
    let active = true;
    getMe()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) ls.del("bm_token");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
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
