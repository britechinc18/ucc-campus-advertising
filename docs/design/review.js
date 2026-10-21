/* Visual-review prototype only. No API calls, authentication or live mutations. */
const icons = {
  bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20.8 13.3A9 9 0 0 1 10.7 3.2a9 9 0 1 0 10.1 10.1Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  home: '<path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-7h6v7"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"/>',
  store:
    '<path d="M4 10v10h16V10M3 10l2-7h14l2 7"/><path d="M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0M9 20v-6h6v6"/>',
  list: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9 11h6m-6 5h6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  laptop: '<rect x="5" y="4" width="14" height="12" rx="1"/><path d="m5 16-3 4h20l-3-4"/>',
  book: '<path d="M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-6-1-9 1v15Z"/>',
  food: '<path d="M5 3v7m4-7v7M3 7h8M7 10v11m10 0V3c-4 2-4 9 0 10"/>',
  shirt: '<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c-1 3-7 3-8 0Z"/>',
  tools: '<path d="m14 5 5-3 3 3-3 5-4 1-9 10-3-3L13 9l1-4Z"/>',
  filter:
    '<path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="9" cy="18" r="2"/>',
  share:
    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-4M9 14l6 4"/>',
  flag: '<path d="M5 21V4c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  phone: '<path d="M5 3h4l2 5-3 2c1 3 3 5 6 6l2-3 5 2v4c0 3-7 3-13-3S2 3 5 3Z"/>',
  chat: '<path d="M21 11.5a9 9 0 0 1-13.5 8L3 21l1.5-4.5A9 9 0 1 1 21 11.5Z"/><path d="M8 8c0 4 2 6 6 7l2-2"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  users:
    '<circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m0-18a4 4 0 0 1 0 8m3 3c2 1 3 3 3 7"/>',
  settings:
    '<path d="m10 3-1 3-3 1-3 3 2 3-1 3 3 3 3-1 3 2 3-1 1-3 3-1 1-4-3-2V7l-3-2-3 1-2-3Z"/><circle cx="12" cy="12" r="3"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  close: '<path d="m5 5 14 14M5 19 19 5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.01"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.bag}</svg>`;
const photo = (key, cls = '', alt = '') =>
  `<img src="${window.DESIGN_PHOTOS[key]}" alt="${alt}" class="${cls}" />`;
const arrow = icon('arrow');
const wordmark = () =>
  `<a href="#home" class="wordmark" aria-label="UCC Med Market home"><span class="mark">${icon('bag')}</span><span>UCC <span class="med">Med</span> Market</span></a>`;
const themeButton = () =>
  `<button class="icon-btn" data-theme-toggle aria-label="Switch colour theme">${icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')}</button>`;
const listingData = [
  {
    image: 'headphones',
    title: 'Wireless headphones',
    price: 'GH₵180',
    location: 'Science Market',
    condition: 'Used',
    tag: '',
    age: '2h ago',
  },
  {
    image: 'laptop',
    title: 'MacBook Air · 13-inch',
    price: 'GH₵3,200',
    location: 'Amamoma',
    condition: 'Used',
    tag: '',
    age: '3h ago',
  },
  {
    image: 'books',
    title: 'Pre-loved reading bundle',
    price: 'GH₵75',
    location: 'School of Medical Sciences',
    condition: 'Used',
    tag: '',
    age: '4h ago',
  },
  {
    image: 'backpack',
    title: 'Everyday campus backpack',
    price: 'GH₵95',
    location: 'Kwaprow',
    condition: 'New',
    tag: '',
    age: '5h ago',
  },
  {
    image: 'phone',
    title: 'iPhone · excellent condition',
    price: 'GH₵1,850',
    location: 'Amamoma',
    condition: 'Used',
    tag: '',
    age: '6h ago',
  },
  {
    image: 'shoes',
    title: 'Red running shoes · size 42',
    price: 'GH₵140',
    location: 'Science Market',
    condition: 'Used',
    tag: '',
    age: '7h ago',
  },
];
function card(d, tag = '') {
  return `<a class="listing" href="#detail"><div class="listing-photo">${photo(d.image, '', d.title)}${tag ? `<span class="photo-tag">${tag}</span>` : ''}</div><h3 class="listing-title">${d.title}</h3><p class="price">${d.price}</p><div class="meta"><span>${d.condition}</span><span class="dot"></span><span>${d.location}</span></div></a>`;
}
function header(active = '') {
  return `<header class="site-header"><div class="container header-inner">${wordmark()}<nav class="desktop-nav" aria-label="Main navigation"><a href="#explore" class="${active === 'explore' ? 'active' : ''}">Explore</a><a href="#explore" data-category="all">Categories</a><a href="#businesses" class="${active === 'businesses' ? 'active' : ''}">Businesses</a></nav><div class="header-actions">${themeButton()}<a class="btn" href="#post">${icon('plus')}<span>Post<span class="hide-mobile"> advert</span></span></a><a class="avatar" href="#adverts" aria-label="My adverts">KA</a></div></div></header>`;
}
function bottomNav(active = '') {
  return `<nav class="bottom-nav" aria-label="Main navigation">${[
    ['home', 'home', 'Home'],
    ['explore', 'compass', 'Explore'],
    ['post', 'plus', 'Post'],
    ['businesses', 'store', 'Businesses'],
    ['adverts', 'list', 'My Adverts'],
  ]
    .map(
      ([screen, glyph, label]) =>
        `<a href="#${screen}" class="${screen === active ? 'active' : ''} ${screen === 'post' ? 'post-nav' : ''}" ${screen === active ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span></a>`,
    )
    .join('')}</nav>`;
}
const footer = () =>
  `<footer class="footer">${wordmark()}<p>Made for campus. Browse freely. Contact advertisers directly.</p><a href="#empty">Safe trading & help ${arrow}</a></footer>`;
const search = (placeholder = 'Search phones, books, services…', value = '') =>
  `<form class="search" data-search>${icon('search')}<label class="sr-only" for="search-input">Search adverts</label><input id="search-input" name="q" type="search" placeholder="${placeholder}" value="${value}" /><button class="btn" type="submit">Search ${arrow}</button></form>`;
const categories = () =>
  `<div class="categories" aria-label="Categories">${[
    ['laptop', 'Tech'],
    ['book', 'Books'],
    ['food', 'Food'],
    ['shirt', 'Fashion'],
    ['tools', 'Services'],
    ['home', 'Housing'],
  ]
    .map(
      ([glyph, name], i) =>
        `<a class="chip ${i > 2 ? 'desktop-category' : ''}" href="#explore">${icon(glyph)}${name}</a>`,
    )
    .join('')}<a class="chip only-mobile" href="#explore">More</a></div>`;
const section = (title, subtitle, data, tag = '') =>
  `<section class="section"><div class="section-head"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div><a class="text-link" href="#explore">View all ${arrow}</a></div><div class="listing-grid">${data.map((d) => card(d, tag)).join('')}</div></section>`;
function home() {
  return `${header()}<main class="container"><section class="hero"><div class="hero-main"><div><p class="eyebrow">THE UCC CAMPUS MARKETPLACE</p><h1><span class="desktop-copy">Good finds. Right around campus.</span><span class="only-mobile">Find it on campus.</span></h1><p class="muted">Buy, sell and discover services within your campus community.</p></div><div class="campus-note">${icon('shield')}<span>Adverts reviewed before publishing.<br />Contact advertisers directly.</span></div></div>${search()}${categories()}</section>${section('Fresh Finds', 'The latest to land on campus.', listingData.slice(0, 4))}<div class="feature-band"><div><h2>Something to offer campus?</h2><p>Give it a new home. Or help someone find what they need.</p></div><a href="#post" class="btn secondary">Post an advert ${arrow}</a></div>${section('Deals under GH₵100', 'Small prices. Useful finds.', [listingData[2], listingData[3]])}${section('Featured on campus', 'Selected listings worth a closer look.', [listingData[4], listingData[0]], 'FEATURED')}${section('Trending on Campus', 'Popular with the campus community.', [listingData[1], listingData[5]])}${footer()}</main>${bottomNav('home')}`;
}
const filterFields = () =>
  `<fieldset class="filter-group"><legend>Category</legend>${['All categories', 'Electronics', 'Books & stationery', 'Fashion', 'Food', 'Services', 'Housing'].map((s, i) => `<label class="check"><input type="radio" name="category" ${i === 0 ? 'checked' : ''} />${s}</label>`).join('')}</fieldset><fieldset class="filter-group"><legend>Price (GH₵)</legend><div class="field-inline"><input class="field-input" aria-label="Minimum price" placeholder="Min" inputmode="decimal" /><input class="field-input" aria-label="Maximum price" placeholder="Max" inputmode="decimal" /></div></fieldset><fieldset class="filter-group"><legend>Condition</legend><label class="check"><input type="checkbox" />New</label><label class="check"><input type="checkbox" />Used</label></fieldset><fieldset class="filter-group"><legend>Location</legend><label class="sr-only" for="location-filter">Campus location</label><select class="field-input" id="location-filter"><option>Anywhere on campus</option><option>Amamoma</option><option>Kwaprow</option><option>Science Market</option></select></fieldset>`;
function explore() {
  return `${header('explore')}<main class="container"><div class="page-head"><div><p class="eyebrow">DISCOVER ON CAMPUS</p><h1>Explore adverts</h1></div></div>${search()}<div class="mobile-filters"><button class="chip" data-open="filters">${icon('filter')}Filters</button><button class="chip" data-demo="Sort by newest, price or trending.">Newest ↓</button><button class="chip" data-open="filters">Price range</button></div><div class="explore-layout"><aside class="filter-sidebar"><div class="filter-title"><h3>Filters</h3><button data-demo="Filters cleared in this design preview.">Reset</button></div>${filterFields()}</aside><div><div class="results-head"><span><strong>6</strong> adverts around campus</span><label>Sort by <select aria-label="Sort adverts"><option>Newest first</option><option>Price: low to high</option><option>Price: high to low</option><option>Trending</option></select></label></div><div class="listing-grid">${listingData.map((d) => card(d)).join('')}</div><div class="load-more"><button class="btn secondary" data-demo="Production results will load from the API cursor.">Load more adverts</button><p>Showing 6 sample adverts for design review.</p></div></div></div>${footer()}</main>${bottomNav('explore')}`;
}
const contacts = () =>
  `<button class="btn" data-demo="Design preview: production opens the advertiser’s WhatsApp link.">${icon('chat')}WhatsApp</button><button class="btn secondary" data-demo="Design preview: production opens your phone dialler.">${icon('phone')}Call</button>`;
const safeNote = () =>
  `<div class="safe-note">${icon('shield')}<div><strong>Meet safely. Check before you pay.</strong>Meet in a public place and inspect the item. Never send money before you are satisfied.</div></div>`;
function detail() {
  return `${header()}<main class="container"><div class="breadcrumbs"><a href="#explore" class="text-link">${icon('back')}Back to Explore</a><span class="hide-mobile">/ Electronics / Headphones</span></div><div class="detail-grid"><div class="gallery"><div class="gallery-main">${photo('headphones', '', 'Wireless headphones with a yellow background')}<button class="icon-btn" data-open="photo" aria-label="Enlarge photograph">${icon('expand')}</button></div><p class="gallery-caption">${icon('shield')}Photograph supplied by the advertiser · 1 photo</p>${photo('headphones', 'thumbnail', 'Selected photograph')}</div><section class="detail-content"><p class="eyebrow">ELECTRONICS</p><h1>Wireless headphones</h1><div class="price-line"><p class="price">GH₵180</p><span class="meta">Negotiable</span></div><div class="attributes"><span class="chip">Used · Good condition</span><span class="chip">${icon('pin')}Science Market</span></div><div class="detail-actions"><button class="btn quiet" data-demo="Design preview: production opens sharing or copies the advert link.">${icon('share')}Share</button><button class="btn quiet" data-open="report">${icon('flag')}Report advert</button></div><div class="seller"><div class="avatar">KA</div><div><h3>Kwame A.</h3><p>Student advertiser · UCC</p></div></div><div class="contact-buttons">${contacts()}</div><p class="contact-note">Contact the advertiser directly. No checkout required.</p>${safeNote()}<p class="meta" style="margin-top:16px">Posted today · Advert UCC-001</p></section></div><section class="description"><h2>About this item</h2><p>Comfortable wireless headphones in good working condition. Great for lectures, studying and the walk back to the hostel. Selling because I have another pair.</p><ul><li>Charging cable included</li><li>Can meet around Science Market after lectures</li><li>You are welcome to test them before buying</li></ul></section>${section('You might also like', 'More finds around campus.', [listingData[4], listingData[1], listingData[3], listingData[2]])}${footer()}</main><div class="contact-bar">${contacts()}</div>`;
}
let postStep = 1;
function field(label, value, helper = '', type = 'text') {
  const id = `field-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return `<label class="form-group" for="${id}"><span class="form-label">${label}</span><input class="field-input" id="${id}" value="${value}" type="${type}" />${helper ? `<span class="helper">${helper}</span>` : ''}</label>`;
}
function detailsForm() {
  return `<h2>Tell us about your advert</h2><p>A few clear details help the right person find it.</p><div class="form-group"><span class="form-label">What are you posting?</span><div class="segmented" role="group" aria-label="Listing type"><button class="chip active" aria-pressed="true" data-type="product">An item</button><button class="chip" aria-pressed="false" data-type="service">A service</button><button class="chip" aria-pressed="false" data-type="wanted">Wanted</button></div></div>${field('Advert title', 'Wireless headphones', 'Be specific. Keep it clear and easy to search.')}<label class="form-group"><span class="form-label">Category</span><select class="field-input"><option>Electronics</option><option>Books & stationery</option><option>Fashion</option><option>Services</option></select></label><div class="field-inline"><label class="form-group"><span class="form-label">Price (GH₵)</span><input class="field-input" type="number" value="180" /></label><label class="form-group"><span class="form-label">Price type</span><select class="field-input"><option>Negotiable</option><option>Fixed price</option><option>Free</option><option>Contact for price</option></select></label></div><label class="form-group"><span class="form-label">Condition</span><select class="field-input"><option>Used</option><option>New</option></select></label><label class="form-group"><span class="form-label">Description <small>20–5,000 characters</small></span><textarea class="field-input">Comfortable wireless headphones in good working condition. Charging cable included. Available around Science Market after lectures.</textarea></label>${field('Campus location', 'Science Market')}<div class="form-bottom"><a href="#adverts" class="btn secondary">Cancel</a><button class="btn" data-step="2">Continue ${arrow}</button></div>`;
}
function photosForm() {
  return `<h2>Photos & contact</h2><p>Help buyers see what you are offering and reach you.</p><div class="upload-grid">${photo('headphones', '', 'Sample cover photo')}<button class="upload-tile" data-demo="Photo selection will use the existing signed-upload API.">${icon('upload')}Add photo</button><div class="upload-tile" style="border-color:var(--border);background:transparent;color:var(--muted)">Up to 5<br />photos</div></div><p class="helper">Cover photo first. JPEG, PNG or WebP · up to 5 MB each.</p><button class="text-link btn quiet" data-demo="Production will support keyboard-accessible photo reordering and removal.">Manage photos ${arrow}</button>${field('Phone number', '024 000 0000', 'Sample number for this design preview.', 'tel')}${field('WhatsApp number', '024 000 0000', '', 'tel')}<label class="check" style="margin-top:24px;align-items:flex-start"><input type="checkbox" checked /><span>I agree to publish these contact details on my advert so buyers can reach me.</span></label><div class="form-bottom"><button class="btn secondary" data-step="1">${icon('back')}Back</button><button class="btn" data-step="3">Review advert ${arrow}</button></div>`;
}
function reviewForm() {
  return `<h2>Looking good?</h2><p>Check your advert before sending it for review.</p><div class="seller">${photo('headphones', '', 'Sample advert thumbnail').replace('<img ', '<img style="width:72px;height:64px;object-fit:cover;border-radius:7px" ')}<div><h3>Wireless headphones</h3><p class="price" style="font-size:18px">GH₵180</p></div></div>${[
    ['Category', 'Electronics'],
    ['Condition', 'Used'],
    ['Price type', 'Negotiable'],
    ['Location', 'Science Market'],
    ['Photos', '1 photo'],
    ['Contact', 'Phone & WhatsApp'],
  ]
    .map(([k, v]) => `<div class="summary-line"><span>${k}</span><strong>${v}</strong></div>`)
    .join(
      '',
    )}<div class="inline-notice">${icon('clock')}<div><strong>Reviewed before it goes live</strong>Your advert will appear after an administrator approves it. This submission uses one of your daily slots.</div></div><p class="helper" style="margin-top:16px">Demo allowance: 2 of 3 submissions available today.</p><div class="form-bottom"><button class="btn secondary" data-step="2">${icon('back')}Back</button><button class="btn" data-demo="Design preview only. No advert was submitted.">Submit for approval ${arrow}</button></div>`;
}
function post() {
  return `${header()}<main class="container"><div class="post-layout"><div class="post-heading"><div><h1>Post an advert</h1><p>Make your next campus connection.</p></div><a href="#adverts" class="text-link">My adverts ${arrow}</a></div><div class="steps">${['Details', 'Photos & contact', 'Review & submit'].map((label, i) => `<div class="step ${postStep === i + 1 ? 'current' : ''} ${postStep > i + 1 ? 'complete' : ''}" ${postStep === i + 1 ? 'aria-current="step"' : ''}><span>${postStep > i + 1 ? '✓' : i + 1}</span>${label}</div>`).join('')}</div><div class="post-columns"><section class="panel form-panel">${postStep === 1 ? detailsForm() : postStep === 2 ? photosForm() : reviewForm()}</section><aside class="posting-guide"><h3>A good advert goes further.</h3><p>Use a clear title, honest description and bright photos of your actual item.</p><p>Keep contact details in the contact fields. Never include sensitive personal information.</p><div class="allowance"><p class="eyebrow">SAMPLE POSTING ALLOWANCE</p><p><strong>2 of 5</strong><small>active slots used</small></p><div class="progress"><span></span></div><p>2 submissions left today.<br />Approved adverts run for 30 days.</p></div></aside></div></div>${footer()}</main>${bottomNav('post')}`;
}
const stat = (label, value, note = '') =>
  `<div class="stat"><span>${label}</span><strong>${value}</strong>${note ? `<p>${note}</p>` : ''}</div>`;
const badge = (label, cls = '') =>
  `<span class="badge ${cls}"><span class="dot"></span>${label}</span>`;
const ownAds = [
  { item: listingData[0], status: 'Live', cls: '', note: 'Expires in 24 days', tab: 'live' },
  {
    item: listingData[2],
    status: 'Pending approval',
    cls: 'pending',
    note: 'Submitted today',
    tab: 'pending',
  },
  {
    item: listingData[3],
    status: 'Changes requested',
    cls: 'rejected',
    note: 'Add a clearer photo of the item.',
    tab: 'rejected',
  },
  {
    item: listingData[5],
    status: 'Sold',
    cls: 'neutral',
    note: 'Marked sold on 18 October',
    tab: 'sold',
  },
];
function advertRows(filter = 'all') {
  return ownAds
    .filter((d) => filter === 'all' || d.tab === filter)
    .map(
      (d) =>
        `<article class="advert-row">${photo(d.item.image, '', d.item.title)}<div class="row-main"><h3>${d.item.title}</h3><div class="price">${d.item.price}</div><p>${d.note}</p></div><div class="row-status">${badge(d.status, d.cls)}<p>${d.item.location}</p></div><button class="btn secondary small" data-open="manage" data-ad-status="${d.tab}">Manage ${icon('chevron')}</button></article>`,
    )
    .join('');
}
function adverts() {
  return `${header()}<main class="container"><div class="page-head"><div><p class="eyebrow">YOUR CAMPUS CORNER</p><h1>My adverts</h1><p>Keep your listings up to date, all in one place.</p></div><a href="#post" class="btn">${icon('plus')}Post advert</a></div><div class="stats">${stat('Live adverts', '1')}${stat('Pending approval', '1')}${stat('Changes requested', '1')}${stat('Sold', '1')}</div><div class="dashboard-grid"><section><div class="tabs" role="group" aria-label="Advert status">${[
    ['all', 'All', '4'],
    ['live', 'Live', '1'],
    ['pending', 'Pending', '1'],
    ['rejected', 'Rejected', '1'],
    ['sold', 'Sold', '1'],
  ]
    .map(
      ([key, label, count], i) =>
        `<button class="${i === 0 ? 'active' : ''}" aria-pressed="${i === 0}" data-ad-filter="${key}">${label}<span>${count}</span></button>`,
    )
    .join(
      '',
    )}</div><div id="own-adverts">${advertRows()}</div></section><aside class="dashboard-aside"><div class="panel"><h3>Your posting allowance</h3><p><strong style="color:var(--ink)">2 of 5</strong> active slots reserved</p><div class="progress"><span></span></div><p>You can submit 2 more new adverts today.</p><p style="margin-top:16px">Pending adverts reserve a slot. Editing an existing advert does not use another daily submission.</p></div><div class="safe-note">${icon('info')}<span>These are sample counts. Your live dashboard will use your actual posting activity.</span></div></aside></div>${footer()}</main>${bottomNav('adverts')}`;
}
const businessData = [
  [
    'CT',
    'Campus Tech Corner',
    'Electronics & accessories',
    'Amamoma',
    'Practical tech, accessories and everyday essentials close to campus.',
  ],
  [
    'PP',
    'Paper & Pages',
    'Books & stationery',
    'Science Market',
    'Pre-loved books, study supplies and printing support for busy students.',
  ],
  [
    'CF',
    'Campus Fit',
    'Clothing & accessories',
    'Kwaprow',
    'Everyday campus wear and well-kept second-hand finds.',
  ],
];
function businesses() {
  return `${header('businesses')}<main class="container"><div class="page-head"><div><p class="eyebrow">CLOSE TO CAMPUS</p><h1>Local businesses</h1><p>Discover the people and services around you.</p></div></div>${search('Search businesses and services…')}<div class="business-grid">${businessData.map(([initials, name, category, location, desc]) => `<article class="panel business-card"><div class="business-logo">${initials}</div><h2>${name}</h2><p>${category} · ${location}</p><p>${desc}</p><a class="text-link" href="#business">View business ${arrow}</a></article>`).join('')}</div><div class="feature-band"><div><h2>Run a campus business?</h2><p>Create a profile and help students find you.</p></div><a class="btn secondary" href="#adverts">Get started ${arrow}</a></div>${footer()}</main>${bottomNav('businesses')}`;
}
function business() {
  return `${header('businesses')}<main class="container"><div class="breadcrumbs"><a class="text-link" href="#businesses">${icon('back')}Back to businesses</a></div><section class="business-hero"><div class="business-identity"><div class="business-logo">CT</div><div><p class="eyebrow">CAMPUS BUSINESS</p><h1>Campus Tech Corner</h1><p>Electronics & accessories · Amamoma</p></div></div><div class="contact-buttons">${contacts()}</div></section><section class="description" style="border-top:0;margin-top:0"><h2>A little about us</h2><p>Practical tech, accessories and everyday essentials close to campus. Contact us for availability or browse our current adverts below. Meet-up available around Amamoma.</p></section>${section('Adverts from this business', 'Currently available on campus.', [listingData[1], listingData[0], listingData[4]])}${safeNote()}${footer()}</main>${bottomNav('businesses')}`;
}
const adminItems = [
  ['admin', 'grid', 'Overview'],
  ['queue', 'clock', 'Pending queue'],
  ['queue', 'list', 'All adverts'],
  ['queue', 'flag', 'Reports'],
  ['queue', 'users', 'Advertisers'],
  ['queue', 'store', 'Businesses'],
  ['queue', 'grid', 'Categories'],
  ['queue', 'settings', 'Settings'],
  ['queue', 'list', 'Audit trail'],
];
function adminShell(content, active = 'admin') {
  return `<div class="admin-layout"><aside class="admin-sidebar"><div>${wordmark()}<p class="eyebrow">ADMINISTRATION</p></div><nav class="admin-links" aria-label="Administration">${adminItems.map(([route, glyph, label], i) => `<a href="#${route}" class="${(active === 'admin' && i === 0) || (active === 'queue' && i === 1) ? 'active' : ''}" ${i > 1 ? 'data-demo="This additional admin screen follows the same system; it is documented in the implementation blueprint."' : ''}>${icon(glyph)}${label}${i === 1 ? '<span class="count">3</span>' : ''}</a>`).join('')}</nav><div class="admin-sidebar-bottom"><a href="#home">${icon('back')}Back to marketplace</a><a href="#empty">${icon('shield')}Administrator access</a></div></aside><div><header class="admin-top"><div class="muted">Workspace / ${active === 'admin' ? 'Overview' : 'Moderation'}</div><div class="admin-mobile-brand"><button class="icon-btn mobile-menu" data-open="admin-menu" aria-label="Open administration menu">${icon('menu')}</button>${wordmark()}</div><div class="header-actions">${themeButton()}<span class="avatar" aria-label="Administrator">AD</span></div></header><main class="admin-main">${content}</main></div></div>`;
}
function queueRows() {
  return [listingData[0], listingData[2], listingData[3]]
    .map(
      (d, i) =>
        `<article class="queue-row"><div class="queue-product">${photo(d.image, '', d.title)}<div><h3>${d.title}</h3><p>${i === 1 ? 'Books & stationery' : i === 2 ? 'Fashion' : 'Electronics'} · New advert</p></div></div><div class="queue-seller">${['Kwame A.', 'Akua M.', 'Esi B.'][i]}<small>Student advertiser</small></div><div class="queue-age">${[46, 28, 12][i]} min ago</div><a href="#review" class="btn secondary small">Review</a></article>`,
    )
    .join('');
}
const queueTable = (showLink = true) =>
  `<section class="panel table-panel"><div class="table-head"><div><h2>Awaiting your review</h2><p>Oldest submissions first.</p></div>${showLink ? `<a class="text-link" href="#queue">View queue ${arrow}</a>` : `${badge('3 pending', 'pending')}`}</div><div class="queue-head"><span>Advert</span><span>Advertiser</span><span>Submitted</span><span>Action</span></div>${queueRows()}</section>`;
function admin() {
  return adminShell(
    `<div class="page-head"><div><p class="eyebrow">ADMINISTRATION</p><h1>Campus at a glance</h1><p>Keep the marketplace useful, fair and safe.</p></div><a href="#post" class="btn">${icon('plus')}Create assisted advert</a></div><div class="stats">${stat('Live adverts', '8', 'Approved and unexpired')}${stat('Pending review', '3', 'Ready for moderation')}${stat('Open reports', '1', 'Needs attention')}${stat('New advertisers', '5', 'This week')}</div>${queueTable()}<div class="admin-bottom"><section class="panel"><h2>Recent activity</h2><div class="activity"><span class="activity-dot"></span><div>Reading bundle approved<p>Admin · 18 minutes ago</p></div></div><div class="activity"><span class="activity-dot"></span><div>Advertiser profile created<p>Student onboarding · 42 minutes ago</p></div></div><div class="activity"><span class="activity-dot"></span><div>Report received: duplicate listing<p>Awaiting review · 1 hour ago</p></div></div></section><section class="panel"><h2>Publishing rules</h2><div class="summary-line"><span>New advertiser limit</span><strong>5 active adverts</strong></div><div class="summary-line"><span>Daily submissions</span><strong>3 per advertiser</strong></div><div class="summary-line"><span>Advert duration</span><strong>30 days</strong></div><p class="helper" style="margin-top:14px">All adverts require approval. Sample counts above are for visual review only.</p></section></div>`,
  );
}
function queue() {
  return adminShell(
    `<div class="page-head"><div><p class="eyebrow">MODERATION</p><h1>Pending queue</h1><p>Review each advert before it reaches campus.</p></div><span class="badge pending">3 awaiting review</span></div><div class="tabs"><button class="active">Adverts <span>3</span></button><button data-demo="Business profile moderation will use its existing approval API.">Business profiles <span>1</span></button></div><div style="margin-top:20px">${queueTable(false)}</div><div class="inline-notice">${icon('shield')}<span>Review the full content and photographs. Duplicate flags are advisory; decisions are recorded in the audit trail.</span></div>`,
    'queue',
  );
}
function review() {
  return adminShell(
    `<div class="breadcrumbs"><a href="#queue" class="text-link">${icon('back')}Back to pending queue</a></div><div class="page-head" style="padding-top:0"><div><h1>Review advert</h1><p>Check the details. Leave a clear decision.</p></div>${badge('Pending approval', 'pending')}</div><div class="review-layout"><article class="panel review-advert">${photo('headphones', 'review-photo', 'Wireless headphones submitted for review')}<p class="eyebrow">ELECTRONICS · NEW ADVERT</p><h2>Wireless headphones</h2><div class="price">GH₵180 <small>Negotiable</small></div><div class="attributes"><span class="chip">Used</span><span class="chip">Science Market</span></div><div class="description"><h2>Description</h2><p>Comfortable wireless headphones in good working condition. Charging cable included. Available around Science Market after lectures.</p></div><div class="summary-line"><span>Contact consent</span><strong>Given by advertiser</strong></div><div class="summary-line"><span>Photographs</span><strong>1 validated image</strong></div><div class="inline-notice">${icon('check')}<div><strong>No duplicate flags in this example</strong>Automated checks assist review and do not guarantee originality.</div></div></article><aside class="panel review-decision"><h2>Moderation decision</h2><p>Review the complete advert before approving.</p><div class="seller"><span class="avatar">KA</span><div><h3>Kwame A.</h3><p>Student advertiser</p></div></div><div class="summary-line"><span>Live adverts</span><strong>1</strong></div><div class="summary-line"><span>Previous rejections</span><strong>0</strong></div><a class="text-link" href="#queue" data-demo="Production will open this advertiser’s actual history.">View advertiser history ${arrow}</a><label class="form-group"><span class="form-label">Decision reason</span><textarea class="field-input" placeholder="Write a clear reason for the audit trail…"></textarea><span class="helper">Required for approval and rejection.</span></label><button class="btn" data-demo="Design preview only. No moderation decision was saved.">${icon('check')}Approve advert</button><button class="btn danger" data-demo="Design preview only. No advert was rejected.">Request changes / reject</button><p class="helper" style="margin-top:14px">Approval publishes this advert for 30 days. Decisions are recorded with your account.</p></aside></div>`,
    'queue',
  );
}
function empty() {
  return `${header()}<main class="container"><section class="empty-state"><div class="empty-icon">${icon('search')}</div><h1>No finds just yet.</h1><p>Try a different search or clear a filter. Fresh adverts will appear here as they are approved.</p><a class="btn" href="#explore">Explore all adverts ${arrow}</a></section><section class="panel" style="max-width:600px;margin:0 auto 30px;padding:24px"><h2 style="font-size:19px">Sign-in temporarily unavailable</h2><p class="muted" style="font-size:14px;margin-top:10px">You can still browse the marketplace and contact advertisers. Please try signing in again later.</p><button class="btn secondary" style="margin-top:18px" data-demo="The real app will retry authentication availability.">Try again</button></section>${footer()}</main>${bottomNav('explore')}`;
}
const screens = {
  home,
  explore,
  detail,
  post,
  adverts,
  businesses,
  business,
  admin,
  queue,
  review,
  empty,
};
let current = 'home';
function render(resetScroll = true) {
  const key = location.hash.slice(1).split('?')[0];
  current = screens[key] ? key : 'home';
  document.body.classList.toggle('admin-page', ['admin', 'queue', 'review'].includes(current));
  document.getElementById('app').innerHTML = screens[current]();
  document.getElementById('screen').value = current;
  document.title = `UCC Med Market · ${document.getElementById('screen').selectedOptions[0].text} · Design review`;
  if (resetScroll) window.scrollTo(0, 0);
}
let toastTimer;
function notify(message) {
  const notice = document.getElementById('notice');
  notice.textContent = message;
  notice.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    notice.hidden = true;
  }, 4500);
}
let returnFocus;
function openSheet(kind, trigger) {
  returnFocus = trigger;
  let title = 'Preview';
  let content = '';
  if (kind === 'filters') {
    title = 'Filters';
    content = `${filterFields()}<button class="btn" data-sheet-close>Show sample results ${arrow}</button>`;
  }
  if (kind === 'photo') {
    title = 'Advert photograph';
    content = photo('headphones', '', 'Enlarged sample headphones photo').replace(
      '<img ',
      '<img style="width:100%;border-radius:8px" ',
    );
  }
  if (kind === 'report') {
    title = 'Report this advert';
    content = `<p class="muted">Tell the moderation team what seems wrong.</p><label class="form-group"><span class="form-label">Reason</span><select class="field-input"><option>Spam</option><option>Duplicate</option><option>Suspected fraud</option><option>Prohibited item</option><option>Other</option></select></label><label class="form-group"><span class="form-label">Additional details (optional)</span><textarea class="field-input" placeholder="Help us understand the issue…"></textarea></label><button class="btn" style="margin-top:20px" data-demo="Design preview only. No report was sent.">Send report</button>`;
  }
  if (kind === 'manage') {
    title = 'Manage advert';
    const status = trigger.dataset.adStatus;
    const actions =
      status === 'pending'
        ? `<button class="btn secondary" style="margin-top:20px" data-demo="Design preview only. No submission was withdrawn.">Withdraw submission</button>`
        : status === 'sold'
          ? `<a class="btn secondary" href="#post" style="margin-top:20px" data-sheet-close>Prepare renewal</a>`
          : `<a class="btn secondary" href="#post" style="margin-top:20px" data-sheet-close>Edit advert</a>${status === 'live' ? '<button class="btn secondary" style="margin-top:12px" data-demo="Design preview only. No listing was marked sold.">Mark as sold</button>' : ''}<button class="btn quiet" style="margin-top:12px" data-demo="Design preview only. No advert was withdrawn.">Withdraw advert</button>`;
    content = `<p class="muted">${status === 'pending' ? 'Your advert is awaiting approval.' : 'Choose an action for this sample advert.'}</p>${actions}`;
  }
  if (kind === 'admin-menu') {
    title = 'Administration';
    content = `<nav class="admin-links" style="margin-top:0">${adminItems.map(([route, glyph, label], i) => `<a href="#${route}" data-sheet-close ${i > 1 ? 'data-demo="Additional screen documented in the implementation blueprint."' : ''}>${icon(glyph)}${label}</a>`).join('')}</nav><a class="btn secondary" href="#home" data-sheet-close>Back to marketplace</a>`;
  }
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1"><div class="sheet-head"><h2 id="sheet-title">${title}</h2><button class="sheet-close" data-sheet-close aria-label="Close dialog">${icon('close')}</button></div>${content}</section>`;
  document.body.append(backdrop);
  document.getElementById('app').inert = true;
  document.querySelector('.review-tools').inert = true;
  document.body.style.overflow = 'hidden';
  backdrop.querySelector('.sheet').focus();
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeSheet();
  });
}
function closeSheet() {
  document.querySelector('.sheet-backdrop')?.remove();
  document.getElementById('app').inert = false;
  document.querySelector('.review-tools').inert = false;
  document.body.style.overflow = '';
  if (returnFocus?.isConnected) returnFocus.focus();
}
document.addEventListener('click', (event) => {
  const target = event.target.closest(
    '[data-theme-toggle],[data-demo],[data-step],[data-ad-filter],[data-open],[data-sheet-close],[data-type]',
  );
  if (!target) return;
  if (target.hasAttribute('data-demo')) {
    event.preventDefault();
    notify(target.dataset.demo);
  }
  if (target.hasAttribute('data-theme-toggle')) {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('ucc-design-theme', next);
    } catch {}
    document
      .querySelectorAll('[data-theme-toggle]')
      .forEach((b) => (b.innerHTML = icon(next === 'dark' ? 'sun' : 'moon')));
  }
  if (target.dataset.step) {
    postStep = Number(target.dataset.step);
    render();
  }
  if (target.dataset.adFilter) {
    document.querySelectorAll('[data-ad-filter]').forEach((b) => {
      b.classList.toggle('active', b === target);
      b.setAttribute('aria-pressed', String(b === target));
    });
    document.getElementById('own-adverts').innerHTML = advertRows(target.dataset.adFilter);
  }
  if (target.dataset.type) {
    document.querySelectorAll('[data-type]').forEach((b) => {
      b.classList.toggle('active', b === target);
      b.setAttribute('aria-pressed', String(b === target));
    });
    if (target.dataset.type !== 'product')
      notify(
        'This mockup shows the item form. Service and wanted variants are specified in the blueprint.',
      );
  }
  if (target.hasAttribute('data-sheet-close')) closeSheet();
  if (target.dataset.open) openSheet(target.dataset.open, target);
});
document.addEventListener('keydown', (event) => {
  const sheet = document.querySelector('.sheet');
  if (!sheet) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeSheet();
  }
  if (event.key === 'Tab') {
    const focusable = [
      ...sheet.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]'),
    ];
    const first = focusable[0],
      last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet)) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || document.activeElement === sheet)
    ) {
      event.preventDefault();
      first?.focus();
    }
  }
});
document.addEventListener('submit', (event) => {
  if (event.target.matches('[data-search]')) {
    event.preventDefault();
    location.hash = 'explore';
    notify(
      'Design preview: showing sample results. Production search will use the marketplace API.',
    );
  }
});
document.getElementById('screen').addEventListener('change', (event) => {
  closeSheet();
  location.hash = event.target.value;
});
window.addEventListener('hashchange', () => {
  closeSheet();
  render();
});
render();
