import { Translation, Language } from '../types';

export const translations: Translation = {
  // Navigation
  home: {
    en: 'Home',
    fr: 'Accueil',
    de: 'Startseite',
    es: 'Inicio',
    it: 'Home',
    pt: 'Início',
    ja: 'ホーム',
    ko: '홈',
    zh: '首页',
    ar: 'الرئيسية',
    hi: 'होम',
    ru: 'Главная'
  },
  menu: {
    en: 'Menu',
    fr: 'Menu',
    de: 'Speisekarte',
    es: 'Menú'
  },
  cart: {
    en: 'Cart',
    fr: 'Panier',
    de: 'Warenkorb',
    es: 'Carrito'
  },
  profile: {
    en: 'Profile',
    fr: 'Profil',
    de: 'Profil',
    es: 'Perfil'
  },
  
  // Authentication
  login: {
    en: 'Login',
    fr: 'Se connecter',
    de: 'Anmelden',
    es: 'Iniciar sesión'
  },
  signup: {
    en: 'Sign Up',
    fr: 'S\'inscrire',
    de: 'Registrieren',
    es: 'Registrarse'
  },
  email: {
    en: 'Email',
    fr: 'Email',
    de: 'E-Mail',
    es: 'Correo electrónico'
  },
  password: {
    en: 'Password',
    fr: 'Mot de passe',
    de: 'Passwort',
    es: 'Contraseña'
  },
  
  // Menu Upload
  uploadMenu: {
    en: 'Upload Menu',
    fr: 'Télécharger le menu',
    de: 'Speisekarte hochladen',
    es: 'Subir menú'
  },
  dragDropText: {
    en: 'Drag and drop your menu image here, or click to browse',
    fr: 'Glissez-déposez votre image de menu ici, ou cliquez pour parcourir',
    de: 'Ziehen Sie Ihr Menübild hierher oder klicken Sie zum Durchsuchen',
    es: 'Arrastra y suelta tu imagen de menú aquí, o haz clic para buscar'
  },
  
  // Menu Items
  addToBasket: {
    en: 'Add to Basket',
    fr: 'Ajouter au panier',
    de: 'In den Warenkorb',
    es: 'Añadir a la cesta'
  },
  price: {
    en: 'Price',
    fr: 'Prix',
    de: 'Preis',
    es: 'Precio'
  },
  
  // Cart
  basket: {
    en: 'Basket',
    fr: 'Panier',
    de: 'Warenkorb',
    es: 'Cesta'
  },
  quantity: {
    en: 'Quantity',
    fr: 'Quantité',
    de: 'Menge',
    es: 'Cantidad'
  },
  total: {
    en: 'Total',
    fr: 'Total',
    de: 'Gesamt',
    es: 'Total'
  },
  removeItem: {
    en: 'Remove Item',
    fr: 'Supprimer l\'article',
    de: 'Artikel entfernen',
    es: 'Eliminar artículo'
  },
  
  // General
  credits: {
    en: 'Credits',
    fr: 'Crédits',
    de: 'Guthaben',
    es: 'Créditos'
  },
  processing: {
    en: 'Processing...',
    fr: 'Traitement...',
    de: 'Verarbeitung...',
    es: 'Procesando...'
  }
};

export const translate = (key: string, language: Language): string => {
  return translations[key]?.[language] || key;
};