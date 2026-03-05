import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHttpContext } from '../http-context';

describe('createHttpContext', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response()));
  });

  it('should send GET request', async () => {
    const http = createHttpContext();
    await http.get('https://example.com/api');

    expect(fetch).toHaveBeenCalledWith('https://example.com/api', {
      method: 'GET',
    });
  });

  it('should send POST with JSON body', async () => {
    const http = createHttpContext();
    await http.post('https://example.com/api', { foo: 'bar' });

    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        method: 'POST',
        body: '{"foo":"bar"}',
      }),
    );
  });

  it('should send PUT with JSON body', async () => {
    const http = createHttpContext();
    await http.put('https://example.com/api', { update: true });

    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        method: 'PUT',
        body: '{"update":true}',
      }),
    );
  });

  it('should send DELETE request', async () => {
    const http = createHttpContext();
    await http.delete('https://example.com/api/123');

    expect(fetch).toHaveBeenCalledWith('https://example.com/api/123', {
      method: 'DELETE',
    });
  });

  it('should merge custom headers for POST', async () => {
    const http = createHttpContext();
    await http.post('https://example.com/api', { data: 1 }, {
      headers: { Authorization: 'Bearer token' },
    });

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const headers = callArgs[1]?.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer token');
  });
});
