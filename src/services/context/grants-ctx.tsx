import type { grant } from "@prisma/client";
import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import getAuthHeader from "../headers/auth-header";
import { ActiveAccountCtx } from "./active-account-ctx";
import ApiRoutes from "../../routing/api-routes";
import Notification from "../notifications/notification";
import { LanguageCtx } from "./language-ctx";
import { useSelectedInstitute } from "./selected-institute-ctx";

function enSorter(a: grant, b: grant): number {
  return a.title.localeCompare(b.title);
}

function frSorter(a: grant, b: grant): number {
  return a.title.localeCompare(b.title);
}

export const GrantsCtx = createContext<{
  grants: grant[];
  grantMap: Map<number, grant>;
  refresh: () => void;
  set: (grant: grant) => void;
}>(null as any);

export const GrantsCtxProvider: FC<PropsWithChildren> = ({ children }) => {
  const [grants, setGrants] = useState<grant[]>([]);
  const [grantMap, setGrantMap] = useState(new Map<number, grant>());
  const { institute } = useSelectedInstitute();
  const { localAccount, loading: accountLoading } = useContext(ActiveAccountCtx);
  const { en } = useContext(LanguageCtx);

  const fetchAllGrants = useCallback(async () => {
    if (!institute || accountLoading || !localAccount) {
      return [];
    }

    try {
      const queryParam = `?instituteId=${institute.urlIdentifier}`;
      const headers = await getAuthHeader();
      if (!headers) return [];
      const res = await fetch(`${ApiRoutes.allGrants}${queryParam}`, { headers });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (e: any) {
      new Notification().error(e instanceof Error ? e.message : String(e));
      return [];
    }
  }, [institute, accountLoading, localAccount]);

  const getGrants = useCallback(async () => {
    const grants = await fetchAllGrants();
    const sorter = en ? enSorter : frSorter;
    setGrants(grants.sort(sorter));
    setGrantMap(new Map(grants.map((g: grant) => [g.id, g])));
  }, [fetchAllGrants, en]);

  useEffect(() => {
    getGrants();
  }, [getGrants]);

  function refresh() {
    getGrants();
  }

  function set(grnt: grant) {
    setGrants((prev) => {
      const curr = prev.filter((g) => g.id !== grnt.id);
      curr.push(grnt);
      return curr.sort(en ? enSorter : frSorter);
    });
  }

  return (
    <GrantsCtx.Provider value={{ grants, grantMap, refresh, set }}>
      {children}
    </GrantsCtx.Provider>
  );
};