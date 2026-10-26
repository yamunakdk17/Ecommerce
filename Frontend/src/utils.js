export const money = (n) => "Rs. " + Number(n).toLocaleString("en-IN");
export const discount = (p) =>
  p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
export const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// localStorage wrapper that falls back to memory if the browser blocks storage.
const mem = {};
export const ls = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return mem[k] ?? null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      mem[k] = v;
    }
  },
  del: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      delete mem[k];
    }
  },
};
