const vscode = acquireVsCodeApi();

const searchBox = document.getElementById("search-input");
const resultsList = document.getElementById("results-list");
const previewText = document.getElementById("preview-code");
const resultCount = document.getElementById("result-count");

const FILE_ICONS = {
  // Ruby
  rb: "ruby-original.svg",
  erb: "ruby-original.svg",
  rake: "ruby-original.svg",
  gemspec: "ruby-original.svg",
  ru: "ruby-original.svg",

  //JavaScript / TypeScript
  js: "javascript-original.svg",
  mjs: "javascript-original.svg",
  cjs: "javascript-original.svg",
  es6: "javascript-original.svg",
  ts: "typescript-original.svg",
  mts: "typescript-original.svg",
  cts: "typescript-original.svg",
  jsx: "react-original.svg",
  tsx: "react-original.svg",
  vue: "vuejs-original.svg",
  svelte: "svelte-original.svg",
  astro: "astro-original.svg",

  //HTML / CSS
  html: "html5-original.svg",
  htm: "html5-original.svg",
  xhtml: "html5-original.svg",
  css: "css3-original.svg",
  scss: "sass-original.svg",
  sass: "sass-original.svg",
  less: "less-plain-wordmark.svg",
  styl: "stylus-original.svg",
  stylus: "stylus-original.svg",
  postcss: "postcss-original.svg",

  //JSON / Config
  json: "json.svg",
  jsonc: "json.svg",
  json5: "json.svg",
  yaml: "yaml-original.svg",
  yml: "yaml-original.svg",
  toml: "toml-original.svg",
  ini: "settings.svg",
  cfg: "settings.svg",
  conf: "settings.svg",
  properties: "settings.svg",
  env: "settings.svg",
  xml: "xml-original.svg",
  plist: "xml-original.svg",

  //Markdown / Docs
  md: "markdown-original.svg",
  mdx: "markdown-original.svg",
  markdown: "markdown-original.svg",
  rst: "markdown-original.svg",
  adoc: "asciidoc-original.svg",
  txt: "text.svg",

  //Python
  py: "python-original.svg",
  pyw: "python-original.svg",
  pyi: "python-original.svg",
  ipynb: "jupyter-original.svg",

  //Go
  go: "go-original.svg",
  mod: "go-original.svg",
  sum: "go-original.svg",

  //Rust
  rs: "rust-original.svg",
  rlib: "rust-original.svg",

  //Java / JVM
  java: "java-original.svg",
  class: "java-original.svg",
  jar: "java-original.svg",
  kt: "kotlin-original.svg",
  kts: "kotlin-original.svg",
  scala: "scala-original.svg",
  groovy: "groovy-original.svg",
  gradle: "gradle-original.svg",

  //PHP
  php: "php-original.svg",
  phtml: "php-original.svg",

  //C / C++
  c: "c-original.svg",
  h: "c-original.svg",
  cpp: "cplusplus-original.svg",
  cxx: "cplusplus-original.svg",
  cc: "cplusplus-original.svg",
  hpp: "cplusplus-original.svg",
  hxx: "cplusplus-original.svg",
  hh: "cplusplus-original.svg",

  //C#
  cs: "csharp-original.svg",
  csproj: "dotnetcore-original.svg",
  sln: "dotnetcore-original.svg",
  razor: "blazor-original.svg",

  //F#
  fs: "fsharp-original.svg",
  fsx: "fsharp-original.svg",

  //Swift
  swift: "swift-original.svg",

  //Dart / Flutter
  dart: "dart-original.svg",

  //Elixir
  ex: "elixir-original.svg",
  exs: "elixir-original.svg",

  //Erlang
  erl: "erlang-original.svg",
  hrl: "erlang-original.svg",

  //Haskell
  hs: "haskell-original.svg",

  //OCaml
  ml: "ocaml-original.svg",
  mli: "ocaml-original.svg",

  //Clojure
  clj: "clojure-original.svg",
  cljs: "clojure-original.svg",
  cljc: "clojure-original.svg",

  //Lua
  lua: "lua-original.svg",

  //Perl
  pl: "perl-original.svg",
  pm: "perl-original.svg",

  // R
  r: "r-original.svg",

  //Julia
  jl: "julia-original.svg",

  //Nim
  nim: "nim-original.svg",

  //Zig
  zig: "zig-original.svg",

  //Crystal
  cr: "crystal-original.svg",

  //Solidityx
  sol: "solidity-original.svg",

  //SQL
  sql: "sql.svg",
  prisma: "prisma-original.svg",
  "prisma.schema": "prisma-original.svg",

  //Shell
  sh: "bash-original.svg",
  bash: "bash-original.svg",
  zsh: "zsh-original.svg",
  fish: "bash-original.svg",
  ksh: "bash-original.svg",

  //PowerShell
  ps1: "powershell-original.svg",
  psm1: "powershell-original.svg",
  psd1: "powershell-original.svg",

  //Containers
  Dockerfile: "docker-original.svg",
  dockerignore: "docker-original.svg",

  //Kubernetes
  kustomization: "kubernetes-original.svg",
  k8s: "kubernetes-original.svg",

  //Terraform
  tf: "terraform-original.svg",
  tfvars: "terraform-original.svg",

  //Helm
  helm: "helm-original.svg",

  //Nix
  nix: "nixos-original.svg",

  //Build Systems
  Makefile: "cmake-original.svg",
  makefile: "cmake-original.svg",
  cmake: "cmake-original.svg",
  bazel: "bazel-original.svg",
  bzl: "bazel-original.svg",

  //Version Control
  gitignore: "git-original.svg",
  gitattributes: "git-original.svg",
  gitmodules: "git-original.svg",

  //Default
  default: "default.svg",
};

// function getFileIconPath(file) {
//     const ext = file.split(".").pop().toLowerCase();
//     return `${ICON_BASE}/${FILE_ICONS[ext] || FILE_ICONS.default}`;
// }

// function getFileIconPath(file) {
//   const name = file.split(/[\\/]/).pop();

//   switch (name.toLowerCase()) {
//     case "dockerfile":
//       return `${ICON_BASE}/${FILE_ICONS.Dockerfile}`;

//     case "makefile":
//       return `${ICON_BASE}/${FILE_ICONS.Makefile}`;

//     case ".dockerignore":
//       return `${ICON_BASE}/${FILE_ICONS.dockerignore}`;

//     case ".gitignore":
//       return `${ICON_BASE}/${FILE_ICONS.gitignore}`;

//     case ".gitattributes":
//       return `${ICON_BASE}/${FILE_ICONS.gitattributes}`;

//     case ".gitmodules":
//       return `${ICON_BASE}/${FILE_ICONS.gitmodules}`;
//   }

//   const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";

//   return `${ICON_BASE}/${FILE_ICONS[ext] || FILE_ICONS.default}`;
// }

function getFileIconPath(file) {
  const name = file.split(/[\\/]/).pop();
  const lowerName = name.toLowerCase();

  // 1. Exact filename match
  if (FILE_NAME_ICONS[lowerName]) {
    return `${ICON_BASE}/${FILE_NAME_ICONS[lowerName]}`;
  }

  // 2. Special filenames
  switch (name.toLowerCase()) {
    case "dockerfile":
      return `${ICON_BASE}/${FILE_ICONS.Dockerfile}`;

    case "makefile":
      return `${ICON_BASE}/${FILE_ICONS.Makefile}`;

    case ".dockerignore":
      return `${ICON_BASE}/${FILE_ICONS.dockerignore}`;

    case ".gitignore":
      return `${ICON_BASE}/${FILE_ICONS.gitignore}`;

    case ".gitattributes":
      return `${ICON_BASE}/${FILE_ICONS.gitattributes}`;

    case ".gitmodules":
      return `${ICON_BASE}/${FILE_ICONS.gitmodules}`;
  }

  // 3. Extension lookup
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";

  return `${ICON_BASE}/${FILE_ICONS[ext] || FILE_ICONS.default}`;
}

let results = [];
let selectedIndex = -1;
let currentPreviewFile = "";
let activeSearchId = 0;
let activePreviewId = 0;

let debounceTimeout = null;
const DEBOUNCE_MS = 200;

const EXTENSION_LANGUAGE = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  jsonc: "json",
  html: "html",
  htm: "html",
  css: "css",
  scss: "css",
  sass: "css",
  py: "python",
  rb: "ruby",
  erb: "ruby",
  go: "go",
  rs: "rust",
  lua: "lua",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  php: "php",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  sql: "sql",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  cc: "cpp",
  cs: "csharp",
  zig: "zig",
  nix: "nix",
  dockerfile: "dockerfile",
  es6: "javascript",
  mts: "typescript",
  cts: "typescript",
  vue: "vue",
  svelte: "svelte",
  astro: "astro",
  less: "less",
  styl: "stylus",
  stylus: "stylus",
  json5: "json",
  pyw: "python",
  pyi: "python",
  ipynb: "python",
  scala: "scala",
  groovy: "groovy",
  dart: "dart",
  swift: "swift",
  fs: "fsharp",
  fsx: "fsharp",
  erl: "erlang",
  hrl: "erlang",
  ex: "elixir",
  exs: "elixir",
  clj: "clojure",
  cljs: "clojure",
  cljc: "clojure",
  jl: "julia",
  nim: "nim",
  cr: "crystal",
  sol: "solidity",
  pl: "perl",
  pm: "perl",
  r: "r",
  hs: "haskell",
  ml: "ocaml",
  mli: "ocaml",
  fish: "shell",
  ksh: "shell",
  ps1: "powershell",
  psm1: "powershell",
  psd1: "powershell",
  tf: "terraform",
  tfvars: "terraform",
  cmake: "cmake",
  bazel: "starlark",
  bzl: "starlark",
  gradle: "gradle",
  md: "markdown",
  mdx: "markdown",
  markdown: "markdown",
  rst: "plaintext",
  adoc: "plaintext",
  xml: "xml",
};

const FILE_NAME_ICONS = {
  // Package Managers
  "package.json": "npm-original-wordmark.svg",
  "package-lock.json": "npm-original-wordmark.svg",
  "npm-shrinkwrap.json": "npm-original-wordmark.svg",
  "yarn.lock": "yarn-original.svg",
  "pnpm-lock.yaml": "pnpm-original.svg",
  "pnpm-workspace.yaml": "pnpm-original.svg",
  "bun.lockb": "bun-original.svg",
  "bun.lock": "bun-original.svg",
  "bunfig.toml": "bun-original.svg",
  "deno.json": "denojs-original.svg",
  "deno.jsonc": "denojs-original.svg",

  // Vite
  "vite.config.js": "vitejs-original.svg",
  "vite.config.ts": "vitejs-original.svg",
  "vite.config.mjs": "vitejs-original.svg",
  "vite.config.cjs": "vitejs-original.svg",
  "vite.config.mts": "vitejs-original.svg",
  "vite.config.cts": "vitejs-original.svg",
  "vite.config.mjs": "vitejs-original.svg",
  "vite.config.cjs": "vitejs-original.svg",

  // Vitest
  "vitest.config.js": "vitest-original.svg",
  "vitest.config.ts": "vitest-original.svg",
  "vitest.config.mjs": "vitest-original.svg",
  "vitest.config.cjs": "vitest-original.svg",
  "vite.config.mts": "vitejs-original.svg",
  "vite.config.cts": "vitejs-original.svg",
  "vite.config.mjs": "vitejs-original.svg",
  "vite.config.cjs": "vitejs-original.svg",

  // Rolldown
  "rolldown.config.js": "rolldown-original.svg",
  "rolldown.config.ts": "rolldown-original.svg",
  "rolldown.config.mjs": "rolldown-original.svg",
  "rolldown.config.mts": "rolldown-original.svg",
  "rolldown.config.cts": "rolldown-original.svg",

  // Rollup
  "rollup.config.js": "rollup-original.svg",
  "rollup.config.ts": "rollup-original.svg",
  "rollup.config.mjs": "rollup-original.svg",
  "rollup.config.cjs": "rollup-original.svg",
  "rollup.config.mts": "rollup-original.svg",
  "rollup.config.cts": "rollup-original.svg",

  // Webpack
  "webpack.config.js": "webpack-original.svg",
  "webpack.config.ts": "webpack-original.svg",
  "webpack.config.cjs": "webpack-original.svg",
  "webpack.config.mjs": "webpack-original.svg",

  // Rspack
  "rspack.config.js": "rspack-original.svg",
  "rspack.config.ts": "rspack-original.svg",
  "rspack.config.cjs": "rspack-original.svg",
  "rspack.config.mjs": "rspack-original.svg",

  "tauri.conf.json": "tauri-original.svg",
  "tauri.conf.json5": "tauri-original.svg",
  "wasm-pack.toml": "rust-original.svg",

  // Parcel
  ".parcelrc": "parcel-original.svg",

  // esbuild
  "esbuild.config.js": "esbuild-original.svg",
  "esbuild.config.ts": "esbuild-original.svg",

  // SWC
  ".swcrc": "swc-original.svg",
  ".swcrc.json": "swc-original.svg",
  ".swcrc.js": "swc-original.svg",

  // OXC / Oxlint
  "oxlint.json": "oxc-original.svg",
  ".oxlintrc.json": "oxc-original.svg",
  ".oxlintrc": "oxc-original.svg",
  ".oxlintrc.js": "oxc-original.svg",
  ".oxlintrc.cjs": "oxc-original.svg",
  ".oxlintrc.yaml": "oxc-original.svg",
  ".oxlintrc.yml": "oxc-original.svg",

  // ESLint
  "eslint.config.js": "eslint-original.svg",
  "eslint.config.ts": "eslint-original.svg",
  ".eslintrc": "eslint-original.svg",
  ".eslintrc.js": "eslint-original.svg",
  ".eslintrc.cjs": "eslint-original.svg",
  ".eslintrc.json": "eslint-original.svg",
  "eslint.config.mjs": "eslint-original.svg",
  "eslint.config.cjs": "eslint-original.svg",
  "eslint.config.mts": "eslint-original.svg",
  "eslint.config.cts": "eslint-original.svg",

  // Biome
  "biome.json": "biome-original.svg",
  "biome.jsonc": "biome-original.svg",

  // Prettier
  ".prettierrc": "prettier-original.svg",
  ".prettierrc.json": "prettier-original.svg",
  ".prettierrc.js": "prettier-original.svg",
  "prettier.config.js": "prettier-original.svg",
  ".prettierrc.yaml": "prettier-original.svg",
  ".prettierrc.yml": "prettier-original.svg",
  ".prettierrc.toml": "prettier-original.svg",
  ".prettierrc.cjs": "prettier-original.svg",
  "prettier.config.cjs": "prettier-original.svg",
  "prettier.config.mjs": "prettier-original.svg",

  // Tailwind
  "tailwind.config.js": "tailwindcss-original.svg",
  "tailwind.config.ts": "tailwindcss-original.svg",
  "tailwind.config.cjs": "tailwindcss-original.svg",
  "tailwind.config.mjs": "tailwindcss-original.svg",

  // UnoCSS
  "uno.config.ts": "unocss-original.svg",
  "uno.config.js": "unocss-original.svg",
  "uno.config.mjs": "unocss-original.svg",

  // Panda CSS
  "panda.config.ts": "panda-original.svg",
  "panda.config.js": "panda-original.svg",

  // Next.js
  "next.config.js": "nextjs-original.svg",
  "next.config.mjs": "nextjs-original.svg",
  "next.config.ts": "nextjs-original.svg",
  "next.config.cjs": "nextjs-original.svg",

  // Nuxt
  "nuxt.config.ts": "nuxtjs-original.svg",
  "nuxt.config.js": "nuxtjs-original.svg",
  "nuxt.config.mjs": "nuxtjs-original.svg",

  // Astro
  "astro.config.mjs": "astro-original.svg",
  "astro.config.ts": "astro-original.svg",
  "astro.config.js": "astro-original.svg",
  "astro.config.cjs": "astro-original.svg",

  // SvelteKit
  "svelte.config.js": "svelte-original.svg",
  "svelte.config.ts": "svelte-original.svg",

  // Remix
  "remix.config.js": "remix-original.svg",
  "remix.config.ts": "remix-original.svg",

  // Angular
  "angular.json": "angularjs-original.svg",

  // TurboRepo
  "turbo.json": "turborepo-original.svg",

  // Nx
  "nx.json": "nx-original.svg",

  // Storybook
  ".storybook": "storybook-original.svg",
  "main.ts": "storybook-original.svg",
  "preview.ts": "storybook-original.svg",

  // Playwright
  "playwright.config.ts": "playwright-original.svg",
  "playwright.config.js": "playwright-original.svg",
  "playwright.config.mjs": "playwright-original.svg",

  // Cypress
  "cypress.config.ts": "cypressio-original.svg",
  "cypress.config.js": "cypressio-original.svg",

  // Jest
  "jest.config.js": "jest-original.svg",
  "jest.config.ts": "jest-original.svg",
  "jest.config.cjs": "jest-original.svg",
  "jest.config.mjs": "jest-original.svg",

  // Prisma
  "schema.prisma": "prisma-original.svg",

  // Drizzle
  "drizzle.config.ts": "drizzle-original.svg",
  "drizzle.config.js": "drizzle-original.svg",

  // Docker
  dockerfile: "docker-original.svg",
  ".dockerignore": "docker-original.svg",
  "docker-compose.yml": "docker-original.svg",
  "docker-compose.yaml": "docker-original.svg",
  "compose.yml": "docker-original.svg",
  "compose.yaml": "docker-original.svg",

  // Kubernetes
  "kustomization.yaml": "kubernetes-original.svg",
  "chart.yaml": "helm-original.svg",
  "values.yaml": "helm-original.svg",

  // Git
  ".gitignore": "git-original.svg",
  ".gitattributes": "git-original.svg",
  ".gitmodules": "git-original.svg",

  // GitHub
  "dependabot.yml": "github-original.svg",

  // Rust
  "cargo.toml": "rust-original.svg",
  "cargo.lock": "rust-original.svg",

  // Rust ecosystem
  "rust-toolchain": "rust-original.svg",
  "rust-toolchain.toml": "rust-original.svg",
  "clippy.toml": "rust-original.svg",
  ".clippy.toml": "rust-original.svg",
  "rustfmt.toml": "rust-original.svg",
  ".rustfmt.toml": "rust-original.svg",
  "cargo-deny.toml": "rust-original.svg",
  "deny.toml": "rust-original.svg",
  "cargo-make.toml": "rust-original.svg",
  "build.rs": "rust-original.svg",

  // Go
  "go.mod": "go-original.svg",
  "go.sum": "go-original.svg",
  "go.work": "go-original.svg",
  "go.work.sum": "go-original.svg",
  ".golangci.yml": "go-original.svg",
  ".golangci.yaml": "go-original.svg",
  ".golangci.toml": "go-original.svg",
  ".goreleaser.yml": "go-original.svg",
  ".goreleaser.yaml": "go-original.svg",
  "go.work": "go-original.svg",
  "go.work.sum": "go-original.svg",
  ".golangci.yml": "go-original.svg",
  ".golangci.yaml": "go-original.svg",
  ".golangci.toml": "go-original.svg",
  ".goreleaser.yml": "go-original.svg",
  ".goreleaser.yaml": "go-original.svg",

  // Ruby
  gemfile: "ruby-original.svg",
  "gemfile.lock": "ruby-original.svg",
  Rakefile: "ruby-original.svg",
  Guardfile: "ruby-original.svg",
  ".ruby-version": "ruby-original.svg",
  ".ruby-gemset": "ruby-original.svg",
  ".rspec": "ruby-original.svg",
  "config.ru": "ruby-original.svg",
  "routes.rb": "rails-original.svg",
  "application.rb": "rails-original.svg",
  "environment.rb": "rails-original.svg",
  ".simplecov": "ruby-original.svg",

  // PHP
  "composer.json": "php-original.svg",
  "composer.lock": "php-original.svg",
  "phpunit.xml": "php-original.svg",
  "phpunit.xml.dist": "php-original.svg",
  "phpstan.neon": "php-original.svg",
  "phpstan.neon.dist": "php-original.svg",
  "psalm.xml": "php-original.svg",
  ".php-cs-fixer.php": "php-original.svg",
  "pint.json": "laravel-original.svg",

  // .NET
  "global.json": "dotnetcore-original.svg",
  "Directory.Build.props": "dotnetcore-original.svg",
  "Directory.Build.targets": "dotnetcore-original.svg",
  "Directory.Packages.props": "dotnetcore-original.svg",
  "nuget.config": "nuget-original.svg",
  "packages.lock.json": "nuget-original.svg",
  "dotnet-tools.json": "dotnetcore-original.svg",
  csx: "csharp-original.svg",
  vb: "visualbasic-original.svg",
  fsproj: "fsharp-original.svg",
  vbproj: "dotnetcore-original.svg",
  props: "dotnetcore-original.svg",
  targets: "dotnetcore-original.svg",
  csx: "csharp-original.svg",
  vb: "visualbasic-original.svg",
  fsproj: "fsharp-original.svg",
  vbproj: "dotnetcore-original.svg",
  props: "dotnetcore-original.svg",
  targets: "dotnetcore-original.svg",
  csx: "csharp-original.svg",
  vb: "visualbasic-original.svg",
  fsproj: "fsharp-original.svg",
  vbproj: "dotnetcore-original.svg",
  props: "dotnetcore-original.svg",
  targets: "dotnetcore-original.svg",

  //Elixir/Erlang
  "mix.exs": "elixir-original.svg",
  "mix.lock": "elixir-original.svg",
  "rebar.config": "erlang-original.svg",
  ".formatter.exs": "elixir-original.svg",

  // Infra
  "ansible.cfg": "ansible-original.svg",
  "playbook.yml": "ansible-original.svg",
  ".github": "github-original.svg",
  "workflow.yml": "github-original.svg",
  ".circleci": "circleci-original.svg",
  "config.yml": "circleci-original.svg",
  ".gitlab-ci.yml": "gitlab-original.svg",

  //Java
  "pom.xml": "maven-original.svg",
  ".mvn": "maven-original.svg",
  "build.gradle": "gradle-original.svg",
  "build.gradle.kts": "gradle-original.svg",
  "settings.gradle": "gradle-original.svg",
  "settings.gradle.kts": "gradle-original.svg",
  "application.properties": "spring-original.svg",
  "application.yml": "spring-original.svg",

  // Python
  "requirements.txt": "python-original.svg",
  "requirements-dev.txt": "python-original.svg",
  "pyproject.toml": "python-original.svg",
  Pipfile: "python-original.svg",
  "Pipfile.lock": "python-original.svg",
  "poetry.lock": "python-original.svg",
  "uv.lock": "python-original.svg",
  "pdm.lock": "python-original.svg",
  "setup.py": "python-original.svg",
  "setup.cfg": "python-original.svg",
  "ruff.toml": "ruff-original.svg",
  ".ruff.toml": "ruff-original.svg",
  "black.toml": "python-original.svg",
  "isort.cfg": "python-original.svg",
  ".flake8": "python-original.svg",
  "mypy.ini": "python-original.svg",
  "pyrightconfig.json": "python-original.svg",
  pylintrc: "python-original.svg",
  "pytest.ini": "pytest-original.svg",
  "tox.ini": "python-original.svg",
  "noxfile.py": "python-original.svg",
  "conftest.py": "pytest-original.svg",
  "manage.py": "django-original.svg",
  "main.py": "fastapi-original.svg",
  "jupyter_notebook_config.py": "jupyter-original.svg",

  // Misc
  "readme.md": "markdown-original.svg",
  "changelog.md": "markdown-original.svg",
  license: "license.svg",
  ".editorconfig": "editorconfig-original.svg",
};

const KEYWORDS = new Set([
  "abstract",
  "alias",
  "and",
  "as",
  "async",
  "await",
  "begin",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "def",
  "default",
  "defer",
  "do",
  "elif",
  "else",
  "elsif",
  "end",
  "enum",
  "export",
  "extends",
  "false",
  "final",
  "finally",
  "fn",
  "for",
  "from",
  "func",
  "function",
  "go",
  "if",
  "impl",
  "import",
  "in",
  "include",
  "interface",
  "is",
  "let",
  "local",
  "match",
  "module",
  "mut",
  "new",
  "nil",
  "not",
  "null",
  "or",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "self",
  "static",
  "struct",
  "super",
  "switch",
  "then",
  "this",
  "throw",
  "trait",
  "true",
  "try",
  "type",
  "use",
  "using",
  "var",
  "void",
  "when",
  "while",
  "yield",
]);

// escape HTML
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPreviewLanguage(file) {
  if (!file) return "";

  const name = file.split(/[\\/]/).pop().toLowerCase();
  // if (name === "dockerfile") return "dockerfile";
  switch (name) {
    case "dockerfile":
      return "dockerfile";

    case "makefile":
      return "makefile";

    case ".gitignore":
    case ".gitattributes":
    case ".gitmodules":
      return "plaintext";

    case ".dockerignore":
      return "dockerfile";
  }
  const ext = name.includes(".") ? name.split(".").pop() : name;
  return EXTENSION_LANGUAGE[ext] || "";
}

function syntaxSpan(className, value) {
  return `<span class="${className}">${escapeHtml(value)}</span>`;
}

function scanString(line, start) {
  const quote = line[start];
  let i = start + 1;

  while (i < line.length) {
    if (line[i] === "\\") {
      i += 2;
      continue;
    }

    if (line[i] === quote) {
      return i + 1;
    }

    i++;
  }

  return line.length;
}

function lineCommentPrefix(language, rest) {
  if (
    rest.startsWith("//") &&
    !["python", "ruby", "shell", "yaml", "toml"].includes(language)
  )
    return "//";
  if (
    rest.startsWith("#") &&
    ["python", "ruby", "shell", "yaml", "toml", "dockerfile", "nix"].includes(
      language,
    )
  )
    return "#";
  if (rest.startsWith("--") && ["lua", "sql"].includes(language)) return "--";
  if (rest.startsWith("<!--") && language === "html") return "<!--";
  return "";
}

function highlightCode(code, file) {
  const language = getPreviewLanguage(file);
  let html = "";
  let i = 0;

  while (i < code.length) {
    const rest = code.slice(i);
    const commentPrefix = lineCommentPrefix(language, rest);

    if (commentPrefix) {
      html += syntaxSpan("syntax-comment", rest);
      break;
    }

    if (rest.startsWith("/*")) {
      const end = code.indexOf("*/", i + 2);
      const next = end === -1 ? code.length : end + 2;
      html += syntaxSpan("syntax-comment", code.slice(i, next));
      i = next;
      continue;
    }

    if (code[i] === '"' || code[i] === "'" || code[i] === "`") {
      const next = scanString(code, i);
      html += syntaxSpan("syntax-string", code.slice(i, next));
      i = next;
      continue;
    }

    const numberMatch = rest.match(/^(?:0x[\da-f]+|\d+(?:\.\d+)?)/i);
    if (numberMatch) {
      html += syntaxSpan("syntax-number", numberMatch[0]);
      i += numberMatch[0].length;
      continue;
    }

    const cssColorMatch =
      language === "css" ? rest.match(/^#[\da-f]{3,8}\b/i) : null;
    if (cssColorMatch) {
      html += syntaxSpan("syntax-string", cssColorMatch[0]);
      i += cssColorMatch[0].length;
      continue;
    }

    const wordMatch = rest.match(/^[A-Za-z_$][\w$-]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      const after = code.slice(i + word.length);
      const before = code.slice(Math.max(0, i - 2), i);

      if (
        word === "true" ||
        word === "false" ||
        word === "null" ||
        word === "nil"
      ) {
        html += syntaxSpan("syntax-constant", word);
      } else if (KEYWORDS.has(word)) {
        html += syntaxSpan("syntax-keyword", word);
      } else if (/^\s*\(/.test(after)) {
        html += syntaxSpan("syntax-function", word);
      } else if (language === "css" && /^\s*:/.test(after)) {
        html += syntaxSpan("syntax-property", word);
      } else if (language === "html" && /<\/?$/.test(before)) {
        html += syntaxSpan("syntax-type", word);
      } else if (/^[A-Z]/.test(word)) {
        html += syntaxSpan("syntax-type", word);
      } else {
        html += escapeHtml(word);
      }

      i += word.length;
      continue;
    }

    html += escapeHtml(code[i]);
    i++;
  }

  return html;
}

function renderPreview(preview, file = currentPreviewFile) {
  const text = preview || "(preview empty)";
  const lines = text.split("\n");

  previewText.innerHTML = lines
    .map((line) => {
      const match = line.match(/^([> ])\s*(\d+):(.*)$/);

      if (!match) {
        return `<span class="preview-line"><span class="preview-line-content">${highlightCode(line, file)}</span></span>`;
      }

      const [, marker, lineNumber, content] = match;
      const activeClass = marker === ">" ? " active" : "";

      return `<span class="preview-line${activeClass}"><span class="preview-line-number">${escapeHtml(lineNumber)}</span><span class="preview-line-content">${highlightCode(content, file)}</span></span>`;
    })
    .join("");
}

renderPreview("(preview empty)");

function updateResultCount() {
  const current = results.length && selectedIndex >= 0 ? selectedIndex + 1 : 0;
  resultCount.textContent = `${current}/${results.length}`;
}

updateResultCount();

// search input with debounce
searchBox.addEventListener("input", () => {
  const query = searchBox.value.trim();

  if (debounceTimeout) clearTimeout(debounceTimeout);

  activeSearchId++;
  activePreviewId++;
  results = [];
  selectedIndex = -1;
  currentPreviewFile = "";
  renderPreview("(preview empty)");
  updateResultCount();
  vscode.postMessage({ type: "cancelSearch" });

  if (!query) {
    resultsList.innerHTML = "<div class='placeholder'>No results yet</div>";
    return;
  }

  resultsList.innerHTML = "<div class='placeholder'>Searching...</div>";
  debounceTimeout = setTimeout(() => {
    vscode.postMessage({ type: "search", query });
  }, DEBOUNCE_MS);
});

// keep search box focused
searchBox.focus();

//Keyboard Navigation
document.addEventListener("keydown", (e) => {
  if (!results.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    moveSelection(1);
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    moveSelection(-1);
  }
  if (e.key === "Enter") {
    e.preventDefault();
    openSelectedFile();
  }
  if (e.key === "Escape") {
    e.preventDefault();
    vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  }
});

// mouse click selection
resultsList.addEventListener("click", (e) => {
  const target = e.target.closest(".result-item");
  if (!target) return;

  const index = Number(target.dataset.index);
  if (!Number.isInteger(index) || index < 0) return;

  selectedIndex = index;
  updateSelectionUI();
  requestPreview();
  updateResultCount();
});

// receive messages from extension
window.addEventListener("message", (event) => {
  const msg = event.data;

  if (msg.type === "searchStart") {
    activeSearchId = msg.searchId;
    activePreviewId++;
    results = [];
    selectedIndex = -1;
    currentPreviewFile = "";
    resultsList.innerHTML = "<div class='placeholder'>Searching...</div>";
    renderPreview("(preview empty)");
    updateResultCount();
  }

  if (msg.type === "appendResults") {
    if (msg.searchId !== activeSearchId) return;

    const incoming = Array.isArray(msg.results) ? msg.results : [];
    if (!incoming.length) return;

    const wasEmpty = results.length === 0;
    const startIndex = results.length;
    results.push(...incoming);

    if (wasEmpty) {
      resultsList.innerHTML = "";
      selectedIndex = 0;
      currentPreviewFile = results[0].relative || results[0].file || "";
    }

    appendResults(incoming, startIndex, searchBox.value);
    updateSelectionUI();

    if (wasEmpty) {
      requestPreview();
    }

    updateResultCount();
  }

  if (msg.type === "searchDone") {
    if (msg.searchId !== activeSearchId) return;

    if (!results.length) {
      selectedIndex = -1;
      currentPreviewFile = "";
      resultsList.innerHTML = "<div class='no-results'>No results found</div>";
      renderPreview("(preview empty)");
      updateResultCount();
    }
  }

  if (msg.type === "results") {
    results = Array.isArray(msg.results) ? msg.results : [];

    if (!results.length) {
      selectedIndex = -1;
      currentPreviewFile = "";
      resultsList.innerHTML = "<div class='no-results'>No results found</div>";
      renderPreview("(preview empty)");
      updateResultCount();
    } else {
      selectedIndex = 0;
      currentPreviewFile = results[0].relative || results[0].file || "";
      renderResults(results, searchBox.value);
      requestPreview();
      updateResultCount();
    }
  }

  if (msg.type === "preview") {
    if (msg.previewId !== undefined && msg.previewId !== activePreviewId)
      return;

    renderPreview(msg.preview || "(preview empty)");
  }
});

function renderResults(items, query) {
  resultsList.innerHTML = "";
  appendResults(items, 0, query);
  scrollToSelected();
}

function appendResults(items, startIndex, query) {
  const regex = query
    ? new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "gi")
    : null;
  const fragment = document.createDocumentFragment();

  items.forEach((item, index) => {
    fragment.appendChild(renderResultItem(item, startIndex + index, regex));
  });

  resultsList.appendChild(fragment);
}

function renderResultItem(item, index, regex) {
  const el = document.createElement("div");
  el.className = "result-item";
  el.dataset.index = String(index);

  const iconPath = getFileIconPath(item.relative);
  const fileLabel = `${item.relative}:${item.line}`;
  let matchText = escapeHtml(item.text);

  if (regex) {
    matchText = matchText.replace(
      regex,
      (m) => `<span class="match">${m}</span>`,
    );
  }

  el.innerHTML = `
      <img class="file-icon" src="${iconPath}" />
      <div class="result-content">
        <div class="result-file">${escapeHtml(fileLabel)}</div>
        <div class="result-text">${matchText}</div>
      </div>
    `;

  if (index === selectedIndex) el.classList.add("selected");
  return el;
}

// get file extension

// function getFileExtension(path) {
//     const name = path.split("/").pop().toLowerCase();
//     if (name === "dockerfile") return "dockerfile";
//     const parts = name.split(".");
//     return parts.length > 1 ? parts.pop() : "";
// }

// get icon for file

// function getFileIcon(path) {
//     const ext = getFileExtension(path);
//     return FILE_ICONS[ext] || FILE_ICONS.default;
// }

//navigation
function moveSelection(delta) {
  if (!results.length) return;

  selectedIndex = (selectedIndex + delta + results.length) % results.length;
  updateSelectionUI();
  requestPreview();
  updateResultCount();
}

function updateSelectionUI() {
  const currentSelected = resultsList.querySelector(".result-item.selected");
  if (currentSelected) currentSelected.classList.remove("selected");

  const selectedEl = resultsList.querySelector(
    `.result-item[data-index="${selectedIndex}"]`,
  );
  if (selectedEl) selectedEl.classList.add("selected");
  if (selectedEl) selectedEl.scrollIntoView({ block: "nearest" });
}

function scrollToSelected() {
  const selectedEl = resultsList.querySelector(".result-item.selected");
  if (selectedEl) selectedEl.scrollIntoView({ block: "nearest" });
}

// preview
function requestPreview() {
  if (selectedIndex < 0 || selectedIndex >= results.length) {
    currentPreviewFile = "";
    activePreviewId++;
    renderPreview("(preview empty)");
    return;
  }

  const item = results[selectedIndex];
  currentPreviewFile = item.relative || item.file || "";
  const previewId = ++activePreviewId;

  vscode.postMessage({
    type: "preview",
    previewId,
    file: item.file,
    line: item.line,
  });
}

// open file
function openSelectedFile() {
  if (!results.length || selectedIndex < 0) return;

  const item = results[selectedIndex];

  vscode.postMessage({
    type: "openFile",
    file: item.file,
    line: item.line,
  });
}