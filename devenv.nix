{ pkgs, ... }:
{
  packages = with pkgs; [
    nodejs_20
    pnpm_10
    just
  ];

  git-hooks.hooks = {
    shellcheck.enable = true;
    treefmt = {
      enable = true;
      settings.fail-on-change = false;
    };
  };

  difftastic.enable = true;
  treefmt = {
    enable = true;
    config.programs = {
      nixfmt.enable = true;
      prettier = {
        enable = true;
        excludes = [
          ".git"
          ".devenv"
          "node_modules"
        ];
        includes = [
          "*.md"
          "*.mdx"
          "*.json"
        ];
        settings = {
          proseWrap = "preserve";
        };
      };
      shfmt.enable = true;
    };
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
    echo -e "\033[1;33m📦 Available tools:\033[0m"
    echo "  ✓ nodejs       $(node --version)"
    echo "  ✓ pnpm         $(pnpm --version)"
    echo "  ✓ just         $(just --version)"
    echo ""
    echo -e "\033[1;33m🔧 Available scripts:\033[0m"
    echo "  doc-dev     - Run VitePress dev server on port 5173"
    echo "  doc-build   - Build documentation"
    echo "  doc-preview - Preview production build"
    echo ""
  '';
}
