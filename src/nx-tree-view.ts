import * as vscode from "vscode";
import { ConfigurationProvider } from "./configuration-provider";
import { NxProvider } from "./nx-project-provider";
import { NxItemBase } from "./tree-item/nx-item-base";
import { NxGroupItem } from "./tree-item/nx-group-item";
import { NxProjItem } from "./tree-item/nx-proj-item";

export class NxTreeDataProvider implements vscode.TreeDataProvider<NxItemBase> {
  private _onDidChangeTreeData: vscode.EventEmitter<NxItemBase | undefined> =
    new vscode.EventEmitter<NxGroupItem | NxItemBase | undefined>();

  readonly onDidChangeTreeData: vscode.Event<
    NxGroupItem | NxItemBase | undefined
  > = this._onDidChangeTreeData.event;

  getTreeItem(element: NxItemBase): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: NxItemBase): Promise<NxItemBase[]> {
    try {
      if (element instanceof NxGroupItem) {
        return element.children;
      }

      const nxApps = await NxProvider.getNxProjects(false);

      const excludes = ConfigurationProvider.getExcludes(
        nxApps.map((p) => p.root)
      );

      var items = nxApps.map(
        (p) => new NxProjItem(p.name, p.root, p.projectType, !excludes[p.root])
      );

      const applications = items.filter((i) => i.type === "application");
      const libraries = items.filter((i) => i.type === "library");

      const libTree = this._buildTree(
        new NxGroupItem("Nx libs", []),
        libraries
      );

      return [new NxGroupItem("Nx Apps", applications), libTree];
    } catch {
      return [];
    }
  }

  private _buildTree(rootGroup: NxGroupItem, items: NxProjItem[]) {
    for (const item of items) {
      const pathParts = item.path.split("/");

      let parent = rootGroup;
      for (const part of pathParts.slice(0, -1)) {
        if (!parent.hasSubgroup(part)) {
          const newLib = new NxGroupItem(part, []);
          parent.add(newLib);
        }

        parent = parent.getSubgroup(part) ?? rootGroup;
      }

      parent.add(item);
    }

    return rootGroup;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  public static create(context: vscode.ExtensionContext) {
    const nxAppsProvider = new NxTreeDataProvider();
    const treeView = vscode.window.createTreeView("nxApps", {
      treeDataProvider: nxAppsProvider,
      showCollapseAll: false,
    });

    treeView.onDidChangeCheckboxState(
      async ({ items: [[nxItem]] }) => await nxItem.toggle()
    );
    const refreshCmd = vscode.commands.registerCommand("nxApps.refresh", () => {
      nxAppsProvider.refresh();
    });

    context.subscriptions.push(refreshCmd);
    context.subscriptions.push(treeView);
  }
}
