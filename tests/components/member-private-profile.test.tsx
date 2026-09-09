import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ loading: true, member: null as any, setMember: vi.fn(), replace: vi.fn() }));
vi.mock('next/router', () => ({default: {replace: mocks.replace, push: vi.fn()}}));
vi.mock('../../src/services/use-private-member-info', () => ({default: () => ({...mocks})}));
vi.mock('../../src/services/context/selected-institute-ctx', () => ({useAdminDetails: () => true}));
vi.mock('../../src/components/members/member-public-description', () => ({default: () => <div>Public details</div>}));
vi.mock('../../src/components/members/member-private-description', () => ({default: () => <div>Private details</div>}));
vi.mock('../../src/components/members/member-insight-description', () => ({default: () => <div>Insight details</div>}));
vi.mock('../../src/components/members/member-public-form', () => ({default: ({onSuccess}: any) => <button onClick={() => onSuccess({id: 20, saved: true})}>Save test changes</button>}));
vi.mock('../../src/components/members/member-private-form', () => ({default: () => null}));
vi.mock('../../src/components/members/member-insight-form', () => ({default: () => null}));
import PrivateMemberProfile from '../../src/components/members/member-private-profile';
import { ActiveAccountCtx } from '../../src/services/context/active-account-ctx';
import { SaveChangesCtx } from '../../src/services/context/save-changes-ctx';
import { LanguageCtx } from '../../src/services/context/language-ctx';
function page(superAdmin = false) {
  return <ActiveAccountCtx.Provider value={{localAccount: {is_super_admin: superAdmin, instituteAdmin: [{instituteId: 1}]}} as any}>
    <LanguageCtx.Provider value={{en: true} as any}>
    <SaveChangesCtx.Provider value={{saveChangesPrompt: vi.fn()} as any}>
      <PrivateMemberProfile id={20}/>
    </SaveChangesCtx.Provider>
    </LanguageCtx.Provider>
  </ActiveAccountCtx.Provider>;
}
beforeEach(() => { vi.clearAllMocks(); mocks.loading = true; mocks.member = null; });
const member = (instituteId: number) => ({id: 20, account: {first_name: 'Test', last_name: 'Member'}, institutes: [{instituteId}]});
describe('institute admin profile loading and editing', () => {
  it('waits for the member before authorizing, then allows editing and handles saved data', async () => {
    const {rerender} = render(page());
    expect(mocks.replace).not.toHaveBeenCalled();
    mocks.loading = false; mocks.member = member(1);
    rerender(page());
    fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
    fireEvent.click(await screen.findByRole('button', {name: 'Save test changes'}));
    expect(mocks.setMember).toHaveBeenCalledWith({id: 20, saved: true});
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it('redirects an unrelated institute admin after loading', async () => {
    mocks.loading = false; mocks.member = member(2);
    render(page());
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/members/20/public'));
  });
  it('preserves super-admin access across institutes', () => {
    mocks.loading = false; mocks.member = member(2);
    render(page(true));
    expect(screen.getByRole('button', {name: 'Edit'})).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
