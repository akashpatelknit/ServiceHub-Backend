import { ResendProvider } from './ResendProvider.js';

// Single configured instance the rest of the app imports — never reach for the Resend
// SDK or any other email backend directly outside this folder. Swapping providers later
// means changing this one line, not every call site.
export const emailProvider = new ResendProvider();
