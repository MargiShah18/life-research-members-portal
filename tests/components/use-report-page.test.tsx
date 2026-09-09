import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock('../../src/services/headers/auth-header', () => ({ default: mocks.auth }));
import useReportPage from '../../src/services/use-report-page';
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const response = (value: number) => ({ ok: true, json: async () => ({ data: { total: value }, meta: {} }) });
const initial = { audience: 'institute' as const, urlIdentifier: 'lri', pageId: 'grants', years: {yearFrom: 2022}, selections: [], lang: 'en' as const };
let requests: Array<{ result: ReturnType<typeof deferred<any>>; signal: AbortSignal }>;
beforeEach(() => {
  requests = [];
  mocks.auth.mockReset().mockResolvedValue({ authorization: 'Bearer test' });
  vi.stubGlobal('fetch', vi.fn((_url, options) => {
    const result = deferred<any>();
    requests.push({ result, signal: options.signal });
    // Deliberately ignore abort to model a response/body that has already arrived.
    return result.promise;
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('report request lifetime', () => {
  it('keeps the latest filter results when an earlier response finishes last', async () => {
    const { result, rerender } = renderHook(useReportPage, { initialProps: initial });
    await waitFor(() => expect(requests).toHaveLength(1));
    rerender({ ...initial, years: {yearFrom: 2023} });
    await waitFor(() => expect(requests).toHaveLength(2));
    await act(async () => { requests[1].result.resolve(response(23)); });
    await act(async () => { requests[0].result.resolve(response(22)); });
    expect(result.current.data).toEqual({total: 23});
    expect(result.current.error).toBeNull();
    expect(requests[0].signal.aborted).toBe(true);
  });
  it('ignores old failures and keeps loading until the active request finishes', async () => {
    const { result, rerender } = renderHook(useReportPage, { initialProps: initial });
    await waitFor(() => expect(requests).toHaveLength(1));
    rerender({ ...initial, years: {yearFrom: 2023} });
    await waitFor(() => expect(requests).toHaveLength(2));
    await act(async () => { requests[0].result.reject(new Error('old failure')); });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);
    await act(async () => { requests[1].result.resolve(response(23)); });
    expect(result.current.loading).toBe(false);
  });
  it('does not send a stale request when token acquisition completes late', async () => {
    const token = deferred<any>();
    mocks.auth.mockImplementationOnce(() => token.promise);
    const { rerender } = renderHook(useReportPage, { initialProps: initial });
    rerender({ ...initial, years: {yearFrom: 2023} });
    await waitFor(() => expect(requests).toHaveLength(1));
    await act(async () => { token.resolve({authorization: 'Bearer test'}); });
    expect(requests).toHaveLength(1);
  });
  it('cancels on unmount and on manual refetch', async () => {
    const { result, unmount } = renderHook(useReportPage, { initialProps: initial });
    await waitFor(() => expect(requests).toHaveLength(1));
    act(() => { void result.current.refetch(); });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0].signal.aborted).toBe(true);
    unmount();
    expect(requests[1].signal.aborted).toBe(true);
  });
});
