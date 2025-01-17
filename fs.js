export const nixFiles = {
 'make-options-doc.nix': `# based on nixpkgs/nixos/lib/make-options-doc/default.nix

/* Generate JSON, XML and DocBook documentation for given NixOS options.
   Minimal example:
    { pkgs,  }:
    let
      eval = import (pkgs.path + "/nixos/lib/eval-config.nix") {
        baseModules = [
          ../module.nix
        ];
        modules = [];
      };
    in pkgs.nixosOptionsDoc {
      options = eval.options;
    }
*/
{ pkgs
, lib
, options
, transformOptions ? lib.id  # function for additional tranformations of the options
, revision ? "" # Specify revision for the options
}:

let
  # Replace functions by the string <function>
  substFunction = x:
    if builtins.isAttrs x then lib.mapAttrs (name: substFunction) x
    else if builtins.isList x then map substFunction x
    else if lib.isFunction x then "<function>"
    else x;

  optionsListDesc = lib.flip map optionsListVisible
   (opt: transformOptions opt
    // lib.optionalAttrs (opt ? example) { example = substFunction opt.example; }
    // lib.optionalAttrs (opt ? default) { default = substFunction opt.default; }
    // lib.optionalAttrs (opt ? type) { type = substFunction opt.type; }
    // lib.optionalAttrs (opt ? relatedPackages && opt.relatedPackages != []) { relatedPackages = genRelatedPackages opt.relatedPackages opt.name; }
   );

  # Generate DocBook documentation for a list of packages. This is
  # what \`relatedPackages\` option of \`mkOption\` from
  # ../../../lib/options.nix influences.
  #
  # Each element of \`relatedPackages\` can be either
  # - a string:  that will be interpreted as an attribute name from \`pkgs\`,
  # - a list:    that will be interpreted as an attribute path from \`pkgs\`,
  # - an attrset: that can specify \`name\`, \`path\`, \`package\`, \`comment\`
  #   (either of \`name\`, \`path\` is required, the rest are optional).
  genRelatedPackages = packages: optName:
    let
      unpack = p: if lib.isString p then { name = p; }
                  else if lib.isList p then { path = p; }
                  else p;
      describe = args:
        let
          title = args.title or null;
          name = args.name or (lib.concatStringsSep "." args.path);
          path = args.path or [ args.name ];
          package = args.package or (lib.attrByPath path (throw "Invalid package attribute path \`\${toString path}' found while evaluating \`relatedPackages' of option \`\${optName}'") pkgs);
        in "<listitem>"
        + "<para><literal>\${lib.optionalString (title != null) "\${title} aka "}pkgs.\${name} (\${package.meta.name})</literal>"
        + lib.optionalString (!package.meta.available) " <emphasis>[UNAVAILABLE]</emphasis>"
        + ": \${package.meta.description or "???"}.</para>"
        + lib.optionalString (args ? comment) "\n<para>\${args.comment}</para>"
        # Lots of \`longDescription's break DocBook, so we just wrap them into <programlisting>
        + lib.optionalString (package.meta ? longDescription) "\n<programlisting>\${package.meta.longDescription}</programlisting>"
        + "</listitem>";
    in "<itemizedlist>\${lib.concatStringsSep "\n" (map (p: describe (unpack p)) packages)}</itemizedlist>";

  # Custom "less" that pushes up all the things ending in ".enable*"
  # and ".package*"
  optionLess = a: b:
    let
      ise = lib.hasPrefix "enable";
      isp = lib.hasPrefix "package";
      cmp = lib.splitByAndCompare ise lib.compare
                                 (lib.splitByAndCompare isp lib.compare lib.compare);
    in lib.compareLists cmp a.loc b.loc < 0;

  # Remove invisible and internal options.
  optionsListVisible = lib.filter (opt: opt.visible && !opt.internal) (lib.optionAttrSetToDocList options);

  # Customly sort option list for the man page.
  optionsList = lib.sort optionLess optionsListDesc;

  # Convert the list of options into an XML file.
  optionsXML = builtins.toFile "options.xml" (builtins.toXML optionsList);

  optionsNix = builtins.listToAttrs (map (o: { name = o.name; value = removeAttrs o ["name" "visible" "internal"]; }) optionsList);

  # TODO: declarations: link to github
  singleAsciiDoc = name: value: ''
    == \${name}
    \${value.description}
    [discrete]
    === details
    Type:: \${value.type}
    \${ if lib.hasAttr "default" value
       then ''
        Default::
        +
        ----
        \${builtins.toJSON value.default}
        ----
      ''
      else "No Default:: {blank}"
    }
    \${ if value.readOnly
       then "Read Only:: {blank}"
      else ""
    }
    \${ if lib.hasAttr "example" value
       then ''
        Example::
        +
        ----
        \${builtins.toJSON value.example}
        ----
      ''
      else "No Example:: {blank}"
    }
  '';

  singleMDDoc = name: value: ''
    ## \${lib.escape [ "<" ">" ] name}
    \${value.description}
    \${lib.optionalString (value ? type) ''
      *_Type_*:
      \${value.type}
    ''}
    \${lib.optionalString (value ? default) ''
      *_Default_*
      \`\`\`
      \${builtins.toJSON value.default}
      \`\`\`
    ''}
    \${lib.optionalString (value ? example) ''
      *_Example_*
      \`\`\`
      \${builtins.toJSON value.example}
      \`\`\`
    ''}
  '';

in {
  inherit optionsNix;

  optionsAsciiDoc = lib.concatStringsSep "\n" (lib.mapAttrsToList singleAsciiDoc optionsNix);

  optionsMDDoc = lib.concatStringsSep "\n" (lib.mapAttrsToList singleMDDoc optionsNix);

  optionsJSON = pkgs.runCommand "options.json"
    { meta.description = "List of NixOS options in JSON format";
      buildInputs = [ pkgs.brotli ];
    }
    ''
      # Export list of options in different format.
      dst=$out/share/doc/nixos
      mkdir -p $dst
      cp \${builtins.toFile "options.json" (builtins.unsafeDiscardStringContext (builtins.toJSON optionsNix))} $dst/options.json
      brotli -9 < $dst/options.json > $dst/options.json.br
      mkdir -p $out/nix-support
      echo "file json $dst/options.json" >> $out/nix-support/hydra-build-products
      echo "file json-br $dst/options.json.br" >> $out/nix-support/hydra-build-products
    ''; # */

  optionsDocBook = pkgs.runCommand "options-docbook.xml" {} ''
    optionsXML=\${optionsXML}
    if grep /nixpkgs/nixos/modules $optionsXML; then
      echo "The manual appears to depend on the location of Nixpkgs, which is bad"
      echo "since this prevents sharing via the NixOS channel.  This is typically"
      echo "caused by an option default that refers to a relative path (see above"
      echo "for hints about the offending path)."
      exit 1
    fi
    \${pkgs.libxslt.bin}/bin/xsltproc \
      --stringparam revision '\${revision}' \
      -o intermediate.xml \${./options-to-docbook.xsl} $optionsXML
    \${pkgs.libxslt.bin}/bin/xsltproc \
      -o "$out" \${./postprocess-option-descriptions.xsl} intermediate.xml
  '';
}`,
    'lib.nix': `# nix-gui/nixui/nix/lib.nix

let
  inherit (import <nixpkgs> {}) pkgs lib;
in lib.makeExtensible (self: {
  /* Recurse through the option tree and declaration tree of a module
     in parallel, collecting the positions of the declarations in the
     module
     Type:
       collectDeclarationPositions ::
         AttrSet -> AttrSet -> [{ loc = [String]; position = Position; }]
  */
  collectDeclarationPositions = options: declarations:
    lib.concatMap
      (k: if ((options."\${k}"._type or "") == "option")
          then [{loc = options."\${k}".loc; position = builtins.unsafeGetAttrPos k declarations;}]
          else self.collectDeclarationPositions options."\${k}" declarations."\${k}")
      (builtins.attrNames declarations);

  /* Extract the declarations of a module
  */
  evalModuleStub = module_path:
    let
      m = import module_path;
    in
      if builtins.isFunction m then
        m {
          inherit lib;
          name = "";
          config = {};
          pkgs = {};
          modulesPath = builtins.dirOf module_path;
        }
      else m;

  /* Get all NixOS options as a list of options with the following schema:
    {
      "option.name": {
        "description": String              # description declared on the option
        "loc": [ String ]                  # the path of the option e.g.: [ "services" "foo" "enable" ]
        "readOnly": Bool                   # is the option user-customizable?
        "type": String                     # either "boolean", "set", "list", "int", "float", or "string"
        "relatedPackages": Optional, XML   # documentation for packages related to the option
      }
    }
  */
  get_all_nixos_options = let
    inherit (import <nixpkgs/nixos> { configuration = {}; }) options;
  in builtins.mapAttrs
    (n: v: builtins.removeAttrs v ["default" "declarations"])
    (pkgs.nixosOptionsDoc { inherit options; }).optionsNix;

  /* Extract all positions of the declarations in a module
  */
  get_modules_defined_attrs = module_path: let
    inherit (self) collectDeclarationPositions evalModuleStub;

    nixos = import <nixpkgs/nixos> {configuration={};};

    config = builtins.removeAttrs (evalModuleStub module_path) ["imports"];
  in
    collectDeclarationPositions nixos.options config;

})`,

};
