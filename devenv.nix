let
  sources = import ./npins;
in
{ pkgs, ... }:
{
  imports = [ "${sources.nixbook}/devenvModules/devenv.nix" ];

  packages = with pkgs; [
    nodejs_20
    pnpm_10
    just
  ];

  treefmt.config.programs.prettier = {
    excludes = [
      "node_modules"
    ];
    includes = [
      "*.md"
      "*.mdx"
      "*.json"
    ];
  };

  scripts = {
    "doc-dev".exec = "pnpm run docs:dev";
    "doc-dev".description = "Run VitePress dev server on port 5173";

    "doc-build".exec = "pnpm run docs:build";
    "doc-build".description = "Build documentation";

    "doc-preview".exec = "pnpm run docs:preview";
    "doc-preview".description = "Preview production build";
  };

  enterShell = ''
    echo ""
    echo -e "\033[1;33mAvailable tools:\033[0m"
    echo "  nodejs       $(node --version)"
    echo "  pnpm         $(pnpm --version)"
    echo "  just         $(just --version)"
    echo ""
    echo -e "\033[1;33mAvailable scripts:\033[0m"
    echo "  doc-dev     - Run VitePress dev server on port 5173"
    echo "  doc-build   - Build documentation"
    echo "  doc-preview - Preview production build"
    echo ""
  '';
}
