# ToolsTab

Minimal and responsive browser startpage with useful tools.

Real-time sync across all tabs using browser local storage.

Tools' status is saved in a persistent way.

## Install extension

[![Generic badge](https://img.shields.io/badge/Install-Firefox-orange.svg)](https://addons.mozilla.org/firefox/addon/toolstab/)

[![Generic badge](https://img.shields.io/badge/Install-Chrome-blue.svg)](https://chromewebstore.google.com/detail/toolstab/fejllmaclllnagjgachemaigpheidpep)

Package for manual installation available at the [release page](https://github.com/antoniopelusi/ToolsTab/releases/).

## Tools and usage

- **Day/Time**: visualize day and time
- **Todo list**: manage tasks:
  - `Alt+click` on a todo list item: edit it
    - Press `Enter` or click somewhere else to save
    - Press `Escape` to abort
    - Press `Delete` to delete the item
  - `Ctrl+click` on a todo list item: delete it
  - `▲` / `▼` arrow buttons: reorder items
- **Bookmarks**: ordered bookmark slots:
  - `Alt+click` on a bookmark: add/edit a bookmark:
    - _name_: choose a service name to automatically use the corresponding icon
    - _icon_ (optional): secondary icon name tried if _name_ does not match any icon (e.g. set name `ChatGPT` and icon `openai`)
    - _url_: the URL of the bookmark
    - Press `Enter` or click somewhere else to save
    - Press `Escape` to abort
    - Press `Delete` to delete the bookmark
  - `click` on a bookmark: open the link in this tab
  - `Ctrl+click` on a bookmark: open the link in a new tab
- **Clipboard**: 5 slots for copying and pasting texts
  - `Alt+click`: copy the slot content to the computer clipboard
  - `Ctrl+click`: empty the slot
- **Notepad**: Take notes
- **Dynamic background**: The background color changes automatically according to the day/night cycle
  - Enable/disable this feature from the extension popup menu
- **Configuration**:
	- `Ctrl+click` on the day/time tile: export the configuration to a file
  - `Alt+click` on the day/time tile: import a configuration from a file

## Screenshot

![](assets/screenshots/screenshot.png)
