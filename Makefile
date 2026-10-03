VERSION := "2.4"
OUT_DIR := out

.PHONY: firefox chrome clean run

.SILENT: firefox chrome clean run

all: firefox chrome

geticons:
	python3 utils/geticons.py

firefox:
	cp firefox_manifest.json manifest.json
	@mkdir -p $(OUT_DIR)
	zip -rq "$(OUT_DIR)/ToolsTab-$(VERSION)-firefox.zip" \
		assets \
		extension-popup \
		index.html \
		LICENSE \
		README.md \
		manifest.json
	echo "{}" > manifest.json
	echo "|> Firefox extension packed"

chrome:
	cp chrome_manifest.json manifest.json
	zip -rq "$(OUT_DIR)/ToolsTab-$(VERSION)-chrome.zip" \
		assets \
		extension-popup \
		index.html \
		LICENSE \
		README.md \
		manifest.json
	echo "{}" > manifest.json
	echo "|> Chrome extension packed"

clean:
	rm -rf $(OUT_DIR)
	echo "|> .zip deleted"

run:
	@echo "Network access: http://$$(hostname -I | awk '{print $$1}'):8000"
	@echo ""
	python3 -m http.server --bind 0.0.0.0
