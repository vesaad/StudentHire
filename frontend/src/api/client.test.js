import { describe, it, expect } from 'vitest';
import { api, getErrorMessage } from './client.js';
describe('API client', () => {
  it('uses the local proxy and a bounded timeout', () => {
    expect(api.defaults.baseURL).toBe('/api');
    expect(api.defaults.timeout).toBe(10000);
  });
  it('explains API and connection errors', () => {
    expect(getErrorMessage({ response: { data: { error: { message: 'Gabim validimi' } } } })).toBe(
      'Gabim validimi',
    );
    expect(getErrorMessage({ code: 'ECONNABORTED' })).toContain('në kohë');
    expect(getErrorMessage({})).toContain('backend');
    expect(getErrorMessage({ response: { status: 502 } })).toContain('Kërkesa dështoi');
  });
});
