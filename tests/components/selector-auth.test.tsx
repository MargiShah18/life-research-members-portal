import { createContext } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), error: vi.fn(), institute: {urlIdentifier: 'lri'} }));
vi.mock('../../src/services/headers/auth-header', () => ({default: mocks.auth}));
vi.mock('../../src/services/notifications/notification', () => ({default: class {error = mocks.error;}}));
vi.mock('../../src/services/context/selected-institute-ctx', () => ({useSelectedInstitute: () => ({institute: mocks.institute})}));
vi.mock('../../src/services/context/active-account-ctx', () => ({ActiveAccountCtx: createContext<any>(null)}));
vi.mock('../../src/services/context/language-ctx', () => ({LanguageCtx: createContext({en: true})}));
import { ActiveAccountCtx } from '../../src/services/context/active-account-ctx';
import { ProductsCtxProvider } from '../../src/services/context/products-ctx';
import { GrantsCtxProvider } from '../../src/services/context/grants-ctx';
import { EventsCtxProvider } from '../../src/services/context/events-ctx';
const account = {id: 1};
beforeEach(() => {
  mocks.auth.mockReset().mockResolvedValue({authorization: 'Bearer test'});
  mocks.error.mockReset();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, json: async () => []}));
});
afterEach(() => vi.unstubAllGlobals());
for (const [name, Provider] of [['products',ProductsCtxProvider],['grants',GrantsCtxProvider],['events',EventsCtxProvider]] as const) {
  describe(name + ' selector authentication', () => {
    it('waits for account readiness and sends the token when ready', async () => {
      let state = {localAccount: null as any, loading: true};
      const {rerender} = renderHook(() => null, {wrapper: ({children}) => <ActiveAccountCtx.Provider value={state as any}><Provider>{children}</Provider></ActiveAccountCtx.Provider>});
      await act(async () => {});
      expect(fetch).not.toHaveBeenCalled();
      state = {localAccount: account, loading: false};
      rerender();
      await waitFor(() => expect(fetch).toHaveBeenCalledWith(`/api/all-${name}?instituteId=lri`, {headers: {authorization: 'Bearer test'}}));
    });
    it('does not send anonymous requests when token acquisition returns null', async () => {
      mocks.auth.mockResolvedValue(null);
      renderHook(() => null, {wrapper: ({children}) => <ActiveAccountCtx.Provider value={{localAccount: account, loading: false} as any}><Provider>{children}</Provider></ActiveAccountCtx.Provider>});
      await act(async () => {});
      expect(mocks.auth).toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
      expect(mocks.error).not.toHaveBeenCalled();
    });
    it('preserves the server error text', async () => {
      vi.mocked(fetch).mockResolvedValue({ok: false, text: async () => 'Access denied'} as Response);
      renderHook(() => null, {wrapper: ({children}) => <ActiveAccountCtx.Provider value={{localAccount: account, loading: false} as any}><Provider>{children}</Provider></ActiveAccountCtx.Provider>});
      await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Access denied'));
    });
  });
}
