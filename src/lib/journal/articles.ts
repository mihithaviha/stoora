/**
 * The Stoora Journal: topics, photography and articles.
 *
 * This is the only file to edit to add or change Journal content. The articles are editorial examples
 * written for Stoora's audience: practical advice, with no customer stories, results or statistics.
 * Replace or extend them when real content is ready.
 *
 * `carousel: n` puts a story on the Journal home carousel (n is its order); `pick` marks the Editor's Pick and holds the
 * sentence on why it was picked. An article body is a list of blocks (plain text only, the renderer escapes everything):
 *   { p }  { h2 }  { h3 }  { ul: [] }  { ol: [] }  { callout: [title, text] }
 *   { image: key, caption }  { table: { head: [], rows: [[]] } }
 * Photos live in public/assets/journal as <key>-720.jpg (cards) and <key>-1400.jpg (hero and article).
 */

export type Block = { p?: string; h2?: string; h3?: string; ul?: string[]; ol?: string[]; callout?: [string, string]; image?: string; caption?: string; table?: { head: string[]; rows: string[][] } };
export type Article = { slug: string; carousel?: number; title: string; excerpt: string; topic: string; photo: string; published: string; minutes: number; summary: string; pick?: string; body: Block[]; faq: { q: string; a: string }[] };
export type Topic = { id: string; name: string; icon: string; blurb: string };

export const TOPICS: Topic[] = [
  { id: 'selling-online', name: 'Selling Online', icon: 'storefront', blurb: 'Shop pages, photos and orders.' },
  { id: 'branding', name: 'Branding & Design', icon: 'palette', blurb: 'Look and sound like one brand.' },
  { id: 'customers', name: 'Customer Experience', icon: 'forum', blurb: 'Messages, delivery and trust.' },
  { id: 'growth', name: 'Business Growth', icon: 'trending_up', blurb: 'Pricing, repeat buyers, planning.' },
  { id: 'guides', name: 'Tips & Guides', icon: 'menu_book', blurb: 'Checklists you can use today.' },
];

/** Professional photography (Unsplash License, credits in public/assets/journal/CREDITS.md). */
export const PHOTOS: Record<string, string> = {
  bowls: 'Overhead view of handmade glazed ceramic bowls on a pink plaster surface',
  'boutique-rack': 'Garments displayed on rails in a bright boutique',
  tutor: 'A tutor and a child studying together at a wooden table with a laptop',
  'kurta-pink': 'A woman in a pink block-print kurta set in front of a soft cream backdrop',
  stack: 'Stacked ceramic rings in pastel glazes lit by afternoon sun',
  'suit-floral': 'A woman in a floral cotton suit with a dupatta, standing in front of a brick wall',
  loom: 'Bright cotton threads set up on a handloom',
  earrings: 'A pair of ruby drop earrings photographed on dark wood',
  blazer: 'A smiling professional woman in a black blazer',
  'suit-maroon': 'A woman in a maroon embroidered suit set standing in a warmly lit hallway',
  interior: 'A calm, light-filled room with a sofa, plants and tall windows',
  cups: 'Speckled stoneware cups on a white shelf',
  bottles: 'An amber bottle and two jars balanced in a stack against a neutral background',
  necklace: 'A gold temple necklace with ruby details on a dark background',
};

/** The photo beside the page heading on the Journal home. */
export const HERO_PHOTO = 'interior';

export const AUTHOR = 'Stoora Editorial';

export const ARTICLES: Article[] = [
  {
    slug: 'product-photos-at-home',
    carousel: 1,
    title: 'Product photos that sell, shot at home with a window and a sheet',
    excerpt: 'You do not need a studio. You need good light, a calm background and the same few angles every time.',
    topic: 'selling-online',
    photo: 'bowls',
    published: '2026-10-21',
    minutes: 6,
    summary:
      'Shoot beside a window in the morning, use a plain background, take the same five angles for every product and edit lightly so the colours stay true.',
    body: [
      {
        p: 'A buyer cannot touch your work. The photo does the touching for them, so it has to answer the questions a shop assistant would: what is it, how big is it, what is it really like up close.',
      },
      {
        p: 'The good news is that clear, honest photos are made with light and patience, not with expensive equipment. A phone, a window and a plain sheet are enough.',
      },
      { h2: 'Start with the light' },
      {
        p: 'Set up next to a large window in the morning or late afternoon, when the light is soft. Put the product beside the window, not in front of it, so the light falls across it and gives shape. Switch off the room lights, because yellow bulbs and daylight together make colours look wrong.',
      },
      { h2: 'Choose a calm background' },
      {
        p: 'Your product should be the only interesting thing in the picture. A plain wall, a white or cream bedsheet, a sheet of card or a wooden table all work.',
      },
      {
        ul: [
          'Iron or smooth the cloth so it has no creases.',
          'Curve the background up behind the product so there is no hard line.',
          'Keep one background for the whole shop. It makes your page look like a single brand.',
        ],
      },
      { image: 'cups', caption: 'A plain, light background lets the texture of the product do the talking.' },
      { h2: 'Take the same five photos every time' },
      {
        ol: [
          'Front, with the whole product in the frame.',
          'Side or back.',
          'A close detail of the material or finish.',
          'Something for scale, such as a hand or a familiar object.',
          'The product in use, if that helps a buyer picture it.',
        ],
      },
      {
        p: 'A fixed routine means you can photograph ten products in one sitting and every product page feels complete.',
      },
      { h2: 'Keep colours true' },
      {
        p: 'Most returns and complaints about colour start with a photo that looks different from the real thing. Compare the photo on your phone with the product in your hand before you post it. If they do not match, shoot again in different light rather than fixing it with filters.',
      },
      {
        callout: [
          'A quick check',
          'Look at the photo at thumbnail size on your phone. If you can still tell what the product is and what it is made of, it is ready.',
        ],
      },
    ],
    faq: [
      {
        q: 'Do I need a tripod?',
        a: 'It helps, because it keeps every angle level and lets you reuse the same framing. A pile of books works if you do not have one.',
      },
      {
        q: 'Should I add my logo to the photo?',
        a: 'A small, quiet mark in one corner is fine. A large watermark across the product makes it harder to see.',
      },
    ],
  },
  {
    slug: 'brand-in-an-afternoon',
    carousel: 2,
    title: 'A small brand in an afternoon: one name, two colours, one voice',
    excerpt: 'Make a few decisions once, then reuse them on your shop page, your packaging and your chats.',
    topic: 'branding',
    photo: 'boutique-rack',
    published: '2026-10-17',
    minutes: 7,
    summary:
      'Pick one name spelling, two main colours with a neutral, one typeface and one sentence that describes how you sound. Then use them everywhere.',
    body: [
      {
        p: 'A brand is not a logo. It is the feeling a buyer gets from seeing your name, your colours and your words in the same way each time. Small sellers can do this well because there is only one person making the decisions.',
      },
      { h2: 'Decide the basics' },
      {
        ul: [
          'Name: choose one spelling and use it everywhere, including your shop link and your Instagram name.',
          'Colours: pick two main colours and one neutral. Use them for your page, your packaging and your posts.',
          'Typeface: one for headings and one for text is plenty.',
        ],
      },
      { h2: 'Write down how you sound' },
      {
        p: 'Complete this sentence: "We sound like someone who is ______ and ______." For example, warm and clear, or calm and precise. Keep that sentence where you write your messages. It stops your replies from sounding like five different people.',
      },
      { image: 'necklace', caption: 'Strong, simple product photography does as much for a brand as a logo does.' },
      { h2: 'Use it in the places buyers actually look' },
      {
        ol: [
          'Your shop page and its first photo.',
          'Your WhatsApp and Instagram profile picture and description.',
          'The card or slip you put in every parcel.',
          'Your replies to buyers.',
        ],
      },
      { h2: 'Check it with a stranger' },
      {
        p: 'Show a friend your page for five seconds and ask what you sell and who it is for. If they cannot say, simplify the first thing they see.',
      },
    ],
    faq: [
      {
        q: 'Do I need a professional logo first?',
        a: 'No. A clean wordmark in your chosen typeface is enough to begin with. You can commission a logo later, once you know what your brand stands for.',
      },
    ],
  },
  {
    slug: 'order-confirmations-buyers-read',
    carousel: 6,
    title: 'Write order confirmations buyers actually read',
    excerpt: "A good confirmation answers the buyer's next five questions before they have to ask them.",
    topic: 'customers',
    photo: 'tutor',
    published: '2026-10-14',
    minutes: 5,
    summary:
      'Send a short confirmation straight away with the item, the price, the address, when it will arrive and how to reach you.',
    body: [
      {
        p: 'The moment after someone orders is when they are most unsure. Did it go through? Did they type the right address? A clear message turns that doubt into trust.',
      },
      { h2: 'What to include' },
      {
        ul: [
          'What they ordered, with the name of the item.',
          'The total they are paying, and how.',
          'The delivery address, so they can spot a mistake.',
          'When they should expect it.',
          'How to reach you if something is wrong.',
        ],
      },
      { h2: 'An example you can adapt' },
      {
        callout: [
          'Example message',
          'Hi Priya, thank you for your order. We have your indigo dupatta (₹899). It will go to the address below and should reach you in 4 to 6 days. If anything needs changing, reply here and I will sort it today.',
        ],
      },
      { h2: 'Keep it short and human' },
      {
        p: 'Use the name of the buyer and the name of the product. Avoid long policies in the same message. If your returns policy matters, link to it once.',
      },
      { h2: 'Send it quickly' },
      {
        p: 'Reply within a few minutes if you can. A fast reply tells the buyer that someone real is looking after their order.',
      },
    ],
    faq: [
      {
        q: 'Should I confirm every order by hand?',
        a: 'At the start, yes. It teaches you what buyers ask. Once you know, save the message as a template and personalise the name and item.',
      },
    ],
  },
  {
    slug: 'first-ten-repeat-customers',
    carousel: 4,
    title: 'Your first ten repeat customers: a gentle follow-up routine',
    excerpt: 'Repeat buyers come from three small messages sent at the right moments, not from constant promotion.',
    topic: 'growth',
    photo: 'kurta-pink',
    published: '2026-10-10',
    minutes: 6,
    summary:
      'Thank the buyer on the day, check in after delivery, and give one honest reason to come back. Keep a simple list so you never forget who to write to.',
    body: [
      {
        p: 'It costs far less effort to sell to someone who already likes your work than to find a stranger. The trick is to follow up without being pushy.',
      },
      { h2: 'Three messages, three moments' },
      {
        ol: [
          'The day they order: thank them and confirm the details.',
          'A few days after delivery: ask if everything arrived well and if they are happy with it.',
          'A few weeks later: share something new or useful, with one clear reason to visit your shop again.',
        ],
      },
      {
        image: 'suit-floral',
        caption: 'Sellers who know their buyers can suggest what suits them, and that is a reason to come back.',
      },
      { h2: 'Keep a simple list' },
      {
        p: 'A notebook or a spreadsheet is enough: name, what they bought, the date and one thing you learned about them. A tool such as the Stoora dashboard keeps buyers and orders together so you do not have to rebuild the list by hand.',
      },
      { h2: 'Give one honest reason to return' },
      {
        ul: [
          'A new item in a style they bought before.',
          'A restock of something they asked about.',
          'A small thank-you for ordering again, which you can afford.',
        ],
      },
      { h2: 'Know when to stop' },
      {
        p: 'If someone does not reply, one gentle follow-up is enough. A buyer who feels respected is more likely to come back by themselves.',
      },
    ],
    faq: [],
  },
  {
    slug: 'packing-checklist',
    title: 'Packing an order: the checklist to run before you seal the box',
    excerpt: 'Most delivery problems are decided in the last two minutes before the parcel is closed.',
    topic: 'guides',
    photo: 'stack',
    published: '2026-10-07',
    minutes: 5,
    summary:
      'Check the item, protect it, label it clearly, include a slip, and take a photo of the packed parcel before you hand it over.',
    body: [
      {
        p: 'A parcel that arrives intact and looks cared for is part of your brand. A few seconds of checking at the packing table saves long conversations later.',
      },
      { h2: 'The checklist' },
      {
        ol: [
          'Check the item against the order: name, size, colour, quantity.',
          'Look for flaws now, not after the buyer finds them.',
          'Wrap fragile pieces so that nothing can touch the sides of the box.',
          'Fill empty space so the item cannot move.',
          'Add a slip or card with your shop name and how to reach you.',
          'Write the address clearly and add a phone number.',
          'Take a photo of the packed parcel and the label.',
        ],
      },
      { image: 'bottles', caption: 'Fragile or stacked items need space between them and something soft around them.' },
      { h2: 'Why the photo matters' },
      {
        p: 'If something goes wrong in transit, a dated photo of how the parcel left you makes the conversation with the courier and the buyer much simpler.',
      },
      { h2: 'Keep the supplies together' },
      { p: 'Store boxes, tape, wrapping and slips in one place so packing is a repeatable routine and not a search.' },
    ],
    faq: [],
  },
  {
    slug: 'selling-on-whatsapp-without-losing-orders',
    carousel: 3,
    title: 'Selling on WhatsApp without losing track of orders',
    excerpt: 'Chats are a great way to sell. They are a poor way to remember who ordered what.',
    topic: 'selling-online',
    photo: 'suit-maroon',
    published: '2026-10-03',
    minutes: 6,
    summary:
      'Move every confirmed order out of the chat and into one list the moment it is agreed, with the item, price, payment status and delivery step.',
    body: [
      {
        p: 'Many sellers start in a chat. It is fast and personal. But a busy chat scrolls away, and an order that sits in the middle of a long conversation is easy to miss.',
      },
      { h2: 'One rule: orders leave the chat' },
      {
        p: 'As soon as a buyer says yes, write the order into a single list. The chat is for talking and the list is for remembering.',
      },
      { h2: 'What to write down' },
      {
        ul: [
          'Buyer name and phone number.',
          'The item, size or colour, and the price.',
          'Whether it is paid, part paid or to pay on delivery.',
          'The delivery address and the step it is at: packed, shipped, delivered.',
        ],
      },
      { h2: 'Use saved replies' },
      {
        p: 'Save your most common answers, such as price, delivery time and how to pay, so you can reply in one tap and stay consistent.',
      },
      {
        callout: [
          'Where Stoora fits',
          'Stoora is built for this: one place for the shop page, the orders and the payment status, so nothing depends on scrolling a chat.',
        ],
      },
      { h2: 'Check the list every evening' },
      {
        p: 'Two minutes at the end of the day to see what is paid, packed and shipped keeps small mistakes from growing.',
      },
    ],
    faq: [],
  },
  {
    slug: 'pricing-handmade-work',
    pick: 'Pricing decides whether a good small business can keep going, so if you read one story first, make it this one.',
    title: 'How to price handmade work: materials, time and a fair margin',
    excerpt: 'If you only cover materials you are working for free. Here is a way to build a price you can defend.',
    topic: 'growth',
    photo: 'loom',
    published: '2026-09-29',
    minutes: 7,
    summary:
      'Add materials, your time at a fair hourly rate and packaging, then add an allowance for fees and overheads, then your margin.',
    body: [
      {
        p: 'Pricing handmade work is hard because the work feels personal. A simple formula makes it less emotional and easier to explain to a buyer.',
      },
      { h2: 'The building blocks' },
      {
        ol: [
          'Materials for one piece, including the share of anything you buy in bulk.',
          'Your time: hours spent, multiplied by an hourly rate you would accept from an employer.',
          'Packaging and the slip you include.',
          'An allowance for fees, such as payment charges, and running costs.',
          'A margin, so the business can grow and you can restock.',
        ],
      },
      { h2: 'A worked example' },
      { p: 'These numbers are only an example. Replace them with your own.' },
      {
        table: {
          head: ['Cost', 'Amount'],
          rows: [
            ['Materials', '₹300'],
            ['Time: 3 hours at ₹150', '₹450'],
            ['Packaging', '₹40'],
            ['Subtotal', '₹790'],
            ['Fees and running costs (10%)', '₹79'],
            ['Margin (20%)', '₹174'],
            ['Price, rounded', '₹1,049'],
          ],
        },
      },
      { h2: 'Check it against the market' },
      {
        p: 'Look at similar work and ask whether yours is more careful, more unusual or better made. If it is, say so on the page. If your price is higher than comparable work, show the buyer why.',
      },
      { image: 'cups', caption: 'Hours of work never show in the photo. Say so on your page.' },
      { h2: 'Raise prices on purpose' },
      {
        p: 'Review prices every season. If your materials cost more or your work has improved, your price should move with them.',
      },
    ],
    faq: [
      {
        q: 'What if the formula gives a price that is too high?',
        a: 'Look at your time first. You may be able to make the piece faster, or make a simpler version for a lower price and keep the detailed one as a premium option.',
      },
    ],
  },
  {
    slug: 'festive-season-plan',
    carousel: 5,
    title: 'A simple festive-season plan for small sellers',
    excerpt: 'Busy weeks go better when the decisions are made six weeks earlier.',
    topic: 'guides',
    photo: 'earrings',
    published: '2026-09-25',
    minutes: 6,
    summary:
      'Plan stock six weeks out, bundle and photograph four weeks out, publish order cut-off dates two weeks out, then protect your time in the final week.',
    body: [
      {
        p: 'Festive weeks bring more messages, more orders and more mistakes. A short plan made early keeps you calm and keeps buyers happy.',
      },
      { h2: 'Six weeks before' },
      {
        ul: [
          'Check your stock and what takes longest to make.',
          'Order extra materials and packaging now, before the rush.',
          'Decide what you will not take on, so you can say no.',
        ],
      },
      { h2: 'Four weeks before' },
      {
        ul: [
          'Photograph gift sets and bundles in your usual style.',
          'Write the festive page of your shop: what is new and who it suits.',
          'Prepare saved replies for price, delivery and customisation.',
        ],
      },
      { image: 'earrings', caption: 'Gift-ready pieces photographed early are easy to promote and easy to order.' },
      { h2: 'Two weeks before' },
      {
        p: 'Publish clear last-order dates for each delivery area and repeat them on your page and in your chats. Add a short note on how long made-to-order pieces take.',
      },
      { h2: 'The final week' },
      {
        ul: [
          'Reply to messages at set times so you also have time to pack.',
          'Pack the evening before dispatch.',
          'Send a thank-you to everyone who ordered, and tell them when it ships.',
        ],
      },
    ],
    faq: [],
  },
  {
    slug: 'packaging-that-feels-like-your-brand',
    title: 'Packaging that feels like your brand, on a small budget',
    excerpt: 'The unboxing is the last thing a buyer sees and the first thing they tell a friend about.',
    topic: 'branding',
    photo: 'necklace',
    published: '2026-09-23',
    minutes: 5,
    summary:
      'Repeat your brand colours and one clear detail in every parcel: a simple wrap, a card and a consistent label. Spend on one thing buyers notice, not on everything.',
    body: [
      {
        p: 'A buyer opens your parcel at home, often with family around. In that minute, the packaging tells them whether the person who made the product also cared about the experience.',
      },
      { h2: 'Choose one detail buyers will notice' },
      {
        p: 'You do not need printed boxes. Pick a single touch you can repeat on every order and make it your signature.',
      },
      {
        ul: [
          'A ribbon or twine in one of your brand colours.',
          'A stamp or sticker with your shop name on the wrap or the box.',
          "A short handwritten line on the card, using the buyer's name.",
        ],
      },
      { h2: 'Keep the rest simple and protective' },
      {
        p: 'Plain kraft paper, tissue and a sturdy mailer look good together and cost little. Protection comes first. A beautiful parcel that arrives damaged is still a damaged parcel.',
      },
      { image: 'bottles', caption: 'Neutral, tidy materials let a single brand detail stand out.' },
      { h2: 'Add a card that is worth keeping' },
      {
        ol: [
          'Thank them by name.',
          'Tell them in one line how to care for the product.',
          'Say how to reach you, and invite them to share a photo if they love it.',
        ],
      },
      { h2: 'Test it before you commit' },
      {
        p: 'Order a small batch of any custom material before you buy a lot. Pack five real orders, ask two buyers what they thought, and adjust.',
      },
    ],
    faq: [],
  },
  {
    slug: 'handling-delivery-complaints',
    title: 'Handling a delivery complaint calmly: five steps',
    excerpt: 'How you respond matters more than the problem. Buyers remember the conversation.',
    topic: 'customers',
    photo: 'blazer',
    published: '2026-09-20',
    minutes: 5,
    summary: 'Acknowledge it, ask for a photo, offer a clear fix, decide quickly and follow up when it is done.',
    body: [
      {
        p: 'Sooner or later a parcel will be late, damaged or not what the buyer expected. A calm, quick reply can turn that buyer into a loyal one.',
      },
      { h2: 'Five steps' },
      {
        ol: [
          'Acknowledge: say you are sorry it happened and that you will look into it today.',
          'Ask: request a photo of the item and the packaging, so you can see what happened.',
          'Offer: say plainly what you can do, such as a replacement, a repair or a refund.',
          'Decide: do not leave the buyer waiting for days. A quick answer is worth more than a perfect one.',
          'Follow up: when the fix is done, check that they are happy.',
        ],
      },
      {
        callout: [
          'An opening line',
          'I am sorry this happened, and thank you for telling me. Could you send me a photo of the item and the box? I will come back to you with a solution today.',
        ],
      },
      { h2: 'Keep the record' },
      {
        p: 'Write down what went wrong, whether it was the packing, the courier or the description. After a few cases you will see a pattern and can fix the cause.',
      },
      { h2: 'Do not argue' },
      {
        p: 'Even when you think the buyer is wrong, be kind first. You can explain your policy gently once the problem is understood.',
      },
    ],
    faq: [],
  },
];


