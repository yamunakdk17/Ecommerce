const cols = [
  [
    "Get to know Us",
    [
      "Careers",
      "Blog",
      "About Basemark",
      "Investor relations",
      "Basemark Devices",
    ],
  ],
  [
    "Shop with Us",
    ["Dresses", "Ethnic Wear", "Bags", "Tops & Bottoms", "Gift Cards"],
  ],
  [
    "Make Money with Us",
    ["Sell on Basemark", "Become an Affiliate", "Advertise Your Products"],
  ],
  [
    "Let Us Help You",
    ["Your Account", "Returns Centre", "Shipping Rates", "Help"],
  ],
];

export default function Footer() {
  return (
    <footer>
      <div
        className="foot-panel1"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        Back to Top
      </div>
      <div className="foot-panel2">
        {cols.map(([title, links]) => (
          <ul key={title}>
            <p>{title}</p>
            {links.map((l) => (
              <a key={l}>{l}</a>
            ))}
          </ul>
        ))}
      </div>
      <div className="foot-panel3">
        <div className="logo1"></div>
      </div>
      <div className="foot-panel4">
        <div className="pages">
          <a>Condition of use</a>
          <a>Privacy Notice</a>
          <a>Your Ads Privacy choices</a>
        </div>
        <div className="copyright">
          1996-2026, basemark, inc. or its affiliates
        </div>
      </div>
    </footer>
  );
}
