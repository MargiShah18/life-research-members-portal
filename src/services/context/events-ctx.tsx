import type { event } from "@prisma/client";
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

function enSorter(a: event, b: event): number {
  return (a.name_en || a.name_fr || "").localeCompare(
    b.name_en || b.name_fr || ""
  );
}

function frSorter(a: event, b: event): number {
  return (a.name_fr || a.name_en || "").localeCompare(
    b.name_fr || b.name_en || ""
  );
}
export const EventsCtx = createContext<{
  events: event[];
  eventMap: Map<number, event>;
  refresh: () => void;
  set: (event: event) => void;
}>(null as any);

export const EventsCtxProvider: FC<PropsWithChildren> = ({ children }) => {
  const [events, setEvents] = useState<event[]>([]);
  const [eventMap, setEventMap] = useState(new Map<number, event>());
  const { institute } = useSelectedInstitute();
  const { localAccount, loading: accountLoading } = useContext(ActiveAccountCtx);
  const { en } = useContext(LanguageCtx);

  const fetchAllEvents = useCallback(async () => {
    if (!institute || accountLoading || !localAccount) {
      return [];
    }

    try {
      const queryParam = `?instituteId=${institute.urlIdentifier}`;
      const headers = await getAuthHeader();
      if (!headers) return [];
      const res = await fetch(`${ApiRoutes.allEvents}${queryParam}`, { headers });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (e: any) {
      new Notification().error(e instanceof Error ? e.message : String(e));
      return [];
    }
  }, [institute, accountLoading, localAccount]);

  const getEvents = useCallback(async () => {
    const events = await fetchAllEvents();
    const sorter = en ? enSorter : frSorter;
    setEvents(events.sort(sorter));
    setEventMap(new Map(events.map((e: event) => [e.id, e])));
  }, [fetchAllEvents, en]);

  useEffect(() => {
    getEvents();
  }, [getEvents]);

  function refresh() {
    getEvents();
  }

  function set(eventItem: event) {
    setEvents((prev) => {
      const curr = prev.filter((e) => e.id !== eventItem.id);
      curr.push(eventItem);
      return curr.sort(en ? enSorter : frSorter);
    });
  }

  return (
    <EventsCtx.Provider value={{ events, eventMap, refresh, set }}>
      {children}
    </EventsCtx.Provider>
  );
};