// Inquiry-only state. No customer data is persisted in browser storage.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const messages = {
  unavailable: 'Online requests are unavailable. Please call (706) 809-5076.',
  uncertain: 'We could not confirm the request was saved. Your details remain here. Retry without changing them, or call (706) 809-5076. Refreshing this page loses the retry reference.',
  correction: 'This request may already have been saved. For a correction, please call (706) 809-5076 before submitting another request.',
  review: 'Check the details above, then choose Send request. You can still edit them.',
  saved: 'Your request was saved for staff review. A technician visit is not booked, and this receipt does not confirm a text or email was delivered. To correct details, call (706) 809-5076.',
  staff: 'This request needs staff review. Please call (706) 809-5076 for help.',
};
export function validCapability(state) {
  return state?.enabled === true && typeof state.disclosure === 'string' &&
    state.disclosure.trim().length >= 30 && state.disclosure.length <= 500 &&
    typeof state.policyVersion === 'string' && /^[a-zA-Z0-9._-]{1,80}$/.test(state.policyVersion);
}
export function validReceipt(response, result) {
  return [200, 201].includes(response.status) && result?.status === 'saved' &&
    typeof result.leadId === 'string' && UUID.test(result.leadId) &&
    typeof result.receiptId === 'string' && UUID.test(result.receiptId);
}
export function createRequestState({ fetcher, randomUUID, signalForRequest }) {
  let enabled = false;
  let busy = false;
  let pending = null;
  let reviewed = null;
  let saved = false;
  return {
    enable(state) { enabled = validCapability(state); return enabled; },
    edited() { reviewed = null; },
    async submit(fields) {
      if (!enabled) return { kind: 'unavailable', message: messages.unavailable };
      if (busy) return { kind: 'busy' };
      if (saved) return { kind: 'saved', message: messages.saved };
      if (!fields.phone && !fields.email) return { kind: 'invalid', message: 'Add a phone number or email so the team can respond.' };
      const snapshot = JSON.stringify(fields);
      if (pending && pending.snapshot !== snapshot) return { kind: 'correction', message: messages.correction };
      if (reviewed !== snapshot) {
        reviewed = snapshot;
        return { kind: 'review', message: messages.review };
      }
      if (!pending) pending = { requestId: randomUUID(), snapshot };
      busy = true;
      try {
        const response = await fetcher('/api/lead', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...fields, requestId: pending.requestId }),
          signal: signalForRequest(),
          redirect: 'error',
        });
        const result = await response.json().catch(() => null);
        if (!validReceipt(response, result)) return {
          kind: response.status === 409 ? 'staff' : 'uncertain',
          message: response.status === 409 ? messages.staff : messages.uncertain,
        };
        saved = true;
        return { kind: 'saved', message: messages.saved };
      } catch {
        return { kind: 'uncertain', message: messages.uncertain };
      } finally { busy = false; }
    },
  };
}
