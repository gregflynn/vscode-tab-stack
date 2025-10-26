import * as vscode from "vscode";

interface TabInfo {
  label: string;
  uri: vscode.Uri | undefined;
  viewColumn: vscode.ViewColumn | undefined;
  lastFocusedTime: number;
}

class TabStackProvider implements vscode.TreeDataProvider<TabInfo> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    TabInfo | undefined | null | void
  > = new vscode.EventEmitter<TabInfo | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    TabInfo | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private tabMap: Map<string, TabInfo> = new Map();

  constructor() {
    this.refreshTabs();
  }

  refresh(): void {
    this.refreshTabs();
    this._onDidChangeTreeData.fire();
  }

  private refreshTabs(): void {
    const tabGroups = vscode.window.tabGroups.all;
    const currentTabs = new Set<string>();

    for (const group of tabGroups) {
      for (const tab of group.tabs) {
        if (tab.input instanceof vscode.TabInputText) {
          const uri = tab.input.uri;
          const key = uri.toString();
          currentTabs.add(key);

          if (!this.tabMap.has(key)) {
            // New tab, add it
            this.tabMap.set(key, {
              label: this.getTabLabel(uri),
              uri: uri,
              viewColumn: group.viewColumn,
              lastFocusedTime: tab.isActive ? Date.now() : 0,
            });
          } else if (tab.isActive) {
            // Update focus time for active tab
            const existingTab = this.tabMap.get(key)!;
            existingTab.lastFocusedTime = Date.now();
            existingTab.viewColumn = group.viewColumn;
          }
        }
      }
    }

    // Remove closed tabs
    for (const key of this.tabMap.keys()) {
      if (!currentTabs.has(key)) {
        this.tabMap.delete(key);
      }
    }
  }

  private getTabLabel(uri: vscode.Uri): string {
    const fileName = uri.path.split("/").pop() || uri.toString();
    return fileName;
  }

  getTreeItem(element: TabInfo): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      element.label,
      vscode.TreeItemCollapsibleState.None
    );
    treeItem.resourceUri = element.uri;
    treeItem.tooltip = element.uri?.fsPath || element.label;
    treeItem.description = element.uri
      ? vscode.workspace.asRelativePath(element.uri.fsPath, false)
      : "";
    treeItem.command = {
      command: "tabStack.openTab",
      title: "Open Tab",
      arguments: [element],
    };

    // Add icon based on file type
    if (element.uri) {
      treeItem.iconPath = vscode.ThemeIcon.File;
    }

    return treeItem;
  }

  getChildren(element?: TabInfo): Thenable<TabInfo[]> {
    if (element) {
      return Promise.resolve([]);
    }

    // Sort tabs by most recently focused
    const tabs = Array.from(this.tabMap.values());
    tabs.sort((a, b) => b.lastFocusedTime - a.lastFocusedTime);

    return Promise.resolve(tabs);
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Tab Stack extension is now active!");

  const tabStackProvider = new TabStackProvider();

  // Register tree view
  const treeView = vscode.window.createTreeView("tabStackView", {
    treeDataProvider: tabStackProvider,
  });

  // Register commands
  const refreshCommand = vscode.commands.registerCommand(
    "tabStack.refreshTabList",
    () => {
      tabStackProvider.refresh();
    }
  );

  const openTabCommand = vscode.commands.registerCommand(
    "tabStack.openTab",
    (tabInfo: TabInfo) => {
      if (tabInfo.uri) {
        vscode.window.showTextDocument(tabInfo.uri, {
          preview: false,
          viewColumn: tabInfo.viewColumn,
        });
      }
    }
  );

  const closeTabCommand = vscode.commands.registerCommand(
    "tabStack.closeTab",
    async (tabInfo: TabInfo) => {
      if (!tabInfo.uri) {
        return;
      }

      // Find and close the tab
      const tabGroups = vscode.window.tabGroups.all;
      for (const group of tabGroups) {
        for (const tab of group.tabs) {
          if (
            tab.input instanceof vscode.TabInputText &&
            tab.input.uri.toString() === tabInfo.uri.toString()
          ) {
            await vscode.window.tabGroups.close(tab);
            return;
          }
        }
      }
    }
  );

  // Listen for tab changes
  const tabChangeListener = vscode.window.tabGroups.onDidChangeTabs(() => {
    tabStackProvider.refresh();
  });

  const activeTabChangeListener = vscode.window.tabGroups.onDidChangeTabGroups(
    () => {
      tabStackProvider.refresh();
    }
  );

  context.subscriptions.push(
    treeView,
    refreshCommand,
    openTabCommand,
    closeTabCommand,
    tabChangeListener,
    activeTabChangeListener
  );
}

export function deactivate() {}
