import { createRequestState } from './request-state.js';

const form = document.querySelector('#serviceRequest');
const status = document.querySelector('#requestStatus');
const review = document.querySelector('#requestReview');
const button = form.querySelector('button[type="submit"]');
const state = createRequestState({
  fetcher: (...args) => fetch(...args),
  randomUUID: () => crypto.randomUUID(),
  signalForRequest: () => AbortSignal.timeout(12000),
});
// Fail closed on missing APIs, malformed status, or unapproved disclosure.
if (typeof crypto.randomUUID === 'function' && typeof AbortSignal.timeout === 'function') {
  fetch('/api/capture-status', { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000) })
    .then(response => response.ok ? response.json() : null)
    .then(capability => {
      if (!state.enable(capability)) return;
      document.querySelector('#contactDisclosure').textContent = capability.disclosure;
      document.querySelector('#request').hidden = false;
      document.querySelector('#requestLink').hidden = false;
    })
    .catch(() => {});
}
form.addEventListener('input', () => {
  state.edited();
  review.hidden = true;
  button.textContent = 'Review request';
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (button.disabled || !form.reportValidity()) return;
  const data = new FormData(form);
  const fields = Object.fromEntries(['name', 'phone', 'email', 'postalCode', 'serviceCode', 'timing', 'summary']
    .map(key => [key, String(data.get(key) || '').trim()]));
  fields.timing ||= 'unsure';
  fields.contactConsent = data.get('contactConsent') === 'on';
  button.disabled = true;
  const controls = [...form.querySelectorAll('input, select, textarea')];
  for (const control of controls) control.disabled = true;
  form.setAttribute('aria-busy', 'true');
  status.textContent = 'Checking your request…';
  const result = await state.submit(fields);
  form.removeAttribute('aria-busy');
  status.textContent = result.message || '';
  button.disabled = result.kind === 'saved';
  for (const control of controls) control.disabled = result.kind === 'saved';
  if (result.kind === 'review') {
    document.querySelector('#requestReviewDetails').textContent = [fields.name, fields.phone, fields.email, fields.postalCode && `Service ZIP: ${fields.postalCode}`].filter(Boolean).join(' · ');
    review.hidden = false;
    review.focus();
    button.textContent = 'Send request';
  } else if (result.kind === 'saved') {
    review.hidden = true;
    button.textContent = 'Request saved';
    // Keep one receipt per page; corrections use the existing staffed phone path.
    for (const control of form.querySelectorAll('input, select, textarea')) control.disabled = true;
  } else if (['uncertain', 'staff'].includes(result.kind)) {
    button.textContent = 'Retry same request';
  }
});
