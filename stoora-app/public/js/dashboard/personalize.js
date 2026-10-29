/**
 * Words that fit the seller's business type. A tutor sees Classes and Students, a yoga teacher
 * Sessions and Clients, and so on. Only labels change: the data and features are the same for everyone.
 * The type is chosen at sign-up and can be changed in Settings › General.
 */

const CATEGORY_WORDS = {
  tutoring: { products: 'Classes', customers: 'Students', services: true },
  fitness: { products: 'Sessions', customers: 'Clients', services: true },
  professional: { products: 'Services', customers: 'Clients', services: true },
  beauty: { products: 'Appointments', customers: 'Clients', services: true },
  food: { products: 'Menu', customers: 'Customers' },
  digital: { products: 'Downloads', customers: 'Customers' },
};

const wordsForCategory = () => CATEGORY_WORDS[USER && USER.category] || null;

function applyCategoryWords() {
  const words = wordsForCategory();
  if (!D.live || !words) return;
  const rename = (selector, text) =>
    document.querySelectorAll(selector).forEach((element) => {
      const label = element.querySelector('.l') || element;
      if (label.children.length === 0) label.textContent = text;
    });
  rename('.dnav [data-go="products"]', words.products);
  rename('.dnav [data-go="customers"]', words.customers);
  document.querySelectorAll('.drawer [data-go="customers"]').forEach((button) => {
    button.lastChild.textContent = ' ' + words.customers;
  });

  const title = document.querySelector('#screen .top .title span');
  if (title && route.name === 'products' && ui.prodTab === 'products') title.textContent = words.products;
  if (title && route.name === 'customers') title.textContent = words.customers;
}

/** A service business with nothing listed yet starts on the Services tab. */
live(V, 'products', (original) => {
  const words = wordsForCategory();
  if (words && words.services && !ui.prodTabChosen && !D.products.length) ui.prodTab = 'services';
  return original();
});
document.addEventListener(
  'click',
  (event) => {
    if (event.target.closest('[data-act="ptab"]')) ui.prodTabChosen = true;
  },
  true,
);

{
  const draw = renderLayer;
  renderLayer = function () {
    draw();
    applyCategoryWords();
  };
}
