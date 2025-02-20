import * as vscode from "vscode";
import { NxItemBase } from "./nx-item-base";
import { NxProjItem } from "./nx-proj-item";

export class NxGroupItem extends NxItemBase {
  constructor(
    public readonly groupName: string,
    public readonly children: (NxProjItem | NxGroupItem)[]
  ) {
    super(groupName, vscode.TreeItemCollapsibleState.Expanded);

    this.checked = children.every((c) => c.checked);
  }

  add(child: NxProjItem | NxGroupItem) {
    this.children.push(child);
    this.checked = this.children.every((c) => c.checked);
  }

  hasSubgroup(name: string) {
    return this.getSubgroup(name) !== undefined;
  }

  getSubgroup(name: string): NxGroupItem | undefined {
    return this.children
      .filter((c) => c instanceof NxGroupItem)
      .find((c) => c.groupName === name);
  }

  public async toggle() {
    for (const child of this.children) {
      child.checked = this.checked;
      await child.toggle();
    }
  }
}
