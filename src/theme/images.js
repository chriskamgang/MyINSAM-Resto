// Images locales du design. Tant qu'une image vaut null, l'écran affiche
// un repli propre (dégradé + icône), donc l'app fonctionne sans elles.
//
// Pour ajouter une image : déposer le fichier dans assets/images/ puis
// remplacer null par require('../../assets/images/<fichier>').
export const IMAGES = {
  // Fond photo de l'écran de connexion / inscription (plat sur fond sombre)
  authBackground: require('../../assets/images/auth-bg.jpg'),

  // Bannière principale de l'accueil
  homeBanner: require('../../assets/images/banner-home.jpg'),

  // Illustration du chariot dans l'en-tête du panier (repli : icônes chariot + sac)
  cartHeader: require('../../assets/images/cart-header-cutout.webp'),

  // Vignettes des catégories de l'accueil (clé = slug de la catégorie)
  categories: {
    'plats-locaux': null, // require('../../assets/images/cat-plats-locaux.png')
    'fast-food':    null, // require('../../assets/images/cat-fast-food.png')
    grillades:      null, // require('../../assets/images/cat-grillades.png')
    boissons:       null, // require('../../assets/images/cat-boissons.png')
    desserts:       null, // require('../../assets/images/cat-desserts.png')
  },
};

// Icône de repli (Ionicons) pour les catégories sans image.
// Pas d'emoji : ils ne s'affichent pas sur tous les appareils.
const CATEGORY_ICONS = [
  [/local|camer|afric|tradi/i, 'restaurant'],
  [/fast|burger|pizza/i, 'fast-food'],
  [/grill|brais|poulet|viande/i, 'flame'],
  [/boisson|jus|drink|smoothie|bar/i, 'wine'],
  [/dessert|glace|patiss|gateau|gâteau/i, 'ice-cream'],
  [/poisson|mer/i, 'fish'],
  [/caf|petit.?d/i, 'cafe'],
];

export function categoryImage(slug) {
  return slug ? IMAGES.categories[slug] || null : null;
}

export function categoryIcon(name = '') {
  const hit = CATEGORY_ICONS.find(([re]) => re.test(name));
  return hit ? hit[1] : 'storefront';
}

// Photo d'attente pendant le chargement des images du menu distant.
export function dishFallbackImage(item = {}) {
  const label = `${item.name || ''} ${item.category?.name || ''} ${item.category_name || ''}`;
  if (/pizza/i.test(label)) return require('../../assets/images/category-pizza.jpg');
  if (/grill|brais|brochette|soya|barbecue/i.test(label)) return require('../../assets/images/category-grillades.jpg');
  if (/ndol|eru|okok|koki|foufou|taro|plantain|africain|cameroun/i.test(label)) return require('../../assets/images/category-cameroon-ndole.jpg');
  if (/dessert|cr[eê]pe|g[âa]teau|glace|sucr[eé]|chocolat/i.test(label)) return require('../../assets/images/home-dessert.jpg');
  return require('../../assets/images/home-grill-hero.jpg');
}
