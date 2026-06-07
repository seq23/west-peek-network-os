export type HandwrittenFulfillmentMode = 'vendor' | 'self';

export type HandwrittenVendor = {
  id: string;
  name: string;
  url: string;
  fit: string;
  note: string;
};

export const HANDWRITTEN_VENDORS: HandwrittenVendor[] = [
  {
    id: 'handwrytten',
    name: 'Handwrytten',
    url: 'https://www.handwrytten.com/',
    fit: 'Best fit for API/custom logo automation later',
    note: 'Supports handwritten cards, logo/custom stationery, and API/integration paths. Use manual vendor handoff now; automate only after account/payment setup.'
  },
  {
    id: 'simply_noted',
    name: 'Simply Noted',
    url: 'https://simplynoted.com/',
    fit: 'Best fit for real-ink note service/vendor comparison',
    note: 'Real pen/ink handwritten notes with integrations/API positioning. Use as a strong alternate handwritten vendor.'
  },
  {
    id: 'postable',
    name: 'Postable',
    url: 'https://www.postable.com/business',
    fit: 'Best fit for simple greeting-card workflow',
    note: 'Good manual fallback for nice mailed cards. Treat as printed handwriting-style/card fulfillment, not the preferred real-ink handwritten route.'
  },
  {
    id: 'self',
    name: "I'll do it myself",
    url: '',
    fit: 'No third-party vendor',
    note: 'Use when Sequoia/Scooter will write, stamp, mail, or otherwise handle the card personally.'
  }
];
