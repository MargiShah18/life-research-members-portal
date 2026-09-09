import type { product } from "@prisma/client";
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

function enSorter(a: product, b: product): number {
  return (a.title_en || a.title_fr || "").localeCompare(
    b.title_en || b.title_fr || ""
  );
}

function frSorter(a: product, b: product): number {
  return (a.title_fr || a.title_en || "").localeCompare(
    b.title_fr || b.title_en || ""
  );
}

export const ProductsCtx = createContext<{
  products: product[];
  productMap: Map<number, product>;
  refresh: () => void;
  set: (product: product) => void;
}>(null as any);

export const ProductsCtxProvider: FC<PropsWithChildren> = ({ children }) => {
  const [products, setProducts] = useState<product[]>([]);
  const [productMap, setProductMap] = useState(new Map<number, product>());
  const { institute } = useSelectedInstitute();
  const { localAccount, loading: accountLoading } = useContext(ActiveAccountCtx);
  const { en } = useContext(LanguageCtx);

  const fetchAllProducts = useCallback(async () => {
    if (!institute || accountLoading || !localAccount) {
      return [];
    }

    try {
      const queryParam = `?instituteId=${institute.urlIdentifier}`;
      const headers = await getAuthHeader();
      if (!headers) return [];
      const res = await fetch(`${ApiRoutes.allProducts}${queryParam}`, { headers });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    } catch (e: any) {
      new Notification().error(e instanceof Error ? e.message : String(e));
      return [];
    }
  }, [institute, accountLoading, localAccount]);

  const getProducts = useCallback(async () => {
    const products = await fetchAllProducts();
    const sorter = en ? enSorter : frSorter;
    setProducts(products.sort(sorter));
    setProductMap(new Map(products.map((p: product) => [p.id, p])));
  }, [fetchAllProducts, en]);
  useEffect(() => {
    getProducts();
  }, [getProducts]);
  

  function refresh() {
    getProducts();
  }

  function set(prod: product) {
    setProducts((prev) => {
      const curr = prev.filter((p) => p.id !== prod.id);
      curr.push(prod);
      return curr.sort(en ? enSorter : frSorter);
    });
  }

  return (
    <ProductsCtx.Provider value={{ products, productMap, refresh, set }}>
      {children}
    </ProductsCtx.Provider>
  );
};