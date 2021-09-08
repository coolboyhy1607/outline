// @flow
import { action, computed, observable, set } from "mobx";
import parseTitle from "shared/utils/parseTitle";
import ExplorerStore from "stores/ExplorerStore";
import BaseModel from "models/BaseModel";
import User from "models/User";

export default class Explorer extends BaseModel {
  //   @observable isSaving: boolean = false;
  //   @observable embedsDisabled: boolean = false;
  //   @observable injectTemplate: boolean = false;
  //   @observable lastViewedAt: ?string;
  store: ExplorerStore;

  collectionId: string;
  createdAt: string;
  createdBy: User;
  updatedAt: string;
  updatedBy: User;
  id: string;
  text: string;
  title: string;
  emoji: string;
  parentDocumentId: ?string;
  publishedAt: ?string;
  url: string;
  urlId: string;
  revision: number;

  //   constructor(fields: Object, store: ExplorerStore) {
  //     super(fields, store);
  //   }

  get emoji() {
    const { emoji } = parseTitle(this.title);
    return emoji;
  }

  /**
   * Best-guess the text direction of the document based on the language the
   * title is written in. Note: wrapping as a computed getter means that it will
   * only be called directly when the title changes.
   */
  @computed
  get dir(): "rtl" | "ltr" {
    const element = document.createElement("p");
    element.innerHTML = this.title;
    element.style.visibility = "hidden";
    element.dir = "auto";

    // element must appear in body for direction to be computed
    document.body?.appendChild(element);

    const direction = window.getComputedStyle(element).direction;
    document.body?.removeChild(element);
    return direction;
  }

  @computed
  get isOnlyTitle(): boolean {
    return !this.text.trim();
  }

  @computed
  get isStarred(): boolean {
    return !!this.store.starredIds.get(this.id);
  }

  @computed
  get titleWithDefault(): string {
    return this.title || "Untitled";
  }
  @action
  view = () => {
    return this.store.rootStore.views.create({ documentId: this.id });
  };
}
