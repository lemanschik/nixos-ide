# nixos-ide

edit nixos configuration in a graphical interface includes extensions. is based on code-oss 

## status

proof of concept

## todo

* prototype an **incremental** nix evaluator for 
- [x] [rnix-es](https://github.com/nix-community/rnix-lsp/issues/41)


## concept

* use `nix repl` to discover the nixos config schema
  * latency is much better than with `nix-instantiate`
* thin client: request only a minimum amount of data to render the current view
* introspection: auto-generate the editor interface, based on the nixos config schema
  * related topic: [json-schema-form](https://github.com/topics/json-schema-form)
  * similar project: [graphql api viewer](https://github.com/Brbb/graphql-rover)
* graphics and text
  * graphical interface
    * [click-node-to-select in cytoscapejs](http://manual.cytoscape.org/en/stable/Navigation_and_Layout.html#select)
    * [click-node-to-zoom in cytoscapejs](https://stackoverflow.com/questions/52255932/how-to-zoom-in-a-selected-node-in-cytoscape)
  * text interface
    * [treeview widget in solidjs](https://milahu.github.io/solidjs-treeview-component/)

## related

this project is based on

* [lezer-parser-nix](https://github.com/milahu/lezer-parser-nix) - nix parser in javascript
* [monaco-lezer-parser](https://github.com/milahu/monaco-lezer-parser) - integration for monaco-editor and lezer-parser
* [nix-eval-js](https://github.com/milahu/nix-eval-js) - nix interpreter in javascript
* [solidjs-resizable-splitter-component](https://github.com/milahu/solidjs-resizable-splitter-component)
* [solidjs-monaco-editor-component](https://github.com/milahu/solidjs-monaco-editor-component)

todo: 
- [ ] [tree-sitter](https://github.com/tree-sitter/tree-sitter) parsers for WASM browsers

* [tree-sitter-nix](https://github.com/cstrahan/tree-sitter-nix) - nix parser in WASM
* [monaco-tree-sitter](https://github.com/milahu/monaco-tree-sitter) - integration for monaco-editor and tree-sitter

[nixos-patch-installer](https://github.com/milahu/nixos-patch-installer) is an old version of this project, with a focus on connecting [nixpkgs PRs](https://github.com/NixOS/nixpkgs/pulls) and `/etc/nixos`

## similar projects

* https://github.com/nix-gui/nix-gui
* https://nixos.wiki/wiki/NixOS_configuration_editors
