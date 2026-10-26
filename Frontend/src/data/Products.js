import blackDress from "../assets/black dress.jpg";
import blackGown from "../assets/download (1).jpg";
import whiteDress from "../assets/dress1.jpg";
import navyDress from "../assets/jama dress.jpg";
import redDress from "../assets/onepiece.jpg";
import anarkali from "../assets/dress2yany.jpg";
import blueSaree from "../assets/blue dress.jpg";
import zariSuit from "../assets/Black Zari Work Dupatta For Evening.jpg";
import blushBag from "../assets/_Bag yyy.jpg";
import mochaBag from "../assets/bags img.jps.jpg";
import whiteTop from "../assets/download.jpg";
import jeans from "../assets/jeans.jpg";
import formalSet from "../assets/formal dress.jpg";

// Fallback data (same as the MySQL seed). Used when the API is offline.
export const categories = [
  {
    slug: "dresses",
    name: "Dresses",
    image: blackDress,
  },
  {
    slug: "ethnic",
    name: "Ethnic Wear",
    image: anarkali,
  },
  {
    slug: "bags",
    name: "Bags",
    image: blushBag,
  },
  {
    slug: "western",
    name: "Tops & Bottoms",
    image: jeans,
  },
];

export const localProducts = [
  {
    id: 1,
    name: "Black Floral Tulle Gown",
    category: "dresses",
    price: 4999,
    oldPrice: 6499,
    image: blackDress,
    rating: 4.6,
    stock: 12,
    description:
      "Flowing tulle gown with a delicate floral print and tie shoulder straps.",
  },
  {
    id: 2,
    name: "Midnight Halter Gown",
    category: "dresses",
    price: 3799,
    oldPrice: 4999,
    image: blackGown,
    rating: 4.5,
    stock: 9,
    description:
      "Figure-hugging ruched halter gown for evenings and receptions.",
  },
  {
    id: 3,
    name: "White Bell-Sleeve Mini Dress",
    category: "dresses",
    price: 2499,
    oldPrice: 3299,
    image: whiteDress,
    rating: 4.4,
    stock: 15,
    description:
      "Light textured mini dress with ruched bodice and bell sleeves.",
  },
  {
    id: 4,
    name: "Navy Flare Party Dress",
    category: "dresses",
    price: 3299,
    oldPrice: null,
    image: navyDress,
    rating: 4.7,
    stock: 7,
    description: "Sweetheart neckline, puff sleeves and a full flared skirt.",
  },
  {
    id: 5,
    name: "Red Ruched Mini Dress",
    category: "dresses",
    price: 2899,
    oldPrice: 3699,
    image: redDress,
    rating: 4.3,
    stock: 11,
    description: "Statement red mini with ruched front and balloon sleeves.",
  },
  {
    id: 6,
    name: "Navy Anarkali with Dupatta",
    category: "ethnic",
    price: 5499,
    oldPrice: 6999,
    image: anarkali,
    rating: 4.8,
    stock: 6,
    description:
      "Floor-length anarkali with gold-edged dupatta for festive occasions.",
  },
  {
    id: 7,
    name: "Powder Blue Sequin Saree",
    category: "ethnic",
    price: 6999,
    oldPrice: 8999,
    image: blueSaree,
    rating: 4.7,
    stock: 5,
    description:
      "Lightweight saree with sequin border and a soft powder blue drape.",
  },
  {
    id: 8,
    name: "Black Zari Dupatta Suit",
    category: "ethnic",
    price: 5999,
    oldPrice: null,
    image: zariSuit,
    rating: 4.6,
    stock: 8,
    description:
      "Black suit paired with a maroon zari-work dupatta for evening wear.",
  },
  {
    id: 9,
    name: "Blush Chain Shoulder Bag",
    category: "bags",
    price: 3499,
    oldPrice: 4499,
    image: blushBag,
    rating: 4.5,
    stock: 20,
    description:
      "Structured blush bag with a gold chain strap and magnetic flap.",
  },
  {
    id: 10,
    name: "Mocha Crossbody Bag",
    category: "bags",
    price: 3999,
    oldPrice: null,
    image: mochaBag,
    rating: 4.6,
    stock: 14,
    description: "Everyday crossbody with chain-leather strap and zip closure.",
  },
  {
    id: 11,
    name: "White Cowl Halter Top",
    category: "western",
    price: 1299,
    oldPrice: 1799,
    image: whiteTop,
    rating: 4.2,
    stock: 25,
    description: "Soft draped cowl-neck halter top, easy to dress up or down.",
  },
  {
    id: 12,
    name: "Light Wash Wide-Leg Jeans",
    category: "western",
    price: 2799,
    oldPrice: null,
    image: jeans,
    rating: 4.4,
    stock: 18,
    description: "High-rise wide-leg jeans in a light wash with a relaxed fit.",
  },
  {
    id: 13,
    name: "Formal Shirt and Trouser Set",
    category: "western",
    price: 4499,
    oldPrice: 5499,
    image: formalSet,
    rating: 4.5,
    stock: 10,
    description: "Striped shirt with cream wide-leg trousers for the office.",
  },
];
