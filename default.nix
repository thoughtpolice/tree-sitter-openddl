{ repo ? builtins.fetchGit ./.
, versionFile ? ./.version
, officialRelease ? false

, nixpkgs ? null
, config ? {}
, system ? builtins.currentSystem
}:

let
  bootstrap = import ./nix/bootstrap.nix {
    inherit nixpkgs config system;
    inherit repo officialRelease versionFile;
  };

  pkgs = bootstrap.pkgs;

  tree-sitter-bin = pkgs.stdenv.mkDerivation rec {
    pname = "tree-sitter";
    version = "0.16.2";

    src = pkgs.fetchurl {
      url    = "https://github.com/${pname}/${pname}/releases/download/${version}/${pname}-linux-x64.gz";
      sha256 = "14yrwbv4rdmng5ngv9ak94k5g6mgd7mzhzbk2j0h3ljcwlmd9r38";
    };

    unpackPhase = ''
      gunzip -c $src > ./tree-sitter
    '';

    buildPhase = ''
      chmod +x ./tree-sitter
      patchelf --set-interpreter "$(cat $NIX_CC/nix-support/dynamic-linker)" ./tree-sitter
    '';

    installPhase = ''
      mkdir -p $out/bin
      mv ./tree-sitter $out/bin/tree-sitter
    '';
  };
in

pkgs.stdenv.mkDerivation {
  pname = "tree-sitter-openddl";
  inherit (bootstrap) version;
  src = repo;

  nativeBuildInputs = [ tree-sitter-bin pkgs.nodejs ];
  doCheck = true;

  passthru = { inherit tree-sitter-bin; };

  configurePhase = ''
    # needed for tree-sitter generate
    export HOME=`mktemp -d`
  '';

  buildPhase = "tree-sitter generate";
  checkPhase = ''
    tree-sitter test
    ./examples/check.sh
  '';

  installPhase = ''
    mkdir -p $out
    cp -R src/* $out
    rm -f $out/binding.cc
  '';
}
