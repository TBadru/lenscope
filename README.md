# Lenscope

Gaze deeply into unknown regions using the power of the moon 🔭.

## What Is Lenscope?
 
a fuzzy finder over list ([ripgrep](https://github.com/BurntSushi/ripgrep)) VS code extension inspired by [telescope.nvim](https://github.com/nvim-telescope/telescope.nvim).

## What Is ripgrep?

ripgrep is a line-oriented search tool that recursively searches the current directory for a regex pattern. By default, ripgrep will respect gitignore rules and automatically skip hidden files/directories and binary files.

### Installing ripgrep

The binary name for ripgrep is `rg`.

If you're a **macOS Homebrew** or a **Linuxbrew** user, then you can install
ripgrep from homebrew-core:

```
$ brew install ripgrep
```

If you're a **Windows Chocolatey** user, then you can install ripgrep from the
[official repo](https://chocolatey.org/packages/ripgrep):

```
$ choco install ripgrep
```

If you're a **Windows Scoop** user, then you can install ripgrep from the
[official bucket](https://github.com/ScoopInstaller/Main/blob/master/bucket/ripgrep.json):

```
$ scoop install ripgrep
```

If you're a **Windows Winget** user, then you can install ripgrep from the
[winget-pkgs](https://github.com/microsoft/winget-pkgs/tree/master/manifests/b/BurntSushi/ripgrep)
repository:

```
$ winget install BurntSushi.ripgrep.MSVC
```

## Features/Functions

Lenscope built-in features/functions

v0.0.1
| Functions             | Description                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `live_grep`   | Search for a string in your current working directory and get results live as you type, respects .gitignore. Requires ripgrep    ✅        |
| `find_files`  | Lists files in your current working directory, respects .gitignore ❌
| `current_buffer_fuzzy_find` | Live fuzzy search inside of the currently open buffer ❌


## License

MIT License