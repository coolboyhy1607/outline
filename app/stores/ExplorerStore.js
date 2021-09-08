// @flow
import path from "path";
import invariant from "invariant";
import { find, orderBy, filter, compact, omitBy } from "lodash";
import { observable, action, computed, runInAction } from "mobx";
import { MAX_TITLE_LENGTH } from "shared/constants";
import { subtractDate } from "shared/utils/date";
import naturalSort from "shared/utils/naturalSort";
import BaseStore from "stores/BaseStore";
import RootStore from "stores/RootStore";
import Explorer from "models/Explorer";
import env from "env";
import type {
  NavigationNode,
  FetchOptions,
  PaginationParams,
  SearchResult,
} from "types";
import { client } from "utils/ApiClient";

export default class ExplorerStore extends BaseStore<Explorer> {
  @observable searchCache: Map<string, SearchResult[]> = new Map();
  @observable backlinks: Map<string, string[]> = new Map();

  constructor(rootStore: RootStore) {
    super(rootStore, Explorer);
  }

  @computed
  get all(): Explorer[] {
    return filter(this.orderedData);
  }

  createdByUser(userId: string): Explorer[] {
    return orderBy(
      filter(this.all, (d) => d.createdBy.id === userId),
      "updatedAt",
      "desc"
    );
  }

  inCollection(collectionId: string): Explorer[] {
    return filter(
      this.all,
      (document) => document.collectionId === collectionId
    );
  }

  publishedInCollection(collectionId: string): Explorer[] {
    return filter(
      this.all,
      (document) =>
        document.collectionId === collectionId && !!document.publishedAt
    );
  }

  alphabeticalInCollection(collectionId: string): Explorer[] {
    return naturalSort(this.inCollection(collectionId), "title");
  }

  @computed
  get starredAlphabetical(): Explorer[] {
    return naturalSort(this.starred, "title");
  }

  @computed
  get active(): ?Explorer {
    return this.rootStore.ui.activeDocumentId
      ? this.data.get(this.rootStore.ui.activeDocumentId)
      : undefined;
  }

  @action
  fetchBacklinks = async (documentId: string): Promise<?(Explorer[])> => {
    const res = await client.post(`/documents.list`, {
      backlinkDocumentId: documentId,
    });
    invariant(res && res.data, "Document list not available");
    const { data } = res;
    runInAction("ExplorerStore#fetchBacklinks", () => {
      data.forEach(this.add);
      this.addPolicies(res.policies);
      this.backlinks.set(
        documentId,
        data.map((doc) => doc.id)
      );
    });
  };

  getBacklinedDocuments(documentId: string): Explorer[] {
    const documentIds = this.backlinks.get(documentId) || [];
    return orderBy(
      compact(documentIds.map((id) => this.data.get(id))),
      "updatedAt",
      "desc"
    );
  }

  @action
  fetchChildDocuments = async (documentId: string): Promise<?(Explorer[])> => {
    const res = await client.post(`/documents.list`, {
      parentDocumentId: documentId,
    });
    invariant(res && res.data, "Document list not available");
    const { data } = res;
    runInAction("ExplorerStore#fetchChildDocuments", () => {
      data.forEach(this.add);
      this.addPolicies(res.policies);
    });
  };

  @action
  fetchNamedPage = async (
    request: string = "list",
    options: ?Object
  ): Promise<?(Explorer[])> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/documents.${request}`, options);
      invariant(res && res.data, "Document list not available");
      runInAction("ExplorerStore#fetchNamedPage", () => {
        res.data.forEach(this.add);
        this.addPolicies(res.policies);
        this.isLoaded = true;
      });
      return res.data;
    } finally {
      this.isFetching = false;
    }
  };

  @action
  fetchAlphabetical = async (options: ?PaginationParams): Promise<*> => {
    return this.fetchNamedPage("list", {
      sort: "title",
      direction: "ASC",
      ...options,
    });
  };

  @action
  fetchRecentlyPublished = async (options: ?PaginationParams): Promise<*> => {
    return this.fetchNamedPage("list", {
      sort: "publishedAt",
      direction: "DESC",
      ...options,
    });
  };
  @action
  fetchOwned = (options: ?PaginationParams): Promise<*> => {
    return this.fetchNamedPage("list", options);
  };

  @action
  searchTitles = async (query: string) => {
    const res = await client.get("/documents.search_titles", {
      query,
    });
    invariant(res && res.data, "Search response should be available");

    // add the documents and associated policies to the store
    res.data.forEach(this.add);
    this.addPolicies(res.policies);
    return res.data;
  };

  @action
  search = async (
    query: string,
    options: {
      offset?: number,
      limit?: number,
      dateFilter?: "day" | "week" | "month" | "year",
      includeArchived?: boolean,
      includeDrafts?: boolean,
      collectionId?: string,
      userId?: string,
    }
  ): Promise<SearchResult[]> => {
    const compactedOptions = omitBy(options, (o) => !o);
    const res = await client.get("/documents.search", {
      ...compactedOptions,
      query,
    });
    invariant(res && res.data, "Search response should be available");

    // add the documents and associated policies to the store
    res.data.forEach((result) => this.add(result.document));
    this.addPolicies(res.policies);

    // store a reference to the document model in the search cache instead
    // of the original result from the API.
    const results: SearchResult[] = compact(
      res.data.map((result) => {
        const document = this.data.get(result.document.id);
        if (!document) return null;

        return {
          ranking: result.ranking,
          context: result.context,
          document,
        };
      })
    );

    let existing = this.searchCache.get(query) || [];

    // splice modifies any existing results, taking into account pagination
    existing.splice(options.offset || 0, options.limit || 0, ...results);

    this.searchCache.set(query, existing);
    return res.data;
  };

  @action
  fetch = async (
    id: string,
    options: FetchOptions = {}
  ): Promise<{ document: ?Explorer, sharedTree?: NavigationNode }> => {
    if (!options.prefetch) this.isFetching = true;

    try {
      const doc: ?Explorer = this.data.get(id) || this.getByUrl(id);
      const policy = doc ? this.rootStore.policies.get(doc.id) : undefined;
      if (doc && policy && !options.force) {
        return { document: doc };
      }

      const res = await client.post("/documents.info", {
        id,
        shareId: options.shareId,
        apiVersion: 2,
      });
      invariant(res && res.data, "Document not available");

      this.addPolicies(res.policies);
      this.add(res.data.document);

      return {
        document: this.data.get(res.data.document.id),
        sharedTree: res.data.sharedTree,
      };
    } finally {
      this.isFetching = false;
    }
  };

  star = async (document: Explorer) => {
    this.starredIds.set(document.id, true);

    try {
      return client.post("/documents.star", { id: document.id });
    } catch (err) {
      this.starredIds.set(document.id, false);
    }
  };

  unstar = (document: Explorer) => {
    this.starredIds.set(document.id, false);

    try {
      return client.post("/documents.unstar", { id: document.id });
    } catch (err) {
      this.starredIds.set(document.id, false);
    }
  };

  getByUrl = (url: string = ""): ?Explorer => {
    return find(this.orderedData, (doc) => url.endsWith(doc.urlId));
  };

  getCollectionForDocument(document: Explorer) {
    return this.rootStore.collections.data.get(document.collectionId);
  }
}
