// POST /api/v1/products/ai-draft: the address the PRD names for reading product photos. The work is done in one place,
// src/app/api/describe-product/route.ts (one AI call, 20 drafts a shop a day, the key stays on the server).
export { POST } from '../../../describe-product/route';
