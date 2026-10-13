/* ==========================================================================
   NovaMart — shared product catalog (used by the grid, product pages, and the
   consent-gated personalization engine).
   ========================================================================== */
window.NM_ICONS = {
  headphones: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2" y="14" width="5" height="7" rx="1.5"/><rect x="17" y="14" width="5" height="7" rx="1.5"/>',
  laptop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
  coffee: '<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v2M12 3v2"/>',
  shoe: '<path d="M2 17h13l4-2 3 1v2a1 1 0 0 1-1 1H2z"/><path d="M2 17v-4l5-3 2 3 4-1"/>',
  tv: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  cart: '<circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h3l2.5 12h11L21 7H6"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2"/><path d="M8 9v6M12 9v6"/>'
};

window.NM_CATALOG = [
  { id: 1, name: "NovaSound Pro Wireless Headphones", brand: "NovaTech", category: "Electronics",
    price: 149.99, old: 229.99, rating: 5, tag: "sale", color: "#4f46e5", icon: "headphones",
    blurb: "Studio-grade active noise cancellation, 40-hour battery, and plush memory-foam ear cups for all-day listening.",
    features: ["Hybrid active noise cancellation", "40-hour battery, USB-C fast charge", "Multipoint Bluetooth 5.3", "Hi-Res certified audio"] },
  { id: 2, name: "AeroBook 14\" Ultralight Laptop", brand: "NovaTech", category: "Electronics",
    price: 899.00, old: null, rating: 4, tag: "new", color: "#12141C", icon: "laptop",
    blurb: "A 2.4 lb aluminium ultrabook with a 14\" 2.8K display and all-day battery — built for work anywhere.",
    features: ["14\" 2.8K 120Hz display", "16GB RAM · 512GB SSD", "18-hour battery life", "Weighs just 2.4 lb"] },
  { id: 3, name: "PureBrew Smart Coffee Maker", brand: "NovaHome", category: "Home",
    price: 79.99, old: 119.99, rating: 4, tag: "sale", color: "#0E9F6E", icon: "coffee",
    blurb: "App-scheduled brewing, precise temperature control, and a thermal carafe that keeps coffee hot for hours.",
    features: ["Schedule brews from the app", "Precision temperature control", "Thermal carafe, 12 cups", "Reusable gold-tone filter"] },
  { id: 4, name: "FlexFit Running Shoes", brand: "NovaSport", category: "Fashion",
    price: 64.99, old: 89.99, rating: 5, tag: "sale", color: "#E4002B", icon: "shoe",
    blurb: "Responsive foam midsole and a breathable knit upper that moves with every stride.",
    features: ["Energy-return foam midsole", "Breathable engineered knit", "Grippy all-terrain outsole", "Just 8.1 oz"] },
  { id: 5, name: "LumiGlow 4K Smart TV 55\"", brand: "NovaTech", category: "Electronics",
    price: 429.00, old: 599.00, rating: 4, tag: "sale", color: "#1b1e29", icon: "tv",
    blurb: "Quantum-dot 4K HDR picture with a 120Hz panel and the NovaOS smart platform built in.",
    features: ["55\" 4K QLED, 120Hz", "Dolby Vision & Atmos", "NovaOS with all major apps", "Hands-free voice remote"] },
  { id: 6, name: "GardenFresh Organic Grocery Box", brand: "NovaGrocery", category: "Grocery",
    price: 34.99, old: null, rating: 5, tag: "new", color: "#00A6A6", icon: "cart",
    blurb: "A weekly box of seasonal organic produce, sourced from regional farms and delivered same-day.",
    features: ["Seasonal organic produce", "Sourced from regional farms", "Same-day delivery", "Fully recyclable packaging"] },
  { id: 7, name: "CloudRest Memory Foam Pillow", brand: "NovaHome", category: "Home",
    price: 39.99, old: 59.99, rating: 4, tag: "sale", color: "#DB2777", icon: "home",
    blurb: "Adaptive memory foam with a cooling gel layer and a washable bamboo cover for cooler, deeper sleep.",
    features: ["Adaptive memory foam", "Cooling gel top layer", "Washable bamboo cover", "CertiPUR-US certified"] },
  { id: 8, name: "PowerCell 20K Portable Charger", brand: "NovaTech", category: "Electronics",
    price: 29.99, old: 44.99, rating: 5, tag: "sale", color: "#FFB100", icon: "battery",
    blurb: "A 20,000mAh power bank with 65W USB-C PD — enough to fast-charge a laptop or three phone top-ups.",
    features: ["20,000mAh capacity", "65W USB-C Power Delivery", "Charges laptops & phones", "Dual-device charging"] }
];

window.NM_STARS = function (n) {
  return '<span class="text-amber">' + "★★★★★".slice(0, n) + '</span>' +
         '<span class="text-slate-300">' + "★★★★★".slice(0, 5 - n) + '</span>';
};
window.NM_FIND = function (id) {
  id = parseInt(id, 10);
  for (var i = 0; i < window.NM_CATALOG.length; i++) if (window.NM_CATALOG[i].id === id) return window.NM_CATALOG[i];
  return null;
};
